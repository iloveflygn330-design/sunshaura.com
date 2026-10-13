"""
アバター改変ページ：サムネイル（PC用・スマホ用）を作るスクリプト

  avatarform/profile/ のキャラクター画像から、顔がまん中あたりに来るように切り抜いて
  一覧に並べるサムネイルを作る。
    assets/images/<アバターID>/thumbnail/mini_pc.png … PC用（横長 4:3）
    assets/images/<アバターID>/thumbnail/mini_sp.png … スマホ用（正方形 1:1）
    assets/images/<アバターID>/thumbnail/main.png    … まだ無いときだけ、元の画像をそのままコピー
                                                       （avatar_form.html の「GitHubに保存」と同じ動き）
  どの画像がどのアバターかは avatarform/avt_data.json（avatar_form.html の入力内容）で決まる。
    キー（profile の画像ファイル名） → id（アバターID）

  切り抜き方:
    1. アニメ顔の検出（.github/scripts/data/lbpcascade_animeface.xml）→ 見つかればその顔を中心にする
    2. 見つからなければ、キャラクターの範囲（透過画像なら透明でない部分、背景つきなら背景と違う色の部分）の
       上の方（頭のあたり）を中心にする
    3. 透過画像の透明な部分は、白に近いグレー（BG_COLOR）で塗る
       背景つきの画像で切り抜きが画像の外にはみ出すときは、画像のふちの色で埋める

  ★拡張予定: 切り抜きがうまくいかないアバターがあったとき
    avatarform/thumb-focus.json に、そのアバターの profile 画像ファイル名で「顔の位置」を書くと、そこを中心に切り抜く。
      {
        "1010.png": { "x": 104, "y": 120, "size": 90 }
      }
      x, y : 顔の中心（元の画像のピクセル位置。画像編集ソフトでカーソルを当てると分かる）
      size : 顔の大きさ（ピクセル）。大きくするほど引き（体まで写る）になる
    書いたら、このスクリプトをもう一度実行する（--only 1010.png で1枚だけ作り直せる）。

  ★拡張予定: 寄り具合・大きさ・背景色を変えるとき
    下の FACE_RATIO_SP / FACE_RATIO_PC / FACE_Y / MIN_SP / MIN_PC / SIZE_PC / SIZE_SP / BG_COLOR を書き換えて、--force で全部作り直す。

  実行方法（リポジトリのフォルダで）:
    pip install opencv-python-headless==4.10.0.84 pillow numpy   ← 初回だけ
    python .github/scripts/avatar-thumbs.py            … まだ無い・元の画像や設定が変わったアバターだけ作る
    python .github/scripts/avatar-thumbs.py --force    … 全部作り直す
    python .github/scripts/avatar-thumbs.py --only 1060.png 1070.png … 指定した画像だけ作り直す
    python .github/scripts/avatar-thumbs.py --sheet out.png … 確認用に全サムネイルを並べた画像を作る
  作ったあとは .github/scripts/avatar-webp.js で軽量版（WebP）も作る（GitHub 上では自動で実行される）。
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[2]
PROFILE_DIR = REPO / 'avatarform' / 'profile'
DATA_FILE = REPO / 'avatarform' / 'avt_data.json'
FOCUS_FILE = REPO / 'avatarform' / 'thumb-focus.json'
STATE_FILE = REPO / 'avatarform' / 'thumb-state.json'   # 作ったときの元画像の中身（自動で作る。手で触らない）
IMAGES_DIR = REPO / 'assets' / 'images'
CASCADE_ANIME = Path(__file__).resolve().parent / 'data' / 'lbpcascade_animeface.xml'

SIZE_PC = (480, 360)          # PC用サムネイルの大きさ（4:3。一覧の .avt-thumb-pc と同じ比率）
SIZE_SP = (360, 360)          # スマホ用サムネイルの大きさ（1:1。一覧の .avt-thumb-sp と同じ比率）
FACE_RATIO_SP = 0.30          # 顔の大きさ ÷ スマホ用の切り抜きの一辺（大きいほど顔のアップ）
FACE_RATIO_PC = 0.34          # 顔の大きさ ÷ PC用の切り抜きの高さ
FACE_Y = 0.46                 # 顔の中心を、切り抜きの上から何割の位置に置くか（0.5 = ちょうどまん中）
MIN_SP = 0.60                 # スマホ用の切り抜きの一辺は、キャラクターの高さの この割合 より小さくしない（寄りすぎ防止）
MIN_PC = 0.50                 # PC用の切り抜きの高さも同じく（頭が大きいキャラで顔だけのアップにならないように）
BG_COLOR = (238, 238, 240)    # 透過部分の色（白に近いグレー）

_anime = cv2.CascadeClassifier(str(CASCADE_ANIME))


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return default


def detect_face(rgb):
    """一番それらしい顔の (中心x, 中心y, 大きさ) を返す。見つからなければ None"""
    gray = cv2.equalizeHist(cv2.cvtColor(np.array(rgb), cv2.COLOR_RGB2GRAY))
    min_side = max(20, int(min(gray.shape) * 0.06))
    faces = _anime.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=4, minSize=(min_side, min_side))
    if not len(faces):
        return None
    # いちばん大きい顔（複数キャラの集合写真でも、だいたい手前の子になる）
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return x + w / 2, y + h / 2, max(w, h)


def border_color(arr):
    """画像のふち（上下左右の1列）の色の中央値。背景色の推定に使う"""
    edge = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    return tuple(int(v) for v in np.median(edge, axis=0))


def subject_mask(img, transparent):
    """キャラクター部分の True/False 配列"""
    if transparent:
        return np.array(img.getchannel('A')) > 16
    arr = np.array(img.convert('RGB')).astype(int)
    bg = np.array(border_color(arr))
    diff = np.abs(arr - bg).sum(axis=2)
    return diff > 60


def guess_head(mask, W, H, transparent):
    """顔が見つからないとき：キャラクター部分の上の方から、頭の位置と大きさを推定する"""
    ys, xs = np.nonzero(mask)
    if len(xs) < 50:
        return W / 2, H * 0.3, min(W, H) * 0.25
    # 小さなノイズに引っぱられないよう、上下左右の端は 1% ずつ削る
    x0, x1 = np.percentile(xs, [1, 99])
    y0, y1 = np.percentile(ys, [1, 99])
    bw, bh = x1 - x0, y1 - y0
    if transparent and ys.max() >= H - 3:
        # 透過画像で、キャラクターが画像の下端で切れている（バストアップの画像）→ 頭が大きく写っているので、上半分のまん中あたり
        head = bh * 0.35
        top = (ys >= y0) & (ys <= y0 + bh * 0.6)
        cx = float(np.median(xs[top])) if top.any() else (x0 + x1) / 2
        return cx, y0 + bh * 0.48, head
    head = max(bh * 0.16, min(bw, bh) * 0.28)        # 全身の画像：頭の大きさ ≒ 全身の 1/6 くらい
    top = (ys >= y0) & (ys <= y0 + head * 1.2)        # 頭のあたりの部分だけで左右の中心を出す
    cx = float(np.median(xs[top])) if top.any() else (x0 + x1) / 2
    return cx, y0 + head * 0.6, head


def crop(img, transparent, cx, cy, crop_w, crop_h, out_size, fill):
    """(cx, cy) が切り抜きの (まん中, 上から FACE_Y) に来るように切り抜く。
       画像の中に収まるときは、はみ出さないよう位置を少しずらす"""
    W, H = img.size
    left = cx - crop_w / 2
    top = cy - crop_h * FACE_Y
    # はみ出す分を、可能な範囲で内側へずらす（顔は多少まん中からずれるが、余白が出ない方を優先）
    if crop_w <= W:
        left = min(max(left, 0), W - crop_w)
    if crop_h <= H:
        top = min(max(top, 0), H - crop_h)
    left, top = int(round(left)), int(round(top))
    crop_w, crop_h = int(round(crop_w)), int(round(crop_h))
    canvas = Image.new('RGBA', (crop_w, crop_h), fill + (255,))
    canvas.alpha_composite(img, (max(0, -left), max(0, -top)),
                           (max(0, left), max(0, top), min(W, left + crop_w), min(H, top + crop_h)))
    return canvas.convert('RGB').resize(out_size, Image.LANCZOS)


def make_thumbs(src, focus=None):
    img = Image.open(src)
    img.load()
    transparent = img.mode in ('RGBA', 'LA', 'P') and img.convert('RGBA').getchannel('A').getextrema()[0] < 250
    img = img.convert('RGBA')
    W, H = img.size
    mask = subject_mask(img, transparent)
    if focus:
        cx, cy, face, how = focus['x'], focus['y'], focus['size'], '手動指定'
    else:
        found = detect_face(img.convert('RGB'))
        if found:
            cx, cy, face = found
            how = '顔検出'
            # 頭全体を顔として大きく拾ったときに、キャラクターより大きく切り抜かないようにする
            ys, xs = np.nonzero(mask)
            if len(xs):
                face = min(face, (xs.max() - xs.min()) * 0.6)
        else:
            cx, cy, face = guess_head(mask, W, H, transparent)
            how = '推定'
    fill = BG_COLOR if transparent else border_color(np.array(img.convert('RGB')))
    # キャラクター全体の高さ（上下 1% のノイズを除く）。切り抜きが小さくなりすぎないための基準
    ys = np.nonzero(mask)[0]
    body_h = (np.percentile(ys, 99) - np.percentile(ys, 1)) if len(ys) > 50 else H
    side = max(face / FACE_RATIO_SP, body_h * MIN_SP)
    pc_h = max(face / FACE_RATIO_PC, body_h * MIN_PC)
    pc_w = pc_h * SIZE_PC[0] / SIZE_PC[1]
    sp = crop(img, transparent, cx, cy, side, side, SIZE_SP, fill)
    pc = crop(img, transparent, cx, cy, pc_w, pc_h, SIZE_PC, fill)
    return pc, sp, how


def main():
    args = sys.argv[1:]
    force = '--force' in args
    only = []
    if '--only' in args:
        only = [a for a in args[args.index('--only') + 1:] if not a.startswith('--')]
    sheet_path = args[args.index('--sheet') + 1] if '--sheet' in args else None

    data = load_json(DATA_FILE, {})
    focus_all = load_json(FOCUS_FILE, {})
    prev_state = load_json(STATE_FILE, {})
    state = {}
    made, skipped, results = 0, 0, []
    for key, d in sorted(data.items()):
        avatar_id = (d.get('id') or '').strip()
        src = PROFILE_DIR / key
        if not avatar_id or not src.exists():
            continue                                  # profile に画像が無いもの（テスト用など）は対象外
        if only and key not in only:
            continue
        thumb_dir = IMAGES_DIR / avatar_id / 'thumbnail'
        pc_path, sp_path = thumb_dir / 'mini_pc.png', thumb_dir / 'mini_sp.png'
        # 元の画像・手動指定の位置・設定値のどれかが変わったら作り直す（GitHub 上では日時が当てにならないため中身で比べる）
        sig = hashlib.sha1(src.read_bytes() + json.dumps([focus_all.get(key), SIZE_PC, SIZE_SP, FACE_RATIO_SP,
                           FACE_RATIO_PC, FACE_Y, MIN_SP, MIN_PC, BG_COLOR]).encode()).hexdigest()[:16]
        state[f'{key}|{avatar_id}'] = sig
        if not force and not only and pc_path.exists() and sp_path.exists() and prev_state.get(f'{key}|{avatar_id}') == sig:
            skipped += 1
            results.append((key, avatar_id, None))
            continue
        thumb_dir.mkdir(parents=True, exist_ok=True)
        # avatar_form.html と同じフォルダ構成（空フォルダは .gitkeep で残す）
        for sub in ('thumbnail', 'photos', 'refs'):
            keep = IMAGES_DIR / avatar_id / sub / '.gitkeep'
            keep.parent.mkdir(parents=True, exist_ok=True)
            if not keep.exists():
                keep.write_bytes(b'')
        main_path = thumb_dir / 'main.png'
        if not main_path.exists():
            shutil.copyfile(src, main_path)
        pc, sp, how = make_thumbs(src, focus_all.get(key))
        pc.save(pc_path, optimize=True)
        sp.save(sp_path, optimize=True)
        made += 1
        results.append((key, avatar_id, how))
        print(f'{key} → {avatar_id}  [{how}]')
    if only:
        state = {**prev_state, **state}
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'作成 {made} 件 / 変更なしのためスキップ {skipped} 件')

    if sheet_path:
        # 確認用：PC用・スマホ用を並べた一覧画像
        cols, tw, th, label = 6, 240, 180, 16
        rows = (len(results) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * (tw + 120 + 8), rows * (th + label + 8)), (255, 255, 255))
        draw = ImageDraw.Draw(sheet)
        for i, (key, avatar_id, how) in enumerate(results):
            x, y = (i % cols) * (tw + 128), (i // cols) * (th + label + 8)
            d = IMAGES_DIR / avatar_id / 'thumbnail'
            sheet.paste(Image.open(d / 'mini_pc.png').resize((tw, th)), (x, y))
            sheet.paste(Image.open(d / 'mini_sp.png').resize((120, 120)), (x + tw, y))
            draw.text((x + 2, y + th + 1), f'{key[:-4]} {how or ""}', fill=(0, 0, 0))
        sheet.save(sheet_path)
        print('確認用の一覧画像:', sheet_path)


if __name__ == '__main__':
    main()

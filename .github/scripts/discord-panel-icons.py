"""
=====================================================
ページ移動アイコン（「ちょっとまってね...」「おまたせ！」の丸い画像）の取り込み
.github/workflows/gallery-discord.yml から毎朝実行される（手元で動かす必要はない）。

使い方（Discord 側）:
  チャンネル（下の CHANNEL_ID）に、1回の投稿で画像を2枚まとめて投稿する。
    1枚目 → 「ちょっとまってね...」のアイコン
    2枚目 → 「おまたせ！」のアイコン
  2枚ではない投稿（1枚、3枚以上）には、Bot がエラーの返信をして取り込まない。
  文字だけの投稿は無視する（雑談してもOK）。

やること:
  1. 前回より後の投稿を読む
  2. 画像から顔を探し、顔が丸の 3〜4割の大きさで中央に来るように丸く切り抜く
     （アニメ顔の検出 → 見つからなければ普通の顔の検出 →
       それでもなければ、背景が透明な画像はキャラクター部分の上側、そうでなければ画像の中央より少し上）
     丸の外と、元の画像の透明な部分は透明のまま（サイトの背景が透けて見える）
  3. assets/panel-icons/<投稿ID>_wait.webp / _done.webp に保存し、assets/panel-icons/sets.json に登録
  4. 元の投稿に ✅ を付け、切り抜いた結果のプレビュー画像を返信する
  5. 登録済みのセットの元の投稿に、人が ❌ を付けていたら、そのセットを外す

必要な Bot の権限（このチャンネルで）:
  View Channels / Read Message History / Add Reactions / Send Messages / Attach Files
  （Send Messages・Attach Files がないと、プレビューとエラーの返信だけ送れない。取り込み自体はできる）

★拡張予定: 切り抜きの寄り具合を変える場合は FACE_RATIO（顔の大きさ ÷ 丸の直径）を書き換える
  0.35 = 胸から上くらい、0.6 = 顔のアップ
★拡張予定: 顔が見つからなかったときの切り抜き位置は FALLBACK_* で変える
=====================================================
"""
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

CHANNEL_ID = '1558856353685045248'

FACE_RATIO = 0.35           # 顔の大きさ（幅と高さの大きい方）÷ 丸の直径
FALLBACK_CENTER_Y = 0.40    # 顔が見つからないとき：画像の高さの何割の位置を中心にするか
FALLBACK_SIZE = 0.80        # 顔が見つからないとき：丸の直径を「画像の短い辺」の何割にするか
MAX_SUBJECT_RATIO = 1.1     # 丸の直径の上限：キャラクター部分の短い辺の何倍まで（大きすぎる切り抜き防止）
FALLBACK_SUBJECT_SIZE = 1.0 # 顔が見つからない＆背景が透明なとき：丸の直径を「キャラクター部分の短い辺」の何倍にするか
OUTPUT_SIZE = 256           # 保存する丸アイコンの大きさ（px）。サイトでは 120px 前後で表示
WEBP_QUALITY = 85

ERROR_TEXT = ('⚠️ 画像は **2枚まとめて** 投稿してください。\n'
              '1枚目「ちょっとまってね...」→ 2枚目「おまたせ！」の順です。（この投稿は取り込みませんでした）')

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / 'assets' / 'panel-icons'
SETS_FILE = OUT_DIR / 'sets.json'
STATE_FILE = OUT_DIR / 'discord-state.json'
CASCADE_ANIME = Path(__file__).resolve().parent / 'data' / 'lbpcascade_animeface.xml'

API = 'https://discord.com/api/v10'
TOKEN = os.environ.get('DISCORD_BOT_TOKEN', '')
IMAGE_EXT = ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif')
CHECK, CROSS, WARN = '%E2%9C%85', '%E2%9D%8C', '%E2%9A%A0%EF%B8%8F'


class DiscordError(Exception):
    def __init__(self, status, text):
        super().__init__(f'{status} {text[:200]}')
        self.status = status


def discord(method, path, body=None, files=None):
    """Discord API を呼ぶ。files=[(ファイル名, bytes)] で画像付きの投稿"""
    for _ in range(5):
        headers = {'Authorization': 'Bot ' + TOKEN, 'User-Agent': 'DiscordBot (https://sunshaura.com, 1.0)'}
        data = None
        if files:
            boundary = 'sunshaura' + str(int(time.time() * 1000))
            parts = []
            payload = dict(body or {})
            payload['attachments'] = [{'id': i, 'filename': n} for i, (n, _) in enumerate(files)]
            parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\n'
                          'Content-Type: application/json\r\n\r\n').encode() + json.dumps(payload).encode() + b'\r\n')
            for i, (name, blob) in enumerate(files):
                parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="files[{i}]"; filename="{name}"\r\n'
                              'Content-Type: application/octet-stream\r\n\r\n').encode() + blob + b'\r\n')
            parts.append(f'--{boundary}--\r\n'.encode())
            data = b''.join(parts)
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
        elif body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                raw = res.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            text = e.read().decode('utf-8', 'replace')
            if e.code == 429:   # 回数制限：指定された時間待ってやり直す
                wait = json.loads(text or '{}').get('retry_after', 1)
                time.sleep(float(wait) + 0.25)
                continue
            raise DiscordError(e.code, text)
    raise DiscordError(429, '回数制限が続いたため中止')


def try_discord(*args, **kwargs):
    """失敗しても止めない呼び出し（リアクション・返信など。権限がない場合もある）"""
    try:
        return discord(*args, **kwargs)
    except DiscordError as e:
        print(f'  （{args[0]} {args[1]} は失敗: {e}）')
        return None


def snowflake_less(a, b):
    return int(a) < int(b)


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---------------------------------------------------------------- 画像処理
_anime = cv2.CascadeClassifier(str(CASCADE_ANIME))
_human = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')


def detect_face(rgba):
    """一番大きい顔の (中心x, 中心y, 大きさ) を返す。見つからなければ None"""
    rgb = np.array(rgba.convert('RGB'))
    gray = cv2.equalizeHist(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
    min_side = max(24, int(min(gray.shape) * 0.06))
    for name, cascade in (('アニメ顔', _anime), ('顔', _human)):
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_side, min_side))
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            return (x + w / 2, y + h / 2, max(w, h)), name
    return None, None


def subject_box(rgba):
    """背景が透明な画像なら、透明でない部分（キャラクター）の範囲 (x0, y0, x1, y1) を返す。透明でなければ None"""
    alpha = np.array(rgba.getchannel('A'))
    solid = alpha > 16
    if solid.mean() > 0.95:          # ほぼ全面が不透明 → 背景つきの画像
        return None
    ys, xs = np.nonzero(solid)
    if len(xs) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def make_circle(blob):
    """画像の bytes → (丸く切り抜いた RGBA 画像, 顔が見つかったか)"""
    img = Image.open(io.BytesIO(blob))
    img.seek(0)
    img = img.convert('RGBA')
    W, H = img.size
    face, kind = detect_face(img)
    subject = subject_box(img)
    if face:
        cx, cy, size = face
        diameter = size / FACE_RATIO
    elif subject:
        # 顔が見つからず、背景が透明な画像：キャラクターの部分（透明でないところ）の上の方を丸に収める
        #   丸の直径 = キャラクターの幅と高さの短い方 × FALLBACK_SUBJECT_SIZE、頭がある上側を中心にする
        x0, y0, x1, y1 = subject
        diameter = min(x1 - x0, y1 - y0) * FALLBACK_SUBJECT_SIZE
        cx, cy = (x0 + x1) / 2, y0 + diameter / 2
        kind = None
    else:
        cx, cy = W / 2, H * FALLBACK_CENTER_Y
        diameter = min(W, H) * FALLBACK_SIZE
    # 顔の検出が頭全体などを「顔」として大きく拾ったときに、キャラクターが小さくなりすぎないよう上限を付ける
    #   上限 = キャラクター部分の短い辺 × MAX_SUBJECT_RATIO（背景が透明な画像）／画像の短い辺（それ以外）
    cap = min(subject[2] - subject[0], subject[3] - subject[1]) * MAX_SUBJECT_RATIO if subject else min(W, H)
    if diameter > cap:
        diameter = cap
        if subject and face:
            # 丸が小さくなった分、顔が丸の上の方に寄りすぎないよう中心をキャラクター側へ寄せる
            cy = max(cy, subject[1] + diameter / 2)
    diameter = max(32, int(diameter))
    # 切り抜きの判断材料を Actions の画面（Annotations）に出す（うまく切り抜けないときの調査用）
    if os.environ.get('GITHUB_ACTIONS'):
        a = np.array(img.getchannel('A'))
        print(f'::notice::アイコン切り抜き: 画像 {W}x{H} / 不透明な割合 {(a > 16).mean():.2f} / '
              f'顔 {kind or "なし"} {tuple(int(v) for v in face) if face else ""} / '
              f'キャラ範囲 {tuple(int(v) for v in subject) if subject else "なし"} / '
              f'中心 ({int(cx)},{int(cy)}) 直径 {diameter}')
    # 画像からはみ出す部分は透明で埋める（丸が画像の外にかかっても形が崩れないように）
    left, top = int(round(cx - diameter / 2)), int(round(cy - diameter / 2))
    square = Image.new('RGBA', (diameter, diameter), (0, 0, 0, 0))
    square.paste(img, (-left, -top))
    square = square.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    # 丸のマスク（4倍で描いて縮小し、ふちをなめらかにする）
    mask = Image.new('L', (OUTPUT_SIZE * 4, OUTPUT_SIZE * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, OUTPUT_SIZE * 4 - 1, OUTPUT_SIZE * 4 - 1), fill=255)
    mask = mask.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    alpha = Image.fromarray(np.minimum(np.array(square.getchannel('A')), np.array(mask)))
    square.putalpha(alpha)
    return square, kind


def preview_png(wait, done):
    """サイトのパネルの色の上に2つの丸を並べたプレビュー画像（Discord への返信用）"""
    pad, size = 24, 180
    canvas = Image.new('RGBA', (pad * 3 + size * 2, pad * 2 + size + 40), (139, 18, 40, 255))   # --color-main-dark
    draw = ImageDraw.Draw(canvas)
    # GitHub Actions には日本語フォントがないので、ラベルは英字にする
    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()
    for i, (icon, label) in enumerate(((wait, '1: WAIT'), (done, '2: DONE'))):
        x = pad + i * (size + pad)
        canvas.alpha_composite(icon.resize((size, size), Image.LANCZOS), (x, pad))
        draw.text((x + size / 2, pad + size + 20), label, fill='white', font=font, anchor='mm')
    out = io.BytesIO()
    canvas.convert('RGB').save(out, 'PNG')
    return out.getvalue()


def download(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'sunshaura-panel-icons'})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read()


# ---------------------------------------------------------------- 本体
def fetch_messages_after(after):
    out, cursor = [], after
    while True:
        page = discord('GET', f'/channels/{CHANNEL_ID}/messages?after={cursor}&limit=100')
        if not page:
            break
        page.sort(key=lambda m: int(m['id']))
        out += page
        cursor = page[-1]['id']
        if len(page) < 100:
            break
    return out


def is_image(att):
    return (att.get('content_type') or '').startswith('image/') or att['filename'].lower().endswith(IMAGE_EXT)


def import_new(sets, state):
    # 初めて読むときは、このチャンネルができたとき（チャンネルIDと同じ時刻）から読む
    after = state.get('last') or CHANNEL_ID
    messages = fetch_messages_after(after)
    print(f'新しいメッセージ {len(messages)} 件')
    added = 0
    for msg in messages:
        if msg.get('author', {}).get('bot'):
            state['last'] = msg['id']
            continue
        images = [a for a in msg.get('attachments', []) if is_image(a)]
        if not images:                      # 文字だけの投稿は無視
            state['last'] = msg['id']
            continue
        if len(images) != 2:
            print(f'  {msg["id"]}: 画像が {len(images)} 枚 → エラーを返信')
            try_discord('POST', f'/channels/{CHANNEL_ID}/messages',
                        {'content': ERROR_TEXT, 'message_reference': {'message_id': msg['id']},
                         'allowed_mentions': {'parse': []}})
            try_discord('PUT', f'/channels/{CHANNEL_ID}/messages/{msg["id"]}/reactions/{WARN}/@me')
            state['last'] = msg['id']
            continue
        try:
            icons, notes = [], []
            for att in images:
                icon, kind = make_circle(download(att['url']))
                icons.append(icon)
                notes.append(kind or '')
        except Exception as e:
            # 失敗した投稿から先は、次回もう一度読む
            print(f'  {msg["id"]}: 処理に失敗したため、ここで止めます: {e}')
            break
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        files = {}
        for key, icon in zip(('wait', 'done'), icons):
            name = f'{msg["id"]}_{key}.webp'
            icon.save(OUT_DIR / name, 'WEBP', quality=WEBP_QUALITY, method=6)
            files[key] = name
        sets[:] = [s for s in sets if s['id'] != msg['id']] + [{'id': msg['id'], **files}]
        added += 1
        state['last'] = msg['id']
        found = ' / '.join(f'{label}: ' + (f'{k}を検出' if k else '顔が見つからず、キャラクターの上側（透明な背景なら）または画像の中央より少し上で切り抜き')
                           for label, k in zip(('1枚目', '2枚目'), notes))
        print(f'  {msg["id"]}: 登録（{found}）')
        try_discord('PUT', f'/channels/{CHANNEL_ID}/messages/{msg["id"]}/reactions/{CHECK}/@me')
        try_discord('POST', f'/channels/{CHANNEL_ID}/messages',
                    {'content': '✅ ページ移動アイコンに登録しました（反映はサイトの更新後）。\n'
                                f'{found}\n'
                                'このセットを外したいときは、元の投稿に ❌ を付けてください（次回の実行で外れます）。',
                     'message_reference': {'message_id': msg['id']}, 'allowed_mentions': {'parse': []}},
                    files=[('preview.png', preview_png(icons[0], icons[1]))])
    return added


def remove_crossed(sets):
    """元の投稿に人が ❌ を付けたセットを外す"""
    removed = []
    for s in list(sets):
        try:
            users = discord('GET', f'/channels/{CHANNEL_ID}/messages/{s["id"]}/reactions/{CROSS}?limit=100')
        except DiscordError as e:
            if e.status == 404:      # 投稿が消された／❌ がない → そのまま残す
                continue
            raise
        if any(not u.get('bot') for u in users or []):
            for key in ('wait', 'done'):
                (OUT_DIR / s[key]).unlink(missing_ok=True)
            sets.remove(s)
            removed.append(s['id'])
            try_discord('POST', f'/channels/{CHANNEL_ID}/messages',
                        {'content': '🗑️ このセットをページ移動アイコンから外しました。',
                         'message_reference': {'message_id': s['id']}, 'allowed_mentions': {'parse': []}})
    return removed


def main():
    if not TOKEN:
        raise SystemExit('DISCORD_BOT_TOKEN が設定されていません')
    data = load_json(SETS_FILE, {'sets': []})
    sets = data.get('sets', [])
    state = load_json(STATE_FILE, {})
    try:
        added = import_new(sets, state)
        removed = remove_crossed(sets)
    except DiscordError as e:
        hint = ''
        if e.status in (401, 403):
            hint = '（Bot がこのチャンネルを読めません。チャンネルの権限を確認してください）'
        print(f'::error::ページ移動アイコン: Discord の読み取りに失敗 {e}{hint}')
        raise SystemExit(1)
    save_json(SETS_FILE, {
        '_note': 'ページ移動アイコンの一覧（.github/scripts/discord-panel-icons.py が自動で更新）。手で編集しないでください。',
        'sets': sets
    })
    save_json(STATE_FILE, {
        '_note': 'Discord からどこまで取り込んだかの記録（自動で更新）。手で編集しないでください。',
        'last': state.get('last', '')
    })
    print(f'追加 {added} セット / 削除 {len(removed)} セット / 登録 {len(sets)} セット')


if __name__ == '__main__':
    main()

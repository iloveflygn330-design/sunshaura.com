"""
きょうりゅうラン（dinorun）の RPG フェイズで使う「技のエフェクト」の PNG を、pixelfx から書き出すツール。
サイトには公開しない（tools/ は build-site.mjs の EXCLUDE に入っている）。

pixelfx … ドット絵のエフェクトをコードで描くライブラリ（MIT ライセンス）。https://github.com/patch-gg/pixelfx

使い方（くわしくは同じフォルダの README.md）:
  1. pixelfx をどこかに取ってくる:  git clone https://github.com/patch-gg/pixelfx
  2. このリポジトリのフォルダで:      python tools/dinorun-fx/export_fx.py <pixelfx のフォルダ>
     → minigame/dinorun/rpg/fx/<名前>.png ができ、dinorun-rpg-data.js の DR_RPG_EFFECTS に書く設定が表示される
  必要なもの: Node.js 18 以上、Python 3 と Pillow（pip install Pillow）

★拡張予定: エフェクトを足す・変えるときは、下の FX に1件足す（または書きかえる）。
  key … ゲームの中での名前（DR_RPG_EFFECTS の名前と同じにする）
  id … pixelfx のエフェクト（pixelfx のフォルダで node tools/list.mjs <言葉> で探せる。一覧は docs/CATALOG.md）
  opts … pixelfx に渡す指定（palette で色を変える、flip で左右反転 など）
  sec … 最初の何秒ぶんを使うか（長いエフェクトを短く切る。省くと全部）
  start … 何秒目から使うか（出だしがゆっくりなエフェクトの、頭を切る。省くと 0）
  actor … 人が出てくるエフェクトで、人も入れるか（ふつうは False = エフェクトだけ）
  step … 何コマおきに使うか（2 なら1コマおき = 15 コマ/秒。大きいエフェクトのファイルを小さくする）
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

# pixelfx の色の並び（暗い → 明るい）。pixelfx の src/core/color.js の PAL から写したもの
PAL = {
    'fire': ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    'gold': ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
    'heal': ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"],
    'mint': ["#062a24", "#0c4a3e", "#147a62", "#22aa86", "#4fd8b0", "#7fffd4", "#d4fff2", "#ffffff"],
}

FX = [
    {'key': 'stomp',   'id': 'impacts/hit-spark'},                                   # ふみつけ
    {'key': 'stamp',   'id': 'impacts/heavy-landing', 'sec': 1.2},                   # スタンピング（地面がへこんで砂ぼこり）
    {'key': 'slash',   'id': 'melee/sword-slash'},                                   # 居合切り
    {'key': 'slashBig', 'id': 'melee/sword-slash', 'opts': {'palette': PAL['gold'][1:], 'radius': 56}},   # 溜めの居合切り（金色で大きく）
    {'key': 'fireHit', 'id': 'impacts/blunt-hit', 'opts': {'palette': ["#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], 'warm': '#ffae35', 'dust': '#8c1d1c', 'clod': '#4a1118'}, 'sec': 0.7},   # 火の玉が当たった
    {'key': 'blueHit', 'id': 'explosions/plasma-explosion', 'sec': 1.3, 'step': 2},             # 溜めの青い火の玉が当たった
    {'key': 'spinHit', 'id': 'melee/spin-slash', 'opts': {'palette': PAL['mint'][:7]}, 'step': 2},   # スピン
    {'key': 'heal',    'id': 'holy/heal-aoe', 'opts': {'reach': 46}, 'start': 0.3, 'sec': 1.9, 'step': 2},   # 回復魔法・回復薬（足元に光の輪が広がる）
    {'key': 'guard',   'id': 'impacts/shield-block', 'step': 2},                                # 防御（半減）
    {'key': 'perfect', 'id': 'impacts/parry'},                                       # パーフェクト防御
    {'key': 'claw',    'id': 'melee/claw-swipe'},                                    # ボスの通常攻撃
    {'key': 'smash',   'id': 'impacts/crit-hit', 'step': 2},                                    # ボスの強攻撃
    {'key': 'crit',    'id': 'impacts/crit-hit', 'opts': {'palette': PAL['gold'][1:]}, 'step': 2},   # 会心の一撃
    {'key': 'breath',  'id': 'fire/fire-breath', 'sec': 0.9, 'step': 2},          # ほのおのブレス（右向きで書き出す。ゲームの中で flip で左向きにして、aim で恐竜君のほうへ回す）
    {'key': 'bolt',    'id': 'lightning/zap-hit', 'sec': 0.6},                       # 麻痺の稲妻
    {'key': 'boom',    'id': 'explosions/small-explosion', 'sec': 1.2, 'step': 2},              # ボスを倒したときの爆発
]

COLS = 8   # 書き出す PNG の、横に並べるコマの数


def main():
    if len(sys.argv) < 2:
        print('使い方: python tools/dinorun-fx/export_fx.py <pixelfx のフォルダ> [名前 ...]')
        sys.exit(1)
    pfx = os.path.abspath(sys.argv[1])
    only = set(sys.argv[2:])
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    out_dir = os.path.join(repo, 'minigame', 'dinorun', 'rpg', 'fx')
    os.makedirs(out_dir, exist_ok=True)
    tmp = tempfile.mkdtemp()
    lines = []
    try:
        for fx in FX:
            if only and fx['key'] not in only:
                continue
            cmd = ['node', os.path.join(pfx, 'tools', 'render.mjs'), fx['id'], '--sheet', '--out', os.path.join(tmp, fx['key'])]
            if not fx.get('actor'):
                cmd.append('--no-actor')
            if fx.get('opts'):
                cmd += ['--opts', json.dumps(fx['opts'])]
            subprocess.run(cmd, cwd=pfx, check=True, stdout=subprocess.DEVNULL)
            name = fx['id'].split('/')[1]
            base = os.path.join(tmp, fx['key'], fx['id'])
            sheet = Image.open(os.path.join(base, name + '.png')).convert('RGBA')
            meta = json.load(open(os.path.join(base, name + '.json'), encoding='utf-8'))
            info = meta['meta']['pixelfx']
            fps = info['fps']
            fw, fh = info['frameSize']
            px, py = info['pivot']
            frames = meta['frames']
            frames = list(frames.values()) if isinstance(frames, dict) else frames
            n = len(frames)
            if fx.get('sec'):
                n = min(n, max(1, round(fx['sec'] * fps)))
            step = fx.get('step', 1)
            use = frames[round(fx.get('start', 0) * fps):n:step]
            n, fps = len(use), fps / step
            crops = [sheet.crop((f['frame']['x'], f['frame']['y'], f['frame']['x'] + fw, f['frame']['y'] + fh)) for f in use]
            # 使うコマ全部が入る、いちばん小さい四角に切りつめる（ファイルを小さくする）
            box = None
            for c in crops:
                b = c.getbbox()
                if b:
                    box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
            if box is None:
                box = (0, 0, 1, 1)
            x0, y0 = max(0, box[0] - 1), max(0, box[1] - 1)
            x1, y1 = min(fw, box[2] + 1), min(fh, box[3] + 1)
            w, h = x1 - x0, y1 - y0
            cols = min(n, COLS)
            rows = (n + cols - 1) // cols
            out = Image.new('RGBA', (w * cols, h * rows), (0, 0, 0, 0))
            for i, c in enumerate(crops):
                out.paste(c.crop((x0, y0, x1, y1)), ((i % cols) * w, (i // cols) * h))
            path = os.path.join(out_dir, fx['key'] + '.png')
            out.save(path, optimize=True)
            ax, ay = (px - x0) / w, (py - y0) / h
            line = (f"  {fx['key']}: {{ image: 'dinorun/rpg/fx/{fx['key']}.png', frames: {n}, cols: {cols}, w: {w}, h: {h}, "
                    f"fps: {fps:g}, ax: {ax:.3f}, ay: {ay:.3f}{', loop: true' if info.get('loop') and not fx.get('sec') else ''} }},   // pixelfx {fx['id']}")
            lines.append(line)
            print(f"{fx['key']:9s} {fx['id']:30s} {n:3d}コマ {w}x{h}  {os.path.getsize(path) // 1024}KB")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print('\n--- dinorun-rpg-data.js の DR_RPG_EFFECTS に書く設定（ox・oy・life などの調整は消さずに残す） ---')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()

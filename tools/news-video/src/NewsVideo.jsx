/* =====================================================
   ニュース動画の本体（Remotion のコンポジション）
   1920×1080 / 30fps。音声（voice.mp3）と video.json のタイミングに合わせて描画する。

   画面構成:
     上：タイトルバー（番組名・日付）
     左：コーナーごとのパネル（オープニング / ニュース / 星座占い / エンディング）
     左下：字幕
     右：ずんだもん（立ち絵。素材がまだないときは仮の図形）

   ★拡張予定: コーナーの種類を増やす場合
     1. tools/news-video/build-voice.mjs はそのままでよい（type をそのまま video.json に出す）
     2. 下の PANELS に「type名: 描画する関数」を1行追加し、関数を作る
     3. news/GUIDE.md「8. 動画の台本」の sections の type 一覧に追記する
   ===================================================== */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const FPS = 30;

/* -----------------------------------------------------
   ★拡張予定: 配色・文字サイズ
     季節の配色は news/assets/news.css の [data-season] と同じ値。
     ニュースページの配色を変えたら、ここも合わせる。
----------------------------------------------------- */
const SEASONS = {
  spring: { bg: '#FFF0F3', sub: '#FFE1E8', accent: '#CC2244', band: '#FFE08A', bandText: '#5A3A00' },
  summer: { bg: '#EEF8FB', sub: '#D9F0F6', accent: '#0F7FA0', band: '#BDEBF2', bandText: '#0B4A5C' },
  autumn: { bg: '#FBF3EA', sub: '#F5E3CF', accent: '#B5531C', band: '#F6D28B', bandText: '#5C2E0B' },
  winter: { bg: '#F1F4FA', sub: '#E1E8F4', accent: '#3A5A9A', band: '#D6E2F5', bandText: '#1E3463' }
};
const SEASON_BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];
const MAIN = '#CC2244';
const TEXT = '#2A0A10';
const FONT = "'M PLUS Rounded 1c', 'Helvetica Neue', Arial, sans-serif";

/* カテゴリ色（news/assets/news.js の NEWS_CATEGORIES と同じ） */
const CAT_COLORS = {
  'VRChat公式': '#1F8FD6', 'イベント': '#E8590C', 'アバター・制作': '#C2255C', 'ワールド': '#2B9348',
  'VR機器・技術': '#6741D9', 'AI': '#0CA678', 'その他': '#FF9500'
};

/* ---------- ヘルパー ---------- */
const sec = (frame) => frame / FPS;
function useEnter(startSec, delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round((startSec + delay) * fps), fps, config: { damping: 200 }, durationInFrames: 18 });
}
function Enter({ start, delay = 0, from = 30, children, style }) {
  const p = useEnter(start, delay);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * from}px)`, ...style }}>{children}</div>
  );
}

/* =====================================================
   コーナー別パネル
   ===================================================== */
function OpeningPanel({ section, article, theme }) {
  const [, m, d] = article.date.split('-').map(Number);
  return (
    <div style={{ padding: '56px 64px' }}>
      <Enter start={section.start}>
        <div style={{ fontSize: 40, fontWeight: 800, color: theme.accent, letterSpacing: 4 }}>TODAY'S VR NEWS</div>
        <div style={{ fontSize: 88, fontWeight: 800, marginTop: 8 }}>{m}月{d}日のVRニュース</div>
      </Enter>
      <div style={{ marginTop: 40 }}>
        {article.items.map((it, i) => (
          <Enter key={i} start={section.start} delay={0.6 + i * 0.35}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18 }}>
              <span style={{ ...numBadge, background: CAT_COLORS[it.category] || CAT_COLORS['その他'] }}>{i + 1}</span>
              <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.35 }}>{it.headline}</span>
            </div>
          </Enter>
        ))}
      </div>
    </div>
  );
}

function NewsPanel({ section, article, theme }) {
  const frame = useCurrentFrame();
  const item = article.items[section.item] || {};
  const color = CAT_COLORS[item.category] || CAT_COLORS['その他'];
  const points = item.points || [];
  // ポイントは、コーナーの長さに合わせて順番に表示
  const span = section.end - section.start;
  const shown = points.filter((_, i) => sec(frame) >= section.start + 1.2 + (span * 0.75 * i) / Math.max(1, points.length));

  // 「出典」の行とポイントの文章が重なるときだけ、出典を消す（実際の表示位置を測って判定）
  // ★拡張予定: 消さずに薄く残したい場合は、下の SOURCE_OPACITY_OVERLAP を 0.15 などにする
  const SOURCE_OPACITY_OVERLAP = 0;
  const pointsRef = useRef(null);
  const sourceRef = useRef(null);
  const [overlap, setOverlap] = useState(false);
  useLayoutEffect(() => {
    if (!pointsRef.current || !sourceRef.current) return;
    const textBottom = pointsRef.current.getBoundingClientRect().bottom;
    const sourceTop = sourceRef.current.getBoundingClientRect().top;
    const next = textBottom > sourceTop - 4;
    if (next !== overlap) setOverlap(next);
  });
  return (
    <div>
      <div style={{ background: color, color: '#fff', fontSize: 34, fontWeight: 800, padding: '14px 64px', letterSpacing: 3, display: 'flex', justifyContent: 'space-between' }}>
        <span>NEWS {section.item + 1} / {article.items.length}</span>
        <span>{item.category}</span>
      </div>
      <div style={{ padding: '40px 64px' }}>
        <Enter start={section.start}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.35 }}>{item.headline}</div>
        </Enter>
        <div ref={pointsRef} style={{ marginTop: 34 }}>
          {shown.map((p, i) => (
            <Enter key={i} start={section.start + 1.2 + (span * 0.75 * i) / Math.max(1, points.length)} from={0} style={{ transform: 'none' }}>
              <div style={{ display: 'flex', gap: 18, fontSize: 38, fontWeight: 700, lineHeight: 1.45, marginTop: 14 }}>
                <span style={{ color: theme.accent }}>✔</span><span>{p}</span>
              </div>
            </Enter>
          ))}
        </div>
        {item.sources && item.sources[0] && (
          <div ref={sourceRef} style={{
            position: 'absolute', left: 64, bottom: 30, fontSize: 26, color: 'rgba(0,0,0,0.45)', fontWeight: 700,
            opacity: overlap ? SOURCE_OPACITY_OVERLAP : 1, transition: 'opacity 0.3s'
          }}>
            出典：{item.sources.map((s) => s.name).join(' / ')}
          </div>
        )}
      </div>
    </div>
  );
}

function FortunePanel({ section, theme }) {
  const ranking = (section.ranking || []).slice().sort((a, b) => a.rank - b.rank);
  const medal = { 1: '#E0A800', 2: '#9AA5B1', 3: '#C0773A', 12: '#5B7DB1' };
  return (
    <div style={{ padding: '44px 56px' }}>
      <Enter start={section.start}>
        <div style={{ fontSize: 60, fontWeight: 800 }}>
          <span style={{ color: theme.accent }}>★</span> 今日の星座占い
        </div>
      </Enter>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 18px', marginTop: 28 }}>
        {ranking.map((r, i) => {
          const hot = medal[r.rank];
          return (
            <Enter key={r.rank} start={section.start} delay={0.4 + i * 0.08} from={16}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14,
                background: hot ? hot : 'rgba(0,0,0,0.04)', color: hot ? '#fff' : TEXT
              }}>
                <span style={{ fontSize: 30, fontWeight: 800, width: 64 }}>{r.rank}位</span>
                <span style={{ fontSize: 30, fontWeight: 800 }}>{r.sign}</span>
              </div>
            </Enter>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 56, bottom: 26, fontSize: 24, color: 'rgba(0,0,0,0.45)', fontWeight: 700 }}>
        ※占いはエンタメです。ずんだもんが考えました。
      </div>
    </div>
  );
}

function EndingPanel({ section, credits, theme }) {
  const rows = [
    ['音声', credits.voice],
    ...(credits.extra || []).map((c) => [c.label, c.text]),
    ...(credits.chara ? [['立ち絵', credits.chara]] : []), // 旧形式の video.json 用
    ...credits.bgm.map((b) => ['BGM', [b.title, b.artist, b.site].filter(Boolean).join(' / ')])
  ];
  return (
    <div style={{ padding: '64px 64px' }}>
      <Enter start={section.start}>
        <div style={{ fontSize: 84, fontWeight: 800 }}>また明日なのだ！</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 18, color: 'rgba(0,0,0,0.55)' }}>sunshaura.com/news で毎日更新</div>
      </Enter>
      <Enter start={section.start} delay={0.6}>
        <div style={{ marginTop: 36, borderTop: `4px solid ${theme.sub}`, paddingTop: 20 }}>
          {rows.map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 24, fontSize: 30, fontWeight: 700, marginTop: 8 }}>
              <span style={{ color: theme.accent, width: 190, flexShrink: 0 }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
      </Enter>
    </div>
  );
}

const PANELS = { opening: OpeningPanel, news: NewsPanel, fortune: FortunePanel, ending: EndingPanel };

/* =====================================================
   キャラクター（立ち絵）
   video.json の cast[キャラ].chara があれば画像、なければ仮の図形を表示する。
     side       : 'right'（ずんだもん）/ 'left'（ゲスト・占いのイタコ）
     dim        : 相手が話しているときは少し暗くする
     enterAt    : この時刻に画面の外から入ってくる（左のキャラが入れ替わるとき）
   ===================================================== */
function Character({ side, info, mouthOpen, face, base, sectionStart, dim, enterAt, blinkOffset }) {
  const frame = useCurrentFrame();
  // まばたき：約3.3秒ごとに4フレーム目を閉じる（キャラごとにタイミングをずらす）
  const eyeClosed = (frame + blinkOffset) % 100 >= 96;
  // コーナー（ニュース）が切り替わったときだけ、ぴょんと2回はねる。それ以外は静止
  // ★拡張予定: はねる高さ・回数・長さは HOP_* で調整する
  const HOP_HEIGHT = 26, HOP_COUNT = 2, HOP_SEC = 0.7;
  const since = frame / FPS - sectionStart;
  // sin² を使うと、動き出し・着地・はね終わりの速さが0になり、カクッとしない
  const u = since / HOP_SEC;
  const bob = since >= 0 && since < HOP_SEC
    ? -Math.pow(Math.sin(u * Math.PI * HOP_COUNT), 2) * HOP_HEIGHT * (1 - u * 0.6)
    : 0;
  // 入れ替わりで登場するときは、画面の外からすっと入る
  const enter = enterAt == null ? 1 : spring({ frame: frame - Math.round(enterAt * FPS), fps: FPS, config: { damping: 200 }, durationInFrames: 16 });
  const slide = (1 - enter) * (side === 'left' ? -560 : 560);

  const chara = info && info.chara;
  /*
   * 立ち絵の位置と大きさ
   *   元画像の横幅1082pxを画面上640pxで表示するのを基準（scale 1）に、キャラごとの display で調整する。
   *   ground（元画像で足元にあたる高さ）が、画面の GROUND_Y の位置にそろう（足元は画面の下にはみ出す）。
   * ★拡張予定: 全員の大きさ・立ち位置をまとめて変える場合は GROUND_Y / BASE_SCALE / CENTER_X を、
   *   1人だけ変える場合は tools/news-video/characters.json の display を変更する
   */
  const GROUND_Y = 1270, BASE_SCALE = 640 / 1082, CENTER_X = { left: 200, right: 1720 };
  const disp = (info && info.display) || {};
  let box;
  if (chara && chara.w && chara.h) {
    const sc = BASE_SCALE * (disp.scale || 1);
    const w = chara.w * sc, h = chara.h * sc;
    const ground = disp.ground != null ? disp.ground : chara.h;
    box = { left: CENTER_X[side] + (disp.dx || 0) - w / 2, top: GROUND_Y - ground * sc, width: w, height: h };
  } else {
    box = { [side]: -110, bottom: -230, width: 640, height: 980 }; // 旧形式・仮の立ち絵
  }
  const style = {
    position: 'absolute', ...box,
    transform: `translate(${slide}px, ${bob}px)`,
    filter: dim ? 'brightness(0.86)' : 'none', transition: 'filter 0.2s'
  };

  if (chara && chara.faces.length) {
    // その表情の立ち絵がないキャラは、近い表情 → ふつう の順で代わりを使う
    // ★拡張予定: 表情を増やしたら FACE_FALLBACK に代わりの表情を追記する
    const FACE_FALLBACK = { amazement: ['nihilistic', 'look'], nihilistic: ['amazement', 'look'], anger: ['amazement', 'nihilistic'], think: ['look'], point: ['smile'], eat: ['smile'] };
    const f = [face, ...(FACE_FALLBACK[face] || []), 'normal'].find((x) => chara.faces.includes(x)) || 'normal';
    const states = ['eyeopen_mouthclose', 'eyeopen_mouthopen', 'eyeclose_mouthclose', 'eyeclose_mouthopen'];
    const now = `${eyeClosed ? 'eyeclose' : 'eyeopen'}_${mouthOpen ? 'mouthopen' : 'mouthclose'}`;
    // 左に立つキャラは左右反転して、右のずんだもんの方を向かせる
    // ★拡張予定: 反転させたくないキャラは characters.json の display に "flip": false を書く
    const flip = side === 'left' && disp.flip !== false;
    return (
      <div style={style}>
        <div style={{ position: 'absolute', inset: 0, transform: flip ? 'scaleX(-1)' : 'none' }}>
          {states.map((s) => (
            // 4枚とも読み込んでおき、表示だけ切り替える（ちらつき防止）
            <img key={s} src={`${base}${chara.path}${f}_${s}.${chara.ext || 'png'}`} alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', opacity: s === now ? 1 : 0 }} />
          ))}
        </div>
      </div>
    );
  }

  // ---- 仮の立ち絵（素材がそろうまでの代わり。キャラの色と名前だけ表示） ----
  const color = (info && info.color) || '#B88A97';
  const eyeH = eyeClosed ? 4 : face === 'surprise' ? 40 : 30;
  return (
    <div style={style}>
      <svg viewBox="0 0 640 980" width="640" height="980">
        <rect x="140" y="470" width="360" height="520" rx="150" fill={color} opacity="0.35" />
        <circle cx="320" cy="300" r="190" fill="#fff" stroke={color} strokeWidth="12" />
        <g fill={TEXT}><rect x="245" y={290 - eyeH / 2} width="28" height={eyeH} rx="12" /><rect x="367" y={290 - eyeH / 2} width="28" height={eyeH} rx="12" /></g>
        {mouthOpen
          ? <ellipse cx="320" cy="365" rx="34" ry="22" fill="#7A2236" />
          : <line x1="292" y1="368" x2="348" y2="368" stroke="#7A2236" strokeWidth="10" strokeLinecap="round" />}
        <text x="320" y="610" textAnchor="middle" fontSize="44" fontWeight="800" fill={color} fontFamily={FONT}>{info ? info.name : ''}</text>
        <text x="320" y="665" textAnchor="middle" fontSize="30" fontWeight="700" fill={color} fontFamily={FONT}>立ち絵準備中</text>
      </svg>
    </div>
  );
}

/* =====================================================
   全体
   ===================================================== */
// 旧形式（1人だけ）の video.json を新形式にそろえる
function normalize(video) {
  if (video.cast) return video;
  return {
    ...video,
    cast: { zundamon: { name: 'ずんだもん', color: '#4E9A2E', chara: video.chara || null } },
    mouth: { zundamon: video.mouth || [] },
    lines: video.lines.map((l) => ({ ...l, who: 'zundamon' })),
    sections: video.sections.map((s) => ({ ...s, left: null }))
  };
}

export function NewsVideo({ video: rawVideo, article, base, audioSrc }) {
  const video = normalize(rawVideo);
  const frame = useCurrentFrame();
  const t = sec(frame);
  const month = parseInt(video.date.slice(5, 7), 10);
  const theme = SEASONS[SEASON_BY_MONTH[month - 1]];

  const section = video.sections.find((s) => t >= s.start && t < s.end) || video.sections[video.sections.length - 1];
  const sectionIndex = video.sections.indexOf(section);
  const Panel = PANELS[section.type] || OpeningPanel;

  // 字幕：次のセリフが始まるまで、直前のセリフを表示し続ける（間でちらつかないように）
  let line = null;
  for (let i = 0; i < video.lines.length; i++) {
    const l = video.lines[i];
    const next = video.lines[i + 1];
    if (t >= l.start - 0.05 && (!next || t < next.start - 0.05) && t < l.end + 1.2) { line = l; break; }
  }
  const speaker = line ? line.who : null;
  const isOpen = (who) => (video.mouth[who] || []).some(([a, b]) => t >= a && t < b);
  const [, m, d] = video.date.split('-').map(Number);

  // 左に立つキャラ（ゲスト／占いのイタコ）。前のコーナーと違うキャラなら、画面の外から入ってくる
  const leftKey = section.left;
  const prevLeft = sectionIndex > 0 ? video.sections[sectionIndex - 1].left : leftKey;
  const leftEnterAt = sectionIndex > 0 && prevLeft !== leftKey ? section.start : null;

  const speakerInfo = speaker ? video.cast[speaker] : null;
  const subColor = speakerInfo ? speakerInfo.color : theme.accent;

  // コーナーが切り替わるときにパネルがふわっと出る
  const panelIn = spring({ frame: frame - Math.round(section.start * FPS), fps: FPS, config: { damping: 200 }, durationInFrames: 14 });

  return (
    <AbsoluteFill style={{
      fontFamily: FONT, color: TEXT, background: theme.bg,
      backgroundImage: `radial-gradient(${theme.sub} 6px, transparent 6px)`, backgroundSize: '60px 60px'
    }}>
      <Audio src={audioSrc} />

      {/* タイトルバー */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 110, background: MAIN, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', boxShadow: '0 6px 20px rgba(0,0,0,0.18)', zIndex: 2 }}>
        <div style={{ color: '#fff', fontSize: 46, fontWeight: 800, letterSpacing: 4 }}>sunshaura VRニュース</div>
        <div style={{ background: 'rgba(255,255,255,0.92)', color: MAIN, borderRadius: 40, padding: '8px 34px', fontSize: 38, fontWeight: 800 }}>
          {video.date.slice(0, 4)}.{String(m).padStart(2, '0')}.{String(d).padStart(2, '0')}
        </div>
      </div>

      {/* コーナーのパネル（中央） */}
      <div style={{
        position: 'absolute', left: 360, top: 140, width: 1200, height: 650, background: '#fff', borderRadius: 32,
        overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        opacity: panelIn, transform: `scale(${interpolate(panelIn, [0, 1], [0.97, 1])})`
      }}>
        <Panel section={section} article={article} theme={theme} credits={video.credits} />
      </div>

      {/* 左：ゲスト（占いではイタコ） */}
      {leftKey && video.cast[leftKey] && (
        <Character key={leftKey} side="left" info={video.cast[leftKey]} base={base}
          mouthOpen={isOpen(leftKey)} face={speaker === leftKey ? line.face : 'normal'}
          sectionStart={section.start} dim={!!speaker && speaker !== leftKey}
          enterAt={leftEnterAt} blinkOffset={37} />
      )}

      {/* 右：ずんだもん */}
      <Character side="right" info={video.cast.zundamon} base={base}
        mouthOpen={isOpen('zundamon')} face={speaker === 'zundamon' ? line.face : 'normal'}
        sectionStart={section.start} dim={!!speaker && speaker !== 'zundamon' && !!leftKey}
        enterAt={null} blinkOffset={0} />

      {/* 字幕（話しているキャラの名前と色つき） */}
      {line && (
        <div style={{
          position: 'absolute', left: 360, top: 820, width: 1200, height: 200, borderRadius: 28,
          background: 'rgba(255,255,255,0.96)', border: `6px solid ${subColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 48px'
        }}>
          {speakerInfo && (
            <div style={{
              position: 'absolute', top: -30, left: 36, background: subColor, color: '#fff',
              fontSize: 30, fontWeight: 800, borderRadius: 30, padding: '6px 26px', letterSpacing: 2
            }}>{speakerInfo.name}</div>
          )}
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.4, textAlign: 'center' }}>{line.text}</div>
        </div>
      )}

      {/* クレジット（VOICEVOXの利用規約により常時表示） */}
      <div style={{ position: 'absolute', right: 30, bottom: 14, fontSize: 22, fontWeight: 700, color: 'rgba(0,0,0,0.5)', background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '2px 12px' }}>
        {video.credits.voice}
        {/* キャラクターのクレジット（credit.txt の「キャラクター：」の行）も常時表示 */}
        {(video.credits.extra || []).filter((c) => c.label === 'キャラクター').map((c) => ' ' + c.text).join('')}
      </div>
    </AbsoluteFill>
  );
}

const numBadge = {
  width: 60, height: 60, borderRadius: 30, color: '#fff', fontSize: 34, fontWeight: 800,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
};

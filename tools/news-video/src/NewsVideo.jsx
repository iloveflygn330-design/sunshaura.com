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
import React from 'react';
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
        <div style={{ marginTop: 34 }}>
          {shown.map((p, i) => (
            <Enter key={i} start={section.start + 1.2 + (span * 0.75 * i) / Math.max(1, points.length)} from={0} style={{ transform: 'none' }}>
              <div style={{ display: 'flex', gap: 18, fontSize: 38, fontWeight: 700, lineHeight: 1.45, marginTop: 14 }}>
                <span style={{ color: theme.accent }}>✔</span><span>{p}</span>
              </div>
            </Enter>
          ))}
        </div>
        {item.sources && item.sources[0] && (
          <div style={{ position: 'absolute', left: 64, bottom: 30, fontSize: 26, color: 'rgba(0,0,0,0.45)', fontWeight: 700 }}>
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
   ずんだもん（立ち絵）
   video.json の chara があれば PNG、なければ仮の図形を表示する。
   ===================================================== */
function Character({ talking, mouthOpen, face, chara, base }) {
  const frame = useCurrentFrame();
  // まばたき：約3.3秒ごとに4フレーム目を閉じる
  const eyeClosed = frame % 100 >= 96;
  // 話しているときは少し上下に揺れる
  const bob = talking ? Math.sin(frame / 4) * 4 : Math.sin(frame / 30) * 2;
  // ★拡張予定: 立ち絵の大きさ・位置はここで調整する（bottom をマイナスにすると足元が画面の外に出て、大きく映る）
  const style = chara && chara.faces.length
    ? { position: 'absolute', right: -10, bottom: -240, width: 760, height: 1160, transform: `translateY(${bob}px)` }
    : { position: 'absolute', right: 40, bottom: 0, width: 600, height: 960, transform: `translateY(${bob}px)` };

  if (chara && chara.faces.length) {
    const f = chara.faces.includes(face) ? face : 'normal';
    const states = ['eyeopen_mouthclose', 'eyeopen_mouthopen', 'eyeclose_mouthclose', 'eyeclose_mouthopen'];
    const now = `${eyeClosed ? 'eyeclose' : 'eyeopen'}_${mouthOpen ? 'mouthopen' : 'mouthclose'}`;
    return (
      <div style={style}>
        {states.map((s) => (
          // 4枚とも読み込んでおき、表示だけ切り替える（ちらつき防止）
          <img key={s} src={`${base}${chara.path}${f}_${s}.${chara.ext || 'png'}`} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', opacity: s === now ? 1 : 0 }} />
        ))}
      </div>
    );
  }

  // ---- 仮の立ち絵（素材がそろうまでの代わり） ----
  const eyeH = eyeClosed ? 4 : face === 'surprise' ? 40 : 30;
  const mouth = mouthOpen
    ? <ellipse cx="300" cy="380" rx={face === 'surprise' ? 34 : 40} ry={face === 'surprise' ? 34 : 24} fill="#7A2236" />
    : face === 'smile'
      ? <path d="M255 372 Q300 410 345 372" stroke="#7A2236" strokeWidth="10" fill="none" strokeLinecap="round" />
      : <line x1="268" y1="380" x2="332" y2="380" stroke="#7A2236" strokeWidth="10" strokeLinecap="round" />;
  return (
    <div style={style}>
      <svg viewBox="0 0 600 960" width="600" height="960">
        <rect x="110" y="520" width="380" height="460" rx="150" fill="#E9C9D2" />
        <circle cx="300" cy="320" r="210" fill="#F6E3E8" stroke="#E9C9D2" strokeWidth="10" />
        {face === 'smile' && !eyeClosed
          ? <g stroke={TEXT} strokeWidth="10" fill="none" strokeLinecap="round"><path d="M210 300 Q235 270 260 300" /><path d="M340 300 Q365 270 390 300" /></g>
          : <g fill={TEXT}><rect x="220" y={300 - eyeH / 2} width="30" height={eyeH} rx="12" /><rect x="350" y={300 - eyeH / 2} width="30" height={eyeH} rx="12" /></g>}
        {mouth}
        <text x="300" y="760" textAnchor="middle" fontSize="44" fontWeight="800" fill="#B88A97" fontFamily={FONT}>立ち絵（仮）</text>
      </svg>
    </div>
  );
}

/* =====================================================
   全体
   ===================================================== */
export function NewsVideo({ video, article, base, audioSrc }) {
  const frame = useCurrentFrame();
  const t = sec(frame);
  const month = parseInt(video.date.slice(5, 7), 10);
  const theme = SEASONS[SEASON_BY_MONTH[month - 1]];

  const section = video.sections.find((s) => t >= s.start && t < s.end) || video.sections[video.sections.length - 1];
  const Panel = PANELS[section.type] || OpeningPanel;

  // 字幕：次のセリフが始まるまで、直前のセリフを表示し続ける（間でちらつかないように）
  let line = null;
  for (let i = 0; i < video.lines.length; i++) {
    const l = video.lines[i];
    const next = video.lines[i + 1];
    if (t >= l.start - 0.05 && (!next || t < next.start - 0.05) && t < l.end + 1.2) { line = l; break; }
  }
  const talking = !!line && t >= line.start && t <= line.end;
  const mouthOpen = video.mouth.some(([a, b]) => t >= a && t < b);
  const [, m, d] = video.date.split('-').map(Number);

  // コーナーが切り替わるときにパネルがふわっと出る
  const panelIn = spring({ frame: frame - Math.round(section.start * FPS), fps: FPS, config: { damping: 200 }, durationInFrames: 14 });

  return (
    <AbsoluteFill style={{
      fontFamily: FONT, color: TEXT, background: theme.bg,
      backgroundImage: `radial-gradient(${theme.sub} 6px, transparent 6px)`, backgroundSize: '60px 60px'
    }}>
      <Audio src={audioSrc} />

      {/* タイトルバー */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 110, background: MAIN, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 60px', boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}>
        <div style={{ color: '#fff', fontSize: 46, fontWeight: 800, letterSpacing: 4 }}>sunshaura VRニュース</div>
        <div style={{ background: 'rgba(255,255,255,0.92)', color: MAIN, borderRadius: 40, padding: '8px 34px', fontSize: 38, fontWeight: 800 }}>
          {video.date.slice(0, 4)}.{String(m).padStart(2, '0')}.{String(d).padStart(2, '0')}
        </div>
      </div>

      {/* コーナーのパネル */}
      <div style={{
        position: 'absolute', left: 70, top: 150, width: 1210, height: 650, background: '#fff', borderRadius: 32,
        overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        opacity: panelIn, transform: `scale(${interpolate(panelIn, [0, 1], [0.97, 1])})`
      }}>
        <Panel section={section} article={article} theme={theme} credits={video.credits} />
      </div>

      {/* ずんだもん */}
      <Character talking={talking} mouthOpen={mouthOpen} face={line ? line.face : 'normal'} chara={video.chara} base={base} />

      {/* 字幕 */}
      {line && (
        <div style={{
          position: 'absolute', left: 70, top: 830, width: 1210, height: 200, borderRadius: 28,
          background: 'rgba(255,255,255,0.95)', border: `6px solid ${theme.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 48px'
        }}>
          <div style={{ fontSize: 54, fontWeight: 800, lineHeight: 1.4, textAlign: 'center' }}>{line.text}</div>
        </div>
      )}

      {/* クレジット（VOICEVOXの利用規約により常時表示） */}
      <div style={{ position: 'absolute', right: 30, bottom: 14, fontSize: 24, fontWeight: 700, color: 'rgba(0,0,0,0.5)', background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '2px 12px' }}>
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

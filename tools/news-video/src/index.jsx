/* =====================================================
   記事ページに動画プレイヤーを埋め込む入口
   ビルドすると news/assets/video/news-video.js になり、
   news/assets/news.js が記事ページで読み込んで呼び出す:

     SunNewsVideo.mount(要素, { videoUrl, article, base })
       videoUrl : video.json のURL（記事フォルダの ./video.json）
       article  : article.json の中身（見出し・ポイントの表示に使う）
       base     : news/ フォルダへの相対パス（立ち絵の画像パスの基準）
   ===================================================== */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { NewsVideo, FPS } from './NewsVideo.jsx';

/* 再生前に表示する待機画面
   ★拡張予定: 待機画面のデザインを変える場合はここを編集する */
function Poster({ video, article }) {
  const [, m, d] = video.date.split('-').map(Number);
  const min = Math.floor(video.duration / 60), sec = Math.round(video.duration % 60);
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '7%',
      background: 'linear-gradient(135deg, #CC2244, #8B1228)', color: '#fff', cursor: 'pointer',
      fontFamily: "'M PLUS Rounded 1c', sans-serif", textAlign: 'center', paddingLeft: '6%', paddingRight: '6%'
    }}>
      <div style={{ fontSize: 'clamp(11px, 2vw, 16px)', fontWeight: 800, letterSpacing: '0.2em', opacity: 0.8 }}>sunshaura VRニュース</div>
      <div style={{ fontSize: 'clamp(17px, 4.4vw, 40px)', fontWeight: 800, marginTop: '0.3em' }}>{m}月{d}日のVRニュース</div>
      <div style={{ fontSize: 'clamp(11px, 2.2vw, 18px)', fontWeight: 700, opacity: 0.9, marginBottom: '0.4em' }}>ニュース{article.items.length}本 + 星座占い（{min}分{String(sec).padStart(2, '0')}秒）</div>
      <div style={{
        width: 'clamp(36px, 8vw, 72px)', height: 'clamp(36px, 8vw, 72px)', borderRadius: '50%', background: 'rgba(255,255,255,0.95)',
        color: '#CC2244', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(15px, 3.6vw, 30px)', margin: '0.2em 0 0.4em'
      }}>▶</div>
    </div>
  );
}

async function mount(el, { videoUrl, article, base }) {
  const res = await fetch(videoUrl, { cache: 'no-cache' });
  if (!res.ok) throw new Error('video.json がありません');
  const video = await res.json();
  const audioSrc = new URL(video.audio, new URL(videoUrl, location.href)).href;

  const ref = React.createRef();
  el.sunPlayer = ref; // 確認・デバッグ用（el.sunPlayer.current.seekTo(フレーム) で任意の場面へ）
  createRoot(el).render(
    <Player
      ref={ref}
      component={NewsVideo}
      inputProps={{ video, article, base, audioSrc }}
      durationInFrames={Math.ceil(video.duration * FPS)}
      fps={FPS}
      compositionWidth={1920}
      compositionHeight={1080}
      style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden' }}
      controls
      clickToPlay
      doubleClickToFullscreen
      allowFullscreen
      showVolumeControls
      acknowledgeRemotionLicense
      showPosterWhenUnplayed
      showPosterWhenPaused={false}
      renderPoster={() => <Poster video={video} article={article} />}
    />
  );
  return video;
}

window.SunNewsVideo = { mount };

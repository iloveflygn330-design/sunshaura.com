/* =====================================================
   MP4書き出し用の入口（Remotion のルート）
   記事ページのプレイヤーと同じ NewsVideo をそのまま使う。
   render.mjs から inputProps（video / article / base / audioSrc）を渡して書き出す。
   ===================================================== */
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { NewsVideo, FPS } from './NewsVideo.jsx';

// フォント（M PLUS Rounded 1c）は、書き出すサーバーにインストールして使う
// （news-voice.yml の「フォントを用意」の手順。Web フォントの読み込みだと日本語の文字が欠けるため）

function Root() {
  return (
    <Composition
      id="NewsVideo"
      component={NewsVideo}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={FPS}
      // 動画の長さは video.json の duration から決める
      calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(props.video.duration * FPS) })}
      defaultProps={{}}
    />
  );
}

registerRoot(Root);

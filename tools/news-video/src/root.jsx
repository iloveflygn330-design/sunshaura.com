/* =====================================================
   MP4書き出し用の入口（Remotion のルート）
   記事ページのプレイヤーと同じ NewsVideo をそのまま使う。
   render.mjs から inputProps（video / article / base / audioSrc）を渡して書き出す。
   ===================================================== */
import React from 'react';
import { Composition, registerRoot, getInputProps } from 'remotion';
import { loadFont } from '@remotion/google-fonts/MPLUSRounded1c';
import { NewsVideo, FPS } from './NewsVideo.jsx';

// サイトと同じフォント（M PLUS Rounded 1c）を読み込む
// （ネットにつながらない環境で試すときは inputProps に skipFont: true を渡す）
if (!getInputProps().skipFont) {
  loadFont('normal', { weights: ['400', '700', '800'], subsets: ['japanese', 'latin'] });
}

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

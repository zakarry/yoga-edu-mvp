import { useState } from 'react';
import './SuryaIntroduction.css';

interface Props {
  signedIn: boolean;
  accountAvailable: boolean;
  onOpenAccount: () => void;
  onOpenTeacher: () => void;
  onOpenRecords: () => void;
}

export function SuryaIntroduction({ signedIn, accountAvailable, onOpenAccount, onOpenTeacher, onOpenRecords }: Props) {
  const [showVideo, setShowVideo] = useState(true);
  const [accountNotice, setAccountNotice] = useState(false);
  const openAccountFeature = (action: () => void) => {
    if (!accountAvailable) { setAccountNotice(true); return; }
    action();
  };

  const openPractice = () => {
    // Unmount the external player before the existing practice audio can start.
    setShowVideo(false);
    document.getElementById('surya-practice')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('surya-practice-title')?.focus({ preventScroll: true });
  };

  return (
    <section className="panel surya-introduction" aria-labelledby="surya-introduction-title">
      <h2 id="surya-introduction-title">太陽礼拝（スーリヤ・ナマスカーラ）を学ぶ</h2>
      <p>まずは全日本ヨガ連盟の公式動画で動きの流れを確認し、12ステップの練習へ進みましょう。</p>
      <h3>公式動画で流れを確認</h3>
      <p>ヨガ検定３級実技試験対策講座「スーリヤ・ナマスカーラ（太陽礼拝）」</p>
      {showVideo ? (
        <iframe
          className="surya-official-video"
          src="https://www.youtube.com/embed/mRZ6bczpAgA"
          title="全日本ヨガ連盟公式：スーリヤ・ナマスカーラ（太陽礼拝）"
          width="560"
          height="315"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button type="button" className="secondary-button" onClick={() => setShowVideo(true)}>公式動画をもう一度表示</button>
      )}
      <p className="surya-video-credit">
        出典：<a href="https://www.youtube.com/channel/UCcvHqyHj_66436TV2jITkfA" target="_blank" rel="noopener noreferrer">公式チャンネル全日本ヨガ連盟</a>（3分42秒）。動画の著作権は全日本ヨガ連盟および各権利者に帰属します。
      </p>
      <p><a href="https://www.youtube.com/watch?v=mRZ6bczpAgA" target="_blank" rel="noopener noreferrer">YouTubeで動画を見る（再生できない場合はこちら）</a></p>
      <div className="surya-next-steps">
        <h3>動画を見たら、練習へ</h3>
        <p>下の練習では、12ステップを自分のペースで確認できます。</p>
        <button type="button" className="primary-button" onClick={openPractice}>12ステップの練習へ進む</button>
        <p>練習記録の確認やAI先生の利用は、Yoga AI会員としてお進みください。下の練習だけでは会員の練習記録に自動保存されません。</p>
        {!signedIn && (
          <>
            <div className="surya-account-actions">
              <button type="button" className="primary-button" onClick={() => openAccountFeature(onOpenAccount)}>無料会員登録・ログイン</button>
            </div>
            <p>Google・LINEの既存ログインが使えます。登録済みの方は、同じアカウントでログインしてください。</p>
          </>
        )}
        <div className="surya-account-actions">
          <button type="button" className="secondary-button" onClick={() => openAccountFeature(onOpenTeacher)}>AI先生を使う</button>
          <button type="button" className="secondary-button" onClick={() => openAccountFeature(onOpenRecords)}>練習記録を見る</button>
        </div>
        {accountNotice && <p role="status">現在、会員機能に接続できません。紹介・動画・12ステップ練習は引き続きご利用いただけます。</p>}
      </div>
    </section>
  );
}

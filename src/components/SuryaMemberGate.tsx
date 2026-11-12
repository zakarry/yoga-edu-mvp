import type { ReactNode } from 'react';

interface Props {
  signedIn: boolean;
  consentVerified: boolean;
  accountAvailable: boolean;
  onOpenAccount: () => void;
  children: ReactNode;
}

export function SuryaMemberGate({ signedIn, consentVerified, accountAvailable, onOpenAccount, children }: Props) {
  if (signedIn && consentVerified) return <>{children}</>;

  return (
    <section className="panel surya-introduction" aria-labelledby="surya-member-title">
      <h2 id="surya-member-title">無料会員登録して、太陽礼拝を始めましょう</h2>
      <p>公式動画の視聴と12ステップの練習には、Yoga AIの無料会員登録・ログインが必要です。</p>
      {signedIn ? (
        <p role="status">利用規約・プライバシーポリシーへの同意を完了すると、動画と練習をご利用いただけます。</p>
      ) : accountAvailable ? (
        <>
          <button type="button" className="primary-button" onClick={onOpenAccount}>無料会員登録して始める</button>
          <p>Google・LINEで登録できます。すでに会員の方は、同じ入口からログインしてください。</p>
          <button type="button" className="secondary-button" onClick={onOpenAccount}>登録済みの方はこちらからログイン</button>
        </>
      ) : (
        <p role="status">現在、会員機能に接続できません。時間をおいて、もう一度お試しください。</p>
      )}
    </section>
  );
}

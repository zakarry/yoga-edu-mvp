import { PageHeader } from './PageHeader';

interface DictionaryGateProps {
  title: string;
  onSignUp: () => void;
  onBack: () => void;
}

export function DictionaryGate({ title, onSignUp, onBack }: DictionaryGateProps) {
  return (
    <div className="page-shell dict-login-gate">
      <PageHeader eyebrow={title} title={title} subtitle="全日本ヨガ連盟 Yoga AI会員向けコンテンツ" onBackHome={onBack} />
      <section className="panel dict-login-gate-panel">
        <p className="dict-login-gate-msg">
          {title}は全日本ヨガ連盟 Yoga AI会員向けコンテンツです。<br />
          無料会員登録するとご覧いただけます。
        </p>
        <div className="dict-login-gate-actions">
          <button className="primary-button" onClick={onSignUp}>無料会員になる</button>
          <button className="ghost-button" onClick={onBack}>TOPへ戻る</button>
        </div>
      </section>
    </div>
  );
}

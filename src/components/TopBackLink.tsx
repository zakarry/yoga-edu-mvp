interface TopBackLinkProps {
  onBackHome: () => void;
}

export function TopBackLink({ onBackHome }: TopBackLinkProps) {
  return (
    <button type="button" className="top-return-link" onClick={onBackHome}>
      ← TOPへ戻る
    </button>
  );
}

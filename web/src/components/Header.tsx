export function Header({ title, sub, onBack, action }: {
  title: string;
  sub?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="screen-header">
      {onBack && <button className="back-btn" onClick={onBack}>‹</button>}
      <div className="header-info">
        <div className="header-title">{title}</div>
        {sub != null && <div className="header-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

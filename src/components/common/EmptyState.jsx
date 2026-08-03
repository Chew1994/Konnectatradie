import { AlertTriangle } from "lucide-react";

export default function EmptyState({
  title,
  text,
  actionText,
  onAction,
  icon: Icon = AlertTriangle,
  tone = "default"
}) {
  return (
    <div className={`empty-state premium-empty-state empty-state-${tone}`} role="status">
      <div className="empty-state-icon" aria-hidden="true"><Icon size={24}/></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {actionText && onAction && (
        <button type="button" className="primary small-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

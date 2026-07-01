export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={26} strokeWidth={1.6} />
        </div>
      )}
      <p className="empty-title">{title}</p>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function DueStamp({ dueDate, returned }) {
  const overdue = !returned && new Date(dueDate) < new Date();
  return (
    <div className={`due-stamp ${overdue ? 'overdue' : 'ok'}`}>
      <span className="stamp-label">{returned ? 'Returned' : overdue ? 'Overdue' : 'Due'}</span>
      <span className="stamp-date">{formatDate(dueDate)}</span>
    </div>
  );
}

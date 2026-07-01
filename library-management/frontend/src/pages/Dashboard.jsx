import { useEffect, useState } from 'react';
import { Library, BookCheck, AlertTriangle, Receipt, BellRing, TrendingUp, Clock } from 'lucide-react';
import { api } from '../api';
import Toast from '../components/Toast.jsx';
import { SkeletonStatCard, SkeletonTable } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  async function handleSendReminders() {
    setSending(true);
    try {
      const res = await api.sendReminders();
      notify(`Sent ${res.dueSoonCount} due-soon and ${res.overdueCount} overdue reminders (${res.emailMode})`);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setSending(false);
    }
  }

  if (error) return <div className="card">{error}</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Front desk</p>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">A snapshot of the collection right now.</p>
        </div>
        <button className="btn btn-outline" onClick={handleSendReminders} disabled={sending || !stats}>
          <BellRing size={14} strokeWidth={2} />
          {sending ? 'Sending…' : 'Send reminder emails'}
        </button>
      </div>

      {!stats ? (
        <>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="grid grid-2">
            <div className="card"><SkeletonTable /></div>
            <div className="card"><SkeletonTable /></div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            <div className="card stat-card">
              <div className="stat-card-top">
                <p className="stat-label">Titles / Copies</p>
                <div className="stat-icon"><Library size={16} strokeWidth={2} /></div>
              </div>
              <p className="stat-value">{stats.totalTitles} / {stats.totalBooks}</p>
            </div>
            <div className="card stat-card">
              <div className="stat-card-top">
                <p className="stat-label">Books issued</p>
                <div className="stat-icon"><BookCheck size={16} strokeWidth={2} /></div>
              </div>
              <p className="stat-value">{stats.booksIssued}</p>
            </div>
            <div className="card stat-card">
              <div className="stat-card-top">
                <p className="stat-label">Overdue</p>
                <div className={`stat-icon ${stats.overdueCount > 0 ? 'danger' : ''}`}><AlertTriangle size={16} strokeWidth={2} /></div>
              </div>
              <p className={`stat-value ${stats.overdueCount > 0 ? 'danger' : ''}`}>{stats.overdueCount}</p>
            </div>
            <div className="card stat-card">
              <div className="stat-card-top">
                <p className="stat-label">Outstanding fines</p>
                <div className={`stat-icon ${stats.totalOutstandingFines > 0 ? 'danger' : ''}`}><Receipt size={16} strokeWidth={2} /></div>
              </div>
              <p className={`stat-value ${stats.totalOutstandingFines > 0 ? 'danger' : ''}`}>₹{stats.totalOutstandingFines}</p>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={17} strokeWidth={2} color="var(--color-accent)" /> Most borrowed
              </p>
              {stats.mostBorrowed.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No loans yet" message="Issue a book to start tracking trends." />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Title</th><th>Author</th><th>Times borrowed</th></tr></thead>
                    <tbody>
                      {stats.mostBorrowed.map((b, i) => (
                        <tr key={i}><td>{b.title}</td><td className="text-muted">{b.author}</td><td>{b.times_borrowed}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={17} strokeWidth={2} color="var(--color-accent)" /> Recent activity
              </p>
              {stats.recentActivity.length === 0 ? (
                <EmptyState icon={Clock} title="Nothing yet" message="Issue a book to get started." />
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Book</th><th>Member</th><th>Status</th></tr></thead>
                    <tbody>
                      {stats.recentActivity.map((a) => (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td className="text-muted">{a.member_name}</td>
                          <td><span className={`badge ${a.status === 'issued' ? 'badge-amber' : 'badge-green'}`}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BookMarked, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

export default function Reservations() {
  const { isAdmin } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      setReservations(await api.getReservations());
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(r) {
    try {
      await api.cancelReservation(r.id);
      notify('Reservation cancelled');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  const statusBadge = (s) => {
    if (s === 'pending') return <span className="badge badge-amber">Pending</span>;
    if (s === 'fulfilled') return <span className="badge badge-green">Ready for pickup</span>;
    return <span className="badge badge-gray">Cancelled</span>;
  };

  return (
    <div>
      <div className="page-header">
        <p className="page-eyebrow">Waitlist</p>
        <h1 className="page-title">{isAdmin ? 'Reservations' : 'My Reservations'}</h1>
        <p className="page-subtitle">Members are notified in order once a copy is returned.</p>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={4} />
        ) : reservations.length === 0 ? (
          <EmptyState icon={BookMarked} title="No reservations" message="Reserve a book that's fully checked out from the catalog." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  {isAdmin && <th>Member</th>}
                  <th>Reserved</th>
                  <th>Queue position</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.title}</strong> <span className="text-muted">by {r.author}</span></td>
                    {isAdmin && <td className="text-muted">{r.member_name} <span className="mono">({r.member_code})</span></td>}
                    <td className="text-muted">{new Date(r.reserved_date).toLocaleDateString('en-IN')}</td>
                    <td>{r.status === 'pending' ? `#${r.queue_position}` : '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{r.status === 'pending' && <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(r)}><X size={13} strokeWidth={2} /> Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BookMarked, RotateCw } from 'lucide-react';
import { api } from '../api';
import DueStamp from '../components/DueStamp.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

export default function MyLoans() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function load() {
    setLoading(true);
    api.getBorrowRecords().then(setRecords).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRenew(record) {
    try {
      const res = await api.renewLoan(record.id);
      notify(`Renewed — new due date ${new Date(res.due_date).toLocaleDateString('en-IN')}`);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <p className="page-eyebrow">Your card</p>
        <h1 className="page-title">My Loans</h1>
        <p className="page-subtitle">Books you've borrowed, past and present.</p>
      </div>

      {loading ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 18 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : records.length === 0 ? (
        <div className="card"><EmptyState icon={BookMarked} title="No loans yet" message="Ask the librarian to issue you a book from the catalog." /></div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {records.map((r) => (
            <div className="card card-row" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DueStamp dueDate={r.due_date} returned={r.status === 'returned'} />
              <div style={{ flex: 1 }}>
                <strong>{r.title}</strong> <span className="text-muted">by {r.author}</span>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  Issued {new Date(r.borrow_date).toLocaleDateString('en-IN')}
                  {r.status === 'returned' && ` · Returned ${new Date(r.return_date).toLocaleDateString('en-IN')}`}
                  {r.renewal_count > 0 && ` · renewed ${r.renewal_count}x`}
                </div>
                {r.fine_amount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-red">Fine ₹{r.fine_amount}{r.fine_paid ? ' · paid' : ' · unpaid'}</span>
                  </div>
                )}
              </div>
              {r.status === 'issued' && (
                <button className="btn btn-outline btn-sm" onClick={() => handleRenew(r)}><RotateCw size={13} strokeWidth={2} /> Renew</button>
              )}
            </div>
          ))}
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}


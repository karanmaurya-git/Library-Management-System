import { useEffect, useState } from 'react';
import { Download, CheckCircle2, PartyPopper, Receipt } from 'lucide-react';
import { api } from '../api';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonTable, SkeletonStatCard } from '../components/Skeleton.jsx';

export default function Fines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      setFines(await api.getFines());
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handlePay(m) {
    try {
      await api.payFine(m.id);
      notify(`Cleared ₹${m.fines_balance} fine for ${m.name}`);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleExport() {
    try {
      await api.downloadCSV('/fines/export/csv', 'outstanding-fines.csv');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  const total = fines.reduce((sum, f) => sum + f.fines_balance, 0);

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Ledger</p>
          <h1 className="page-title">Fines</h1>
          <p className="page-subtitle">Members with unpaid overdue fines. ₹50+ blocks new loans.</p>
        </div>
        <button className="btn btn-outline" onClick={handleExport}><Download size={14} strokeWidth={2} /> Export CSV</button>
      </div>

      {loading ? (
        <div style={{ marginBottom: 20, maxWidth: 260 }}><SkeletonStatCard /></div>
      ) : (
        <div className="card stat-card" style={{ marginBottom: 20, maxWidth: 260 }}>
          <div className="stat-card-top">
            <p className="stat-label">Total outstanding</p>
            <div className={`stat-icon ${total > 0 ? 'danger' : ''}`}><Receipt size={16} strokeWidth={2} /></div>
          </div>
          <p className={`stat-value ${total > 0 ? 'danger' : ''}`}>₹{total}</p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <SkeletonTable rows={4} />
        ) : fines.length === 0 ? (
          <EmptyState icon={PartyPopper} title="All clear" message="No members currently have unpaid fines." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Member</th><th>Member code</th><th>Email</th><th>Balance</th><th></th></tr></thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.name}</strong></td>
                    <td className="mono">{f.member_code}</td>
                    <td className="text-muted">{f.email}</td>
                    <td><span className="badge badge-red">₹{f.fines_balance}</span></td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => handlePay(f)}><CheckCircle2 size={13} strokeWidth={2} /> Mark as paid</button></td>
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

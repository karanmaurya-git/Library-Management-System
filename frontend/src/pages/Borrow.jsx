import { useEffect, useState } from 'react';
import { Download, PlusCircle, ArrowLeftRight, RotateCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import DueStamp from '../components/DueStamp.jsx';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

export default function Borrow() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('issued');
  const [modalOpen, setModalOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookId, setBookId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : filter === 'overdue' ? { overdue: 'true' } : { status: filter };
      setRecords(await api.getBorrowRecords(params));
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line

  async function openIssueModal() {
    try {
      const [b, m] = await Promise.all([api.getBooks(), api.getMembers()]);
      setBooks(b.filter((x) => x.available_copies > 0));
      setMembers(m);
      setBookId('');
      setMemberId('');
      setModalOpen(true);
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleIssue(e) {
    e.preventDefault();
    try {
      await api.issueBook(Number(bookId), Number(memberId));
      notify('Book issued — due in 14 days');
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleReturn(record) {
    try {
      const res = await api.returnBook(record.id);
      notify(res.fine_amount > 0 ? `Returned — fine of ₹${res.fine_amount} added` : 'Returned — no fine');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleRenew(record) {
    try {
      const res = await api.renewLoan(record.id);
      notify(`Renewed — new due date ${new Date(res.due_date).toLocaleDateString('en-IN')}`);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleDelete(record) {
    const warning = record.status === 'issued'
      ? `Delete this record for "${record.title}"? The book copy will be marked available again.`
      : `Delete this record for "${record.title}"? This can't be undone.`;
    if (!confirm(warning)) return;
    try {
      await api.deleteBorrowRecord(record.id);
      notify('Record deleted');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleExport() {
    try {
      await api.downloadCSV('/borrow/export/csv', 'borrow-records.csv');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Circulation desk</p>
          <h1 className="page-title">Issue &amp; Return</h1>
          <p className="page-subtitle">Loan period is 14 days · ₹5/day fine after the due date.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleExport}><Download size={14} strokeWidth={2} /> Export CSV</button>
          <button className="btn btn-accent" onClick={openIssueModal}><PlusCircle size={14} strokeWidth={2.2} /> Issue a book</button>
        </div>
      </div>

      <div className="search-row flex-between" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {['issued', 'overdue', 'returned', 'all'].map((f) => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {!loading && <span className="text-muted" style={{ fontSize: 13 }}>{records.length} record{records.length === 1 ? '' : 's'}</span>}
      </div>

      {loading ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 18 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : records.length === 0 ? (
        <div className="card"><EmptyState icon={ArrowLeftRight} title="No records here" message="Try a different filter, or issue a book to get started." /></div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {records.map((r) => (
            <div className="card card-row" key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 20, paddingRight: 44 }}>
              <button
                className="card-delete-btn"
                title="Delete this record"
                onClick={() => handleDelete(r)}
                aria-label={`Delete record for ${r.title}`}
              >
                ×
              </button>
              <DueStamp dueDate={r.due_date} returned={r.status === 'returned'} />
              <div style={{ flex: 1 }}>
                <strong>{r.title}</strong> <span className="text-muted">by {r.author}</span>
                <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {r.member_name} <span className="mono">({r.member_code})</span> · issued {new Date(r.borrow_date).toLocaleDateString('en-IN')}
                  {r.renewal_count > 0 && ` · renewed ${r.renewal_count}x`}
                </div>
                {r.fine_amount > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-red">Fine ₹{r.fine_amount}{r.fine_paid ? ' · paid' : ''}</span>
                  </div>
                )}
              </div>
              {r.status === 'issued' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleRenew(r)}><RotateCw size={13} strokeWidth={2} /> Renew</button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleReturn(r)}><CheckCircle2 size={13} strokeWidth={2} /> Mark returned</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="Issue a book" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleIssue}>
            <div className="field">
              <label>Book</label>
              <select required value={bookId} onChange={(e) => setBookId(e.target.value)}>
                <option value="">Select an available book…</option>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.available_copies} left</option>)}
              </select>
            </div>
            <div className="field">
              <label>Member</label>
              <select required value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Select a member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.member_code})</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Issue book</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

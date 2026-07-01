import { useEffect, useState } from 'react';
import { Users, Download, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const emptyForm = { member_code: '', name: '', email: '', password: '', member_type: 'student', phone: '' };

export default function Members() {
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      setMembers(await api.getMembers(q ? { q } : {}));
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q]); // eslint-disable-line

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createMember(form);
      notify('Member added');
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleDelete(m) {
    if (!confirm(`Remove member "${m.name}"?`)) return;
    try {
      await api.deleteMember(m.id);
      notify('Member removed');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleExport() {
    try {
      await api.downloadCSV('/members/export/csv', 'members.csv');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Registry</p>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">Students and faculty enrolled in the library.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={handleExport}><Download size={14} strokeWidth={2} /> Export CSV</button>
          <button className="btn btn-accent" onClick={() => setModalOpen(true)}><UserPlus size={14} strokeWidth={2.2} /> Add member</button>
        </div>
      </div>

      <div className="search-row">
        <input placeholder="Search by name, email, or member code…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No members found" message={q ? 'Try a different search.' : 'Add a member to get started.'} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Member code</th><th>Name</th><th>Type</th><th>Email</th><th>Fines</th><th></th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{m.member_code}</td>
                    <td><strong>{m.name}</strong></td>
                    <td><span className="badge badge-gray">{m.member_type}</span></td>
                    <td className="text-muted">{m.email}</td>
                    <td>{m.fines_balance > 0 ? <span className="badge badge-red">₹{m.fines_balance}</span> : <span className="text-muted">—</span>}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m)}><Trash2 size={13} strokeWidth={2} /> Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Add a new member" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate}>
            <div className="grid grid-2">
              <div className="field"><label>Member code</label><input required value={form.member_code} onChange={(e) => setForm({ ...form, member_code: e.target.value })} placeholder="STU1002" /></div>
              <div className="field"><label>Type</label>
                <select value={form.member_type} onChange={(e) => setForm({ ...form, member_type: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
            </div>
            <div className="field"><label>Full name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-2">
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>Temporary password</label><input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add member</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

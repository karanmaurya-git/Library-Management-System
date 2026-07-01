import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Info } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const emptyForm = { name: '', email: '', password: '', phone: '' };

export default function Admins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  function notify(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function load() {
    setLoading(true);
    api.getAdmins().then(setAdmins).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createAdmin(form);
      notify('Admin account created');
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleDelete(admin) {
    if (!confirm(`Remove admin access for "${admin.name}"? They'll no longer be able to sign in as a librarian.`)) return;
    try {
      await api.deleteAdmin(admin.id);
      notify('Admin removed');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Access control</p>
          <h1 className="page-title">Admins</h1>
          <p className="page-subtitle">Librarian accounts with full access to the system.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setModalOpen(true)}>
          <UserPlus size={14} strokeWidth={2.2} /> Add admin
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={17} strokeWidth={2} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p className="text-muted" style={{ fontSize: 13.5, margin: 0 }}>
          You can't remove your own account while signed in, and the system always keeps at least one admin —
          so the library can never accidentally lose all admin access.
        </p>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={3} />
        ) : admins.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No admins found" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Member code</th><th>Name</th><th>Email</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.member_code}</td>
                    <td>
                      <strong>{a.name}</strong>
                      {a.id === user.id && <span className="badge badge-green" style={{ marginLeft: 8 }}>You</span>}
                    </td>
                    <td className="text-muted">{a.email}</td>
                    <td className="text-muted">{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {a.id !== user.id && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a)}>
                          <Trash2 size={13} strokeWidth={2} /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Add a new admin" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate}>
            <div className="field"><label>Full name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-2">
              <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="field"><label>Temporary password</label><input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add admin</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { BookOpen, Download, Plus, SearchX } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Toast from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonTable } from '../components/Skeleton.jsx';

const emptyForm = { isbn: '', title: '', author: '', category: '', published_year: '', total_copies: 1 };

export default function Books() {
  const { isAdmin, user } = useAuth();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
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
      const params = {};
      if (q) params.q = q;
      if (category) params.category = category;
      const [b, c] = await Promise.all([api.getBooks(params), api.getCategories()]);
      setBooks(b);
      setCategories(c);
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q, category]); // eslint-disable-line

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }
  function openEdit(book) {
    setEditing(book);
    setForm({ ...book });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const payload = { ...form, published_year: form.published_year ? Number(form.published_year) : null, total_copies: Number(form.total_copies) };
      if (editing) {
        await api.updateBook(editing.id, payload);
        notify('Book updated');
      } else {
        await api.createBook(payload);
        notify('Book added to catalog');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleDelete(book) {
    if (!confirm(`Remove "${book.title}" from the catalog?`)) return;
    try {
      await api.deleteBook(book.id);
      notify('Book removed');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleReserve(book) {
    try {
      await api.createReservation(book.id, user.id);
      notify('Reserved — you\'ll move up the queue as copies are returned');
      load();
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  async function handleExport() {
    try {
      await api.downloadCSV('/books/export/csv', 'book-catalog.csv');
    } catch (e) {
      notify(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <p className="page-eyebrow">Card catalog</p>
          <h1 className="page-title">Books</h1>
          <p className="page-subtitle">{isAdmin ? 'Manage titles, copies, and categories.' : 'Search the collection and reserve a copy.'}</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={handleExport}><Download size={14} strokeWidth={2} /> Export CSV</button>
            <button className="btn btn-accent" onClick={openCreate}><Plus size={14} strokeWidth={2.4} /> Add book</button>
          </div>
        )}
      </div>

      <div className="search-row">
        <input placeholder="Search by title, author, or ISBN…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : books.length === 0 ? (
          <EmptyState icon={q || category ? SearchX : BookOpen} title="No books found" message={q || category ? 'Try a different search or category.' : 'The catalog is empty — add a book to get started.'} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th><th>Author</th><th>Category</th><th>ISBN</th><th>Availability</th><th></th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.title}</strong>{b.published_year ? <span className="text-muted"> ({b.published_year})</span> : null}</td>
                    <td className="text-muted">{b.author}</td>
                    <td><span className="badge badge-gray">{b.category}</span></td>
                    <td className="mono">{b.isbn}</td>
                    <td>
                      {b.available_copies > 0
                        ? <span className="badge badge-green">{b.available_copies} / {b.total_copies} available</span>
                        : <span className="badge badge-red">All {b.total_copies} out</span>}
                    </td>
                    <td>
                      {isAdmin ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(b)}>Delete</button>
                        </div>
                      ) : (
                        b.available_copies === 0 && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleReserve(b)}>Reserve</button>
                        )
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
        <Modal title={editing ? 'Edit book' : 'Add a new book'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave}>
            <div className="field"><label>Title</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label>Author</label><input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div className="grid grid-2">
              <div className="field"><label>Category</label><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="field"><label>Published year</label><input type="number" value={form.published_year || ''} onChange={(e) => setForm({ ...form, published_year: e.target.value })} /></div>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>ISBN</label><input required value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
              <div className="field"><label>Total copies</label><input required type="number" min="1" value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Add book'}</button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

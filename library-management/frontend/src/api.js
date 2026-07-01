const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('library_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/auth/me'),
  createMember: (payload) => request('/auth/members', { method: 'POST', body: JSON.stringify(payload) }),
  getAdmins: () => request('/auth/admins'),
  createAdmin: (payload) => request('/auth/admins', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAdmin: (id) => request(`/auth/admins/${id}`, { method: 'DELETE' }),

  getBooks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/books${qs ? `?${qs}` : ''}`);
  },
  getCategories: () => request('/books/categories'),
  createBook: (payload) => request('/books', { method: 'POST', body: JSON.stringify(payload) }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE' }),

  getMembers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/members${qs ? `?${qs}` : ''}`);
  },
  getMember: (id) => request(`/members/${id}`),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),

  getBorrowRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/borrow${qs ? `?${qs}` : ''}`);
  },
  issueBook: (book_id, user_id) => request('/borrow', { method: 'POST', body: JSON.stringify({ book_id, user_id }) }),
  returnBook: (id) => request(`/borrow/${id}/return`, { method: 'POST' }),
  renewLoan: (id) => request(`/borrow/${id}/renew`, { method: 'POST' }),
  deleteBorrowRecord: (id) => request(`/borrow/${id}`, { method: 'DELETE' }),

  getReservations: () => request('/reservations'),
  createReservation: (book_id, user_id) => request('/reservations', { method: 'POST', body: JSON.stringify({ book_id, user_id }) }),
  cancelReservation: (id) => request(`/reservations/${id}`, { method: 'DELETE' }),

  getFines: () => request('/fines'),
  payFine: (userId, amount) => request(`/fines/${userId}/pay`, { method: 'POST', body: JSON.stringify({ amount }) }),

  getDashboardStats: () => request('/dashboard/stats'),
  sendReminders: () => request('/dashboard/send-reminders', { method: 'POST' }),

  // CSV endpoints need the auth header, so we fetch as a blob and trigger a download manually.
  downloadCSV: async (path, filename) => {
    const token = localStorage.getItem('library_token');
    const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Failed to download CSV');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

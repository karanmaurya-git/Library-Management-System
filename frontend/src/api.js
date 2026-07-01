const BASE =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000';

async function request(path, options = {}) {
  const token = localStorage.getItem('library_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  // AUTH
  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request('/api/auth/me'),

  createMember: (payload) =>
    request('/api/auth/members', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAdmins: () => request('/api/auth/admins'),

  createAdmin: (payload) =>
    request('/api/auth/admins', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAdmin: (id) =>
    request(`/api/auth/admins/${id}`, {
      method: 'DELETE',
    }),

  // BOOKS
  getBooks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/books${qs ? `?${qs}` : ''}`);
  },

  getCategories: () => request('/api/books/categories'),

  createBook: (payload) =>
    request('/api/books', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBook: (id, payload) =>
    request(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteBook: (id) =>
    request(`/api/books/${id}`, {
      method: 'DELETE',
    }),

  // MEMBERS
  getMembers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/members${qs ? `?${qs}` : ''}`);
  },

  getMember: (id) => request(`/api/members/${id}`),

  deleteMember: (id) =>
    request(`/api/members/${id}`, {
      method: 'DELETE',
    }),

  // BORROW
  getBorrowRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/borrow${qs ? `?${qs}` : ''}`);
  },

  issueBook: (book_id, user_id) =>
    request('/api/borrow', {
      method: 'POST',
      body: JSON.stringify({ book_id, user_id }),
    }),

  returnBook: (id) =>
    request(`/api/borrow/${id}/return`, {
      method: 'POST',
    }),

  renewLoan: (id) =>
    request(`/api/borrow/${id}/renew`, {
      method: 'POST',
    }),

  deleteBorrowRecord: (id) =>
    request(`/api/borrow/${id}`, {
      method: 'DELETE',
    }),

  // RESERVATIONS
  getReservations: () => request('/api/reservations'),

  createReservation: (book_id, user_id) =>
    request('/api/reservations', {
      method: 'POST',
      body: JSON.stringify({ book_id, user_id }),
    }),

  cancelReservation: (id) =>
    request(`/api/reservations/${id}`, {
      method: 'DELETE',
    }),

  // FINES
  getFines: () => request('/api/fines'),

  payFine: (userId, amount) =>
    request(`/api/fines/${userId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // DASHBOARD
  getDashboardStats: () => request('/api/dashboard/stats'),

  sendReminders: () =>
    request('/api/dashboard/send-reminders', {
      method: 'POST',
    }),

  // CSV DOWNLOAD
  downloadCSV: async (path, filename) => {
    const token = localStorage.getItem('library_token');

    const res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
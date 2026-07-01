import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toCSV, sendCSV } from '../utils/csv.js';
import { notifyReservationReady } from '../utils/notifications.js';

const router = express.Router();
const LOAN_DAYS = 14;
const FINE_PER_DAY = 5; // currency units per day overdue
const MAX_BOOKS_PER_MEMBER = 5;
const FINE_BLOCK_THRESHOLD = 50;
const MAX_RENEWALS = 2;

// Issue a book to a member
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { book_id, user_id } = req.body;
  if (!book_id || !user_id) return res.status(400).json({ error: 'book_id and user_id are required' });

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies < 1) return res.status(400).json({ error: 'No available copies of this book' });

  const member = db.prepare('SELECT * FROM users WHERE id = ? AND role=\'member\'').get(user_id);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  if (member.fines_balance >= FINE_BLOCK_THRESHOLD) {
    return res.status(400).json({ error: `Member has unpaid fines of ${member.fines_balance}. Clear fines before issuing more books.` });
  }

  const activeCount = db.prepare("SELECT COUNT(*) c FROM borrow_records WHERE user_id=? AND status='issued'").get(user_id).c;
  if (activeCount >= MAX_BOOKS_PER_MEMBER) {
    return res.status(400).json({ error: `Member already has the maximum of ${MAX_BOOKS_PER_MEMBER} books issued` });
  }

  const already = db.prepare("SELECT * FROM borrow_records WHERE book_id=? AND user_id=? AND status='issued'").get(book_id, user_id);
  if (already) return res.status(400).json({ error: 'This member already has this book issued' });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

  const info = db.prepare(
    `INSERT INTO borrow_records (book_id, user_id, due_date) VALUES (?, ?, ?)`
  ).run(book_id, user_id, dueDate.toISOString());

  db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

  res.status(201).json(db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(info.lastInsertRowid));
});

// Return a book
router.post('/:id/return', requireAuth, requireAdmin, async (req, res) => {
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Borrow record not found' });
  if (record.status === 'returned') return res.status(400).json({ error: 'This book was already returned' });

  const now = new Date();
  const due = new Date(record.due_date);
  const overdueDays = Math.max(0, Math.ceil((now - due) / (1000 * 60 * 60 * 24)));
  const fine = overdueDays * FINE_PER_DAY;

  db.prepare(
    `UPDATE borrow_records SET status='returned', return_date=?, fine_amount=? WHERE id=?`
  ).run(now.toISOString(), fine, req.params.id);

  db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(record.book_id);

  if (fine > 0) {
    db.prepare('UPDATE users SET fines_balance = fines_balance + ? WHERE id = ?').run(fine, record.user_id);
  }

  // Fulfill the oldest pending reservation for this book, if any, and email that member
  const nextReservation = db.prepare(
    "SELECT * FROM reservations WHERE book_id=? AND status='pending' ORDER BY reserved_date ASC LIMIT 1"
  ).get(record.book_id);
  if (nextReservation) {
    db.prepare("UPDATE reservations SET status='fulfilled' WHERE id=?").run(nextReservation.id);
    notifyReservationReady(nextReservation.id).catch((e) => console.error('Failed to send reservation email:', e.message));
  }

  res.json({ ...db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id), reservation_notified: !!nextReservation });
});

// Renew a loan (extend due date) — the member who owns it, or an admin, can renew
router.post('/:id/renew', requireAuth, (req, res) => {
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Borrow record not found' });
  if (req.user.role !== 'admin' && record.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to renew this loan' });
  }
  if (record.status !== 'issued') return res.status(400).json({ error: 'Only active loans can be renewed' });
  if (record.renewal_count >= MAX_RENEWALS) {
    return res.status(400).json({ error: `This loan has already been renewed the maximum of ${MAX_RENEWALS} times` });
  }
  if (new Date(record.due_date) < new Date()) {
    return res.status(400).json({ error: 'Overdue loans cannot be renewed — please return the book first' });
  }
  const pendingReservation = db.prepare(
    "SELECT COUNT(*) c FROM reservations WHERE book_id=? AND status='pending'"
  ).get(record.book_id).c;
  if (pendingReservation > 0) {
    return res.status(400).json({ error: 'This book has a waiting reservation — it cannot be renewed' });
  }

  const newDue = new Date(record.due_date);
  newDue.setDate(newDue.getDate() + LOAN_DAYS);

  db.prepare(
    'UPDATE borrow_records SET due_date=?, renewal_count = renewal_count + 1 WHERE id=?'
  ).run(newDue.toISOString(), req.params.id);

  res.json(db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id));
});

// Export current issued/overdue loans as CSV (admin only)
router.get('/export/csv', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT br.id, b.title, b.author, b.isbn, u.name as member_name, u.member_code,
           br.borrow_date, br.due_date, br.return_date, br.status, br.fine_amount, br.fine_paid, br.renewal_count
    FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    JOIN users u ON u.id = br.user_id
    ORDER BY br.borrow_date DESC
  `).all();

  const csv = toCSV(rows, [
    { key: 'id', label: 'Record ID' },
    { key: 'title', label: 'Book Title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'member_name', label: 'Member' },
    { key: 'member_code', label: 'Member Code' },
    { key: 'borrow_date', label: 'Borrowed On' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'return_date', label: 'Returned On' },
    { key: 'status', label: 'Status' },
    { key: 'fine_amount', label: 'Fine' },
    { key: 'fine_paid', label: 'Fine Paid' },
    { key: 'renewal_count', label: 'Times Renewed' },
  ]);
  sendCSV(res, 'borrow-records.csv', csv);
});


// Delete a borrow record entirely — for correcting mistakes (e.g. wrong book/member issued).
// Safely reverses any side effects: restores the book copy if still issued, and
// reverses any unpaid fine tied to this record so balances stay accurate.
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Borrow record not found' });

  if (record.status === 'issued') {
    db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(record.book_id);
  }

  if (record.fine_amount > 0 && !record.fine_paid) {
    db.prepare('UPDATE users SET fines_balance = MAX(0, fines_balance - ?) WHERE id = ?').run(record.fine_amount, record.user_id);
  }

  db.prepare('DELETE FROM borrow_records WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/', requireAuth, (req, res) => {
  const { status, user_id, overdue } = req.query;
  let sql = `
    SELECT br.*, b.title, b.author, b.isbn, u.name as member_name, u.member_code
    FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    JOIN users u ON u.id = br.user_id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    sql += ' AND br.user_id = ?';
    params.push(req.user.id);
  } else if (user_id) {
    sql += ' AND br.user_id = ?';
    params.push(user_id);
  }

  if (status) {
    sql += ' AND br.status = ?';
    params.push(status);
  }
  if (overdue === 'true') {
    sql += " AND br.status='issued' AND br.due_date < datetime('now')";
  }

  sql += ' ORDER BY br.borrow_date DESC';
  res.json(db.prepare(sql).all(...params));
});

export default router;

import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { book_id, user_id } = req.body;
  const targetUserId = req.user.role === 'admin' && user_id ? user_id : req.user.id;

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies > 0) {
    return res.status(400).json({ error: 'This book is currently available — no need to reserve, it can be issued directly' });
  }

  const existing = db.prepare("SELECT * FROM reservations WHERE book_id=? AND user_id=? AND status='pending'").get(book_id, targetUserId);
  if (existing) return res.status(400).json({ error: 'Already reserved by this member' });

  const info = db.prepare('INSERT INTO reservations (book_id, user_id) VALUES (?, ?)').run(book_id, targetUserId);
  res.status(201).json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/', requireAuth, (req, res) => {
  let sql = `
    SELECT r.*, b.title, b.author, u.name as member_name, u.member_code
    FROM reservations r
    JOIN books b ON b.id = r.book_id
    JOIN users u ON u.id = r.user_id
    WHERE 1=1
  `;
  const params = [];
  if (req.user.role !== 'admin') {
    sql += ' AND r.user_id = ?';
    params.push(req.user.id);
  }
  sql += " ORDER BY r.status = 'pending' DESC, r.reserved_date ASC";
  const rows = db.prepare(sql).all(...params);

  // Attach queue position for pending reservations
  const withPosition = rows.map(r => {
    if (r.status !== 'pending') return { ...r, queue_position: null };
    const ahead = db.prepare(
      "SELECT COUNT(*) c FROM reservations WHERE book_id=? AND status='pending' AND reserved_date <= ?"
    ).get(r.book_id, r.reserved_date).c;
    return { ...r, queue_position: ahead };
  });

  res.json(withPosition);
});

router.delete('/:id', requireAuth, (req, res) => {
  const resv = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!resv) return res.status(404).json({ error: 'Reservation not found' });
  if (req.user.role !== 'admin' && resv.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
  }
  db.prepare("UPDATE reservations SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

export default router;

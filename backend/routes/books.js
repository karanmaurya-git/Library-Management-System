import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toCSV, sendCSV } from '../utils/csv.js';

const router = express.Router();

router.get('/export/csv', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM books ORDER BY title ASC').all();
  const csv = toCSV(rows, [
    { key: 'isbn', label: 'ISBN' },
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'category', label: 'Category' },
    { key: 'published_year', label: 'Published Year' },
    { key: 'total_copies', label: 'Total Copies' },
    { key: 'available_copies', label: 'Available Copies' },
  ]);
  sendCSV(res, 'book-catalog.csv', csv);
});

router.get('/', requireAuth, (req, res) => {
  const { q, category } = req.query;
  let sql = 'SELECT * FROM books WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY title ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/categories', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT DISTINCT category FROM books ORDER BY category').all().map(r => r.category));
});

router.get('/:id', requireAuth, (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { isbn, title, author, category, published_year, total_copies } = req.body;
  if (!isbn || !title || !author || !category || !total_copies) {
    return res.status(400).json({ error: 'isbn, title, author, category and total_copies are required' });
  }
  try {
    const info = db.prepare(
      `INSERT INTO books (isbn, title, author, category, published_year, total_copies, available_copies) VALUES (?,?,?,?,?,?,?)`
    ).run(isbn, title, author, category, published_year || null, total_copies, total_copies);
    res.status(201).json(db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: 'A book with this ISBN already exists' });
  }
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Book not found' });

  const { isbn, title, author, category, published_year, total_copies } = req.body;
  const copiesOut = existing.total_copies - existing.available_copies;
  const newTotal = total_copies ?? existing.total_copies;
  if (newTotal < copiesOut) {
    return res.status(400).json({ error: `Cannot set total copies below ${copiesOut} (currently issued)` });
  }
  const newAvailable = newTotal - copiesOut;

  db.prepare(
    `UPDATE books SET isbn=?, title=?, author=?, category=?, published_year=?, total_copies=?, available_copies=? WHERE id=?`
  ).run(
    isbn ?? existing.isbn, title ?? existing.title, author ?? existing.author,
    category ?? existing.category, published_year ?? existing.published_year,
    newTotal, newAvailable, req.params.id
  );
  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const activeLoans = db.prepare("SELECT COUNT(*) c FROM borrow_records WHERE book_id=? AND status='issued'").get(req.params.id).c;
  if (activeLoans > 0) return res.status(400).json({ error: 'Cannot delete a book with active loans' });
  db.prepare('DELETE FROM reservations WHERE book_id = ?').run(req.params.id);
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.json({ success: true });
});

export default router;

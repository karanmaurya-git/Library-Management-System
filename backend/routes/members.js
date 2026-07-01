import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toCSV, sendCSV } from '../utils/csv.js';

const router = express.Router();

router.get('/export/csv', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT member_code, name, email, member_type, phone, fines_balance, created_at FROM users WHERE role='member' ORDER BY name ASC"
  ).all();
  const csv = toCSV(rows, [
    { key: 'member_code', label: 'Member Code' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'member_type', label: 'Type' },
    { key: 'phone', label: 'Phone' },
    { key: 'fines_balance', label: 'Fines Balance' },
    { key: 'created_at', label: 'Joined' },
  ]);
  sendCSV(res, 'members.csv', csv);
});

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const { q } = req.query;
  let sql = "SELECT id, member_code, name, email, role, member_type, phone, fines_balance, created_at FROM users WHERE role='member'";
  const params = [];
  if (q) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR member_code LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY name ASC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && req.user.id != req.params.id) {
    return res.status(403).json({ error: 'Not authorized to view this member' });
  }
  const member = db.prepare('SELECT id, member_code, name, email, role, member_type, phone, fines_balance FROM users WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const history = db.prepare(`
    SELECT br.*, b.title, b.author FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    WHERE br.user_id = ? ORDER BY br.borrow_date DESC
  `).all(req.params.id);

  res.json({ ...member, history });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const activeLoans = db.prepare("SELECT COUNT(*) c FROM borrow_records WHERE user_id=? AND status='issued'").get(req.params.id).c;
  if (activeLoans > 0) return res.status(400).json({ error: 'Cannot delete a member with active loans' });
  const info = db.prepare("DELETE FROM users WHERE id = ? AND role='member'").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Member not found' });
  res.json({ success: true });
});

export default router;

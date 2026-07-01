import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toCSV, sendCSV } from '../utils/csv.js';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT id, member_code, name, email, fines_balance FROM users
    WHERE role='member' AND fines_balance > 0
    ORDER BY fines_balance DESC
  `).all();
  res.json(rows);
});

router.get('/export/csv', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT member_code, name, email, fines_balance FROM users
    WHERE role='member' AND fines_balance > 0
    ORDER BY fines_balance DESC
  `).all();
  const csv = toCSV(rows, [
    { key: 'member_code', label: 'Member Code' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'fines_balance', label: 'Outstanding Fine' },
  ]);
  sendCSV(res, 'outstanding-fines.csv', csv);
});

router.post('/:userId/pay', requireAuth, requireAdmin, (req, res) => {
  const { amount } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id=? AND role='member'").get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Member not found' });

  const payAmount = amount ? Math.min(amount, user.fines_balance) : user.fines_balance;
  db.prepare('UPDATE users SET fines_balance = fines_balance - ? WHERE id = ?').run(payAmount, req.params.userId);

  res.json(db.prepare('SELECT id, member_code, name, fines_balance FROM users WHERE id=?').get(req.params.userId));
});

export default router;

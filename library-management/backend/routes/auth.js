import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { SECRET, requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Public self-registration for members (students/faculty) — always creates role='member'
router.post('/register', (req, res) => {
  const { name, email, password, member_type, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Auto-generate a member code: first 3 letters of member_type + timestamp tail
  const prefix = (member_type === 'faculty' ? 'FAC' : 'STU');
  const memberCode = `${prefix}${Date.now().toString().slice(-6)}`;

  try {
    const info = db.prepare(
      `INSERT INTO users (member_code, name, email, password_hash, role, member_type, phone) VALUES (?,?,?,?,?,?,?)`
    ).run(memberCode, name, email, bcrypt.hashSync(password, 8), 'member', member_type || 'student', phone || null);

    const user = db.prepare('SELECT id, member_code, name, email, role, member_type, phone, fines_balance FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (e) {
    res.status(400).json({ error: 'An account with this email already exists' });
  }
});

// Admin creates a new member account
router.post('/members', requireAuth, requireAdmin, (req, res) => {
  const { member_code, name, email, password, member_type, phone } = req.body;
  if (!member_code || !name || !email || !password) {
    return res.status(400).json({ error: 'member_code, name, email and password are required' });
  }
  try {
    const info = db.prepare(
      `INSERT INTO users (member_code, name, email, password_hash, role, member_type, phone) VALUES (?,?,?,?,?,?,?)`
    ).run(member_code, name, email, bcrypt.hashSync(password, 8), 'member', member_type || 'student', phone || null);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'member_code or email already exists' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, member_code, name, email, role, member_type, phone, fines_balance FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// --- Admin (librarian) account management — admin-only ---

// List all librarian accounts
router.get('/admins', requireAuth, requireAdmin, (req, res) => {
  const admins = db.prepare(
    "SELECT id, member_code, name, email, phone, created_at FROM users WHERE role='admin' ORDER BY created_at ASC"
  ).all();
  res.json(admins);
});

// Create a new librarian account — any existing admin can add another
router.post('/admins', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const memberCode = `ADM${Date.now().toString().slice(-6)}`;

  try {
    const info = db.prepare(
      `INSERT INTO users (member_code, name, email, password_hash, role, member_type, phone) VALUES (?,?,?,?,?,?,?)`
    ).run(memberCode, name, email, bcrypt.hashSync(password, 8), 'admin', 'faculty', phone || null);

    const admin = db.prepare('SELECT id, member_code, name, email, phone, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(admin);
  } catch (e) {
    res.status(400).json({ error: 'An account with this email already exists' });
  }
});

// Remove a librarian account — blocked from removing yourself or the last remaining admin,
// so the library can never end up with zero admin access.
router.delete('/admins/:id', requireAuth, requireAdmin, (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You can't remove your own admin account while signed in as it" });
  }

  const target = db.prepare("SELECT * FROM users WHERE id = ? AND role='admin'").get(targetId);
  if (!target) return res.status(404).json({ error: 'Admin account not found' });

  const adminCount = db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin'").get().c;
  if (adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last remaining admin account' });
  }

  db.prepare("DELETE FROM users WHERE id = ? AND role='admin'").run(targetId);
  res.json({ success: true });
});

export default router;

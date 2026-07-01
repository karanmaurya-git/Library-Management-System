import express from 'express';
import db from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendDueSoonReminders, sendOverdueNotices } from '../utils/notifications.js';
import { emailIsConfigured } from '../utils/mailer.js';

const router = express.Router();

// Manually trigger due-soon + overdue reminder emails (also runs automatically once a day)
router.post('/send-reminders', requireAuth, requireAdmin, async (req, res) => {
  const dueSoonCount = await sendDueSoonReminders();
  const overdueCount = await sendOverdueNotices();
  res.json({
    dueSoonCount,
    overdueCount,
    emailMode: emailIsConfigured ? 'smtp' : 'console (no SMTP configured — check the backend terminal log)',
  });
});

router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const totalBooks = db.prepare('SELECT COALESCE(SUM(total_copies),0) c FROM books').get().c;
  const availableBooks = db.prepare('SELECT COALESCE(SUM(available_copies),0) c FROM books').get().c;
  const totalTitles = db.prepare('SELECT COUNT(*) c FROM books').get().c;
  const totalMembers = db.prepare("SELECT COUNT(*) c FROM users WHERE role='member'").get().c;
  const booksIssued = db.prepare("SELECT COUNT(*) c FROM borrow_records WHERE status='issued'").get().c;
  const overdueCount = db.prepare("SELECT COUNT(*) c FROM borrow_records WHERE status='issued' AND due_date < datetime('now')").get().c;
  const pendingReservations = db.prepare("SELECT COUNT(*) c FROM reservations WHERE status='pending'").get().c;
  const totalOutstandingFines = db.prepare('SELECT COALESCE(SUM(fines_balance),0) c FROM users').get().c;

  const mostBorrowed = db.prepare(`
    SELECT b.title, b.author, COUNT(*) as times_borrowed
    FROM borrow_records br JOIN books b ON b.id = br.book_id
    GROUP BY br.book_id ORDER BY times_borrowed DESC LIMIT 5
  `).all();

  const recentActivity = db.prepare(`
    SELECT br.id, br.status, br.borrow_date, br.return_date, b.title, u.name as member_name
    FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    JOIN users u ON u.id = br.user_id
    ORDER BY br.borrow_date DESC LIMIT 8
  `).all();

  res.json({
    totalTitles, totalBooks, availableBooks, totalMembers,
    booksIssued, overdueCount, pendingReservations, totalOutstandingFines,
    mostBorrowed, recentActivity
  });
});

export default router;

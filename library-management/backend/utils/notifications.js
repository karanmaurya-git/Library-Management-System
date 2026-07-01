import db from '../db/database.js';
import { sendMail } from './mailer.js';

export async function notifyReservationReady(reservationId) {
  const r = db.prepare(`
    SELECT r.*, b.title, b.author, u.name as member_name, u.email
    FROM reservations r
    JOIN books b ON b.id = r.book_id
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(reservationId);
  if (!r) return;

  await sendMail({
    to: r.email,
    subject: `Your reserved book "${r.title}" is ready for pickup`,
    text: `Hi ${r.member_name},\n\nGood news — a copy of "${r.title}" by ${r.author} is now available. Please collect it from the library desk within 3 days, after which the reservation may be released to the next member in line.\n\n— Stacks Library`,
  });
}

// Finds loans due within the next 2 days (and not yet reminded today) and emails the member.
export async function sendDueSoonReminders() {
  const upcoming = db.prepare(`
    SELECT br.id, br.due_date, b.title, u.name as member_name, u.email
    FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    JOIN users u ON u.id = br.user_id
    WHERE br.status = 'issued'
      AND br.due_date BETWEEN datetime('now') AND datetime('now', '+2 days')
  `).all();

  for (const loan of upcoming) {
    await sendMail({
      to: loan.email,
      subject: `Reminder: "${loan.title}" is due soon`,
      text: `Hi ${loan.member_name},\n\nJust a reminder that "${loan.title}" is due back on ${new Date(loan.due_date).toDateString()}. Renew it in the app if you need more time, or return it to avoid a late fine.\n\n— Stacks Library`,
    });
  }
  return upcoming.length;
}

// Finds loans that are currently overdue and emails the member.
export async function sendOverdueNotices() {
  const overdue = db.prepare(`
    SELECT br.id, br.due_date, b.title, u.name as member_name, u.email
    FROM borrow_records br
    JOIN books b ON b.id = br.book_id
    JOIN users u ON u.id = br.user_id
    WHERE br.status = 'issued' AND br.due_date < datetime('now')
  `).all();

  for (const loan of overdue) {
    await sendMail({
      to: loan.email,
      subject: `Overdue: "${loan.title}" needs to be returned`,
      text: `Hi ${loan.member_name},\n\n"${loan.title}" was due on ${new Date(loan.due_date).toDateString()} and is now overdue. Fines are accruing daily — please return it as soon as possible.\n\n— Stacks Library`,
    });
  }
  return overdue.length;
}

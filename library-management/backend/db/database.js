import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqliteDb = new DatabaseSync(path.join(__dirname, 'library.db'));
sqliteDb.exec('PRAGMA journal_mode = WAL');
sqliteDb.exec('PRAGMA foreign_keys = ON');

// Thin wrapper so the rest of the app can keep using the better-sqlite3-style API:
// db.prepare(sql).run(...params) / .get(...params) / .all(...params)
const db = {
  exec: (sql) => sqliteDb.exec(sql),
  prepare: (sql) => {
    const stmt = sqliteDb.prepare(sql);
    return {
      run: (...params) => stmt.run(...params),
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
    };
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','member')) DEFAULT 'member',
  member_type TEXT CHECK(member_type IN ('student','faculty')) DEFAULT 'student',
  phone TEXT,
  fines_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  published_year INTEGER,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS borrow_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  borrow_date TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT NOT NULL,
  return_date TEXT,
  fine_amount REAL NOT NULL DEFAULT 0,
  fine_paid INTEGER NOT NULL DEFAULT 0,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','returned'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  reserved_date TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fulfilled','cancelled'))
);
`);

// Migration: add renewal_count to existing databases created before this column existed
const existingColumns = db.prepare("PRAGMA table_info(borrow_records)").all().map((c) => c.name);
if (!existingColumns.includes('renewal_count')) {
  db.exec('ALTER TABLE borrow_records ADD COLUMN renewal_count INTEGER NOT NULL DEFAULT 0');
}

// Seed admin + demo data on first run
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (userCount === 0) {
  const insertUser = db.prepare(`INSERT INTO users (member_code, name, email, password_hash, role, member_type, phone) VALUES (?,?,?,?,?,?,?)`);
  insertUser.run('ADMIN001', 'Library Admin', 'admin@library.edu', bcrypt.hashSync('admin123', 8), 'admin', 'faculty', '0000000000');
  insertUser.run('STU1001', 'Asha Verma', 'asha@student.edu', bcrypt.hashSync('member123', 8), 'member', 'student', '9990001111');
  insertUser.run('FAC2001', 'Dr. Rakesh Sinha', 'rakesh@faculty.edu', bcrypt.hashSync('member123', 8), 'member', 'faculty', '9990002222');

  const insertBook = db.prepare(`INSERT INTO books (isbn, title, author, category, published_year, total_copies, available_copies) VALUES (?,?,?,?,?,?,?)`);
  const books = [
    ['978-0132350884', 'Clean Code', 'Robert C. Martin', 'Computer Science', 2008, 3, 3],
    ['978-0262033848', 'Introduction to Algorithms', 'Cormen, Leiserson, Rivest, Stein', 'Computer Science', 2009, 2, 2],
    ['978-0141439518', 'Pride and Prejudice', 'Jane Austen', 'Literature', 1813, 2, 2],
    ['978-0451524935', '1984', 'George Orwell', 'Literature', 1949, 4, 4],
    ['978-0198853944', 'A Brief History of Time', 'Stephen Hawking', 'Science', 1988, 2, 2],
    ['978-0135957059', 'The Pragmatic Programmer', 'David Thomas, Andrew Hunt', 'Computer Science', 2019, 2, 2],
    ['978-0374533557', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', 2011, 2, 2],
    ['978-0300180929', 'The Republic', 'Plato', 'Philosophy', -380, 1, 1],
  ];
  for (const b of books) insertBook.run(...b);
}

export default db;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import memberRoutes from './routes/members.js';
import borrowRoutes from './routes/borrow.js';
import reservationRoutes from './routes/reservations.js';
import fineRoutes from './routes/fines.js';
import dashboardRoutes from './routes/dashboard.js';
import './db/database.js';
import { sendDueSoonReminders, sendOverdueNotices } from './utils/notifications.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Root route for Render
app.get('/', (req, res) => {
  res.send('📚 Library Management API is running successfully!');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Library Management API is healthy'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Library API running on http://localhost:${PORT}`);

  // Run reminder jobs on startup and every 24 hours
  const runReminderCheck = () => {
    sendDueSoonReminders().catch((e) =>
      console.error('Due-soon reminder job failed:', e.message)
    );

    sendOverdueNotices().catch((e) =>
      console.error('Overdue notice job failed:', e.message)
    );
  };

  runReminderCheck();
  setInterval(runReminderCheck, 24 * 60 * 60 * 1000);
});
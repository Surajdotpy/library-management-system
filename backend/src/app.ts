import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.ts';
import attendanceRoutes from './modules/attendance/attendance.routes.ts';
import branchRoutes from './modules/branches/branches.routes.ts';
import dashboardRoutes from './modules/dashboard/dashboard.routes.ts';
import notificationRoutes from './modules/notifications/notifications.routes.ts';
import paymentRoutes from './modules/payments/payments.routes.ts';
import seatRoutes from './modules/seats/seats.routes.ts';
import studentRoutes from './modules/students/students.routes.ts';
import userRoutes from './modules/users/users.routes.ts';
import reportsRoutes from './modules/reports/reports.routes.ts';

dotenv.config();

const app: Application = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buffer) => {
      (req as Request & { rawBody?: string }).rawBody = buffer.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Study Library Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      dashboard: '/api/dashboard/summary',
      notifications: '/api/notifications',
      branches: '/api/branches',
      admins: '/api/users/admins',
      students: '/api/students',
      attendance: '/api/attendance',
      payments: '/api/payments',
      seats: '/api/seats',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/reports', reportsRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;

import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import './config/load-env.ts';
import { corsOptions } from './config/cors.ts';
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
import { generalApiRateLimiter } from './middleware/rate-limit.middleware.ts';

const app: Application = express();
const API_BODY_LIMIT = process.env.API_BODY_LIMIT || '1mb';

app.use(helmet());
app.use(
  cors(corsOptions),
);

app.use(
  express.json({
    limit: API_BODY_LIMIT,
    verify: (req, _res, buffer) => {
      (req as Request & { rawBody?: string }).rawBody = buffer.toString('utf8');
    },
  }),
);
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

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
    message: 'Library Management API',
    version: '1.0.1',
  });
});

app.use('/api', generalApiRateLimiter);

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

import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// CORS - Allow frontend to connect
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (simple)
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Study Library Management System API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',        // ← Updated
      students: '/api/students',
      attendance: '/api/attendance',
      payments: '/api/payments'
    }
  });
});

// API routes
import studentRoutes from './modules/students/students.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';

app.use('/api/auth', authRoutes);      // ← ADDED
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
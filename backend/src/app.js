import express, {} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import branchRoutes from './modules/branches/branches.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import seatRoutes from './modules/seats/seats.routes.js';
import studentRoutes from './modules/students/students.routes.js';
import userRoutes from './modules/users/users.routes.js';
dotenv.config();
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Study Library Management System API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth/login',
            dashboard: '/api/dashboard/summary',
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
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/seats', seatRoutes);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
    });
});
app.use((err, _req, res, _next) => {
    console.error('API error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
export default app;
//# sourceMappingURL=app.js.map
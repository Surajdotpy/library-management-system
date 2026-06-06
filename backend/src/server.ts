import './config/load-env.ts';
import app from './app.ts';
import { getAllowedOriginsSummary, socketCorsOptions } from './config/cors.ts';
import pool from './config/db.ts';
import type { Server as HttpServer } from 'http';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { findUserById, verifyToken } from './modules/auth/auth.service.ts';
import { startTelegramBot, stopTelegramBot } from './modules/telegram/telegram-bot.service.ts';

const PORT: number = parseInt(process.env.PORT || '5000', 10);

let server: HttpServer;
let io: SocketIOServer;

// Database connection test
async function testDatabaseConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
    const { current_time, db_version } = result.rows[0];

    console.log('✅ Database connected successfully');
    console.log(`   Time: ${current_time}`);
    console.log(`   Version: ${db_version.split(',')[0]}`);
  } catch (error) {
    console.error(
      '❌ Database connection failed:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Start server
async function startServer(): Promise<void> {
  try {
    await testDatabaseConnection();

    // 🔥 IMPORTANT: create HTTP server manually
    server = createServer(app);

    // 🔥 Setup Socket.IO
    io = new SocketIOServer(server, {
      cors: socketCorsOptions,
    });

    io.use(async (socket, next) => {
      try {
        const handshakeToken =
          typeof socket.handshake.auth?.token === 'string'
            ? socket.handshake.auth.token
            : typeof socket.handshake.headers.authorization === 'string'
              ? socket.handshake.headers.authorization
              : '';
        const normalizedToken = handshakeToken.toLowerCase().startsWith('bearer ')
          ? handshakeToken.slice(7).trim()
          : handshakeToken.trim();
        const decoded = verifyToken(normalizedToken);

        if (!decoded) {
          next(new Error('Authentication required'));
          return;
        }

        const user = await findUserById(decoded.userId);

        if (!user || !user.is_active || user.token_version !== decoded.token_version) {
          next(new Error('Session has expired'));
          return;
        }

        socket.data.user = {
          id: user.id,
          role: user.role,
          branch_id: user.branch_id,
        };
        next();
      } catch (error) {
        next(error instanceof Error ? error : new Error('Socket authentication failed'));
      }
    });

    // 🔥 Make io globally accessible
    (global as any).io = io;

    io.on('connection', (socket) => {
      const user = socket.data.user as
        | { id: number; role: 'superadmin' | 'admin'; branch_id: number | null }
        | undefined;

      if (!user) {
        socket.disconnect(true);
        return;
      }

      socket.join(`user:${user.id}`);

      if (user.role === 'superadmin') {
        socket.join('role:superadmin');
      }

      if (user.branch_id != null) {
        socket.join(`branch:${user.branch_id}`);
      }

      console.log('🔌 Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 Server started successfully');
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Process ID: ${process.pid}`);
      console.log(`   Allowed origins: ${getAllowedOriginsSummary().join(', ')}`);
      console.log('');

      startTelegramBot();

      console.log('📋 Available endpoints:');
      console.log(`   GET  http://localhost:${PORT}/`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n⚠️  ${signal} received, starting graceful shutdown...`);

  stopTelegramBot();

  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');

      try {
        await pool.end();
        console.log('✅ Database connections closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }

      console.log('👋 Shutdown complete');
      process.exit(0);
    });
  }

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start app
startServer();

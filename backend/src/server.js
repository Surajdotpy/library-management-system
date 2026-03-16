import dotenv from 'dotenv';
import app from './app.js';
import pool from './config/db.js';
dotenv.config();
const PORT = parseInt(process.env.PORT || '5000', 10);
let server;
// Database connection test
async function testDatabaseConnection() {
    try {
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        const { current_time, db_version } = result.rows[0];
        console.log('✅ Database connected successfully');
        console.log(`   Time: ${current_time}`);
        console.log(`   Version: ${db_version.split(',')[0]}`);
    }
    catch (error) {
        console.error('❌ Database connection failed:', error instanceof Error ? error.message : error);
        console.error('   Please check your .env file and ensure PostgreSQL is running');
        process.exit(1);
    }
}
// Start server
async function startServer() {
    try {
        // Test database connection first
        await testDatabaseConnection();
        // Start Express server
        server = app.listen(PORT, () => {
            console.log('');
            console.log('🚀 Server started successfully');
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Process ID: ${process.pid}`);
            console.log('');
            console.log('📋 Available endpoints:');
            console.log(`   GET  http://localhost:${PORT}/`);
            console.log(`   GET  http://localhost:${PORT}/health`);
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`\n⚠️  ${signal} received, starting graceful shutdown...`);
    // Stop accepting new connections
    if (server) {
        server.close(async () => {
            console.log('✅ HTTP server closed');
            // Close database connections
            try {
                await pool.end();
                console.log('✅ Database connections closed');
            }
            catch (error) {
                console.error('❌ Error closing database:', error);
            }
            console.log('👋 Shutdown complete');
            process.exit(0);
        });
    }
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start the application
startServer();
//# sourceMappingURL=server.js.map
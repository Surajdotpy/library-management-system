import { Pool } from 'pg';
import dotenv from 'dotenv';
// Load correct .env file based on environment
if (process.env.NODE_ENV === 'test') {
    dotenv.config({ path: '.env.test' });
}
else {
    dotenv.config();
}
const poolConfig = {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    // Connection pool settings
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Timeout if can't connect in 2s
    // SSL for production
    ...(process.env.NODE_ENV === 'production' && {
        ssl: {
            rejectUnauthorized: false
        }
    })
};
const pool = new Pool(poolConfig);
// Show which database we're connected to (helpful for debugging)
if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Using database: ${process.env.DATABASE_NAME}`);
}
// Connection event handlers
pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('📊 New database connection established');
    }
});
pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});
pool.on('remove', () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log('📊 Database connection removed from pool');
    }
});
// Query helper with logging (optional - for development)
if (process.env.NODE_ENV === 'development') {
    const originalQuery = pool.query.bind(pool);
    pool.query = function (...args) {
        const query = typeof args[0] === 'string' ? args[0] : args[0].text;
        console.log(`🔍 Query: ${query.substring(0, 100)}...`);
        return originalQuery(...args);
    };
}
export default pool;
//# sourceMappingURL=db.js.map
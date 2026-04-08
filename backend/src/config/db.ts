import fs from 'node:fs';
import { Pool, type PoolConfig } from 'pg';
import './load-env.ts';

const shouldUseSsl =
  process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production';
const allowSelfSignedCertificates = process.env.DATABASE_SSL_ALLOW_SELF_SIGNED === 'true';
const databaseCaPath = process.env.DATABASE_SSL_CA_PATH?.trim();

const poolConfig: PoolConfig = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  
  // Connection pool settings
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout if can't connect in 2s
  
  // SSL for production and any explicitly secured deployments.
  ...(shouldUseSsl && {
    ssl: {
      rejectUnauthorized: !allowSelfSignedCertificates,
      ...(databaseCaPath ? { ca: fs.readFileSync(databaseCaPath, 'utf8') } : {}),
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

pool.on('error', (err: Error) => {
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
  
  pool.query = function(...args: Parameters<typeof originalQuery>) {
    const query = typeof args[0] === 'string' ? args[0] : (args[0] as any).text;
    console.log(`🔍 Query: ${query.substring(0, 100)}...`);
    return originalQuery(...args);
  } as typeof originalQuery;
}

export default pool;

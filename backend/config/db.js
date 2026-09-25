const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let pgPool = null;

async function initializeDatabase() {
  if (pgPool) return pgPool;

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
  const dbName = process.env.DB_NAME || 'commondb';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  console.log(`[Database] Connecting to PostgreSQL at ${dbHost}:${dbPort}/${dbName} (User: ${dbUser})...`);

  try {
    const pool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1;');
    client.release();

    pgPool = pool;
    console.log(`✅ [Database] Connected successfully to PostgreSQL (Host: ${dbHost}, Database: ${dbName})`);

    await runPostgresMigrations();
    return pgPool;
  } catch (err) {
    console.error(`❌ [Database] Failed to connect to PostgreSQL (${err.message})`);
    console.error(`   Please check connection settings in backend/.env: DB_HOST=${dbHost}, DB_PORT=${dbPort}, DB_NAME=${dbName}, DB_USER=${dbUser}`);
    throw err;
  }
}

async function runPostgresMigrations() {
  const schema = `
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(100),
      company VARCHAR(255),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otps (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp_code VARCHAR(100) NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      expired_at TIMESTAMP NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(64) PRIMARY KEY,
      unique_id VARCHAR(100) UNIQUE NOT NULL,
      serial_number VARCHAR(100) UNIQUE NOT NULL,
      model VARCHAR(100) DEFAULT 'PiezoPulse Standard',
      firmware_version VARCHAR(50) DEFAULT 'v1.0.0',
      mfg_date VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'available',
      state VARCHAR(50) DEFAULT 'offline',
      location VARCHAR(255),
      device_type VARCHAR(100) DEFAULT 'IoT Sensor',
      device_name VARCHAR(255) DEFAULT 'Piezo Device',
      customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
      assigned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id VARCHAR(64) PRIMARY KEY,
      device_id VARCHAR(64) NOT NULL,
      metric VARCHAR(100) NOT NULL,
      value NUMERIC NOT NULL,
      unit VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pgPool.query(schema);

  // Progressive safe column additions for PostgreSQL if existing tables are present
  const alterStatements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`,
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS state VARCHAR(50) DEFAULT 'offline';`,
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS location VARCHAR(255);`,
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(100) DEFAULT 'IoT Sensor';`,
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255) DEFAULT 'Piezo Device';`,
    `ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`
  ];

  for (const stmt of alterStatements) {
    try {
      await pgPool.query(stmt);
    } catch {
      // Ignore if column already exists
    }
  }

  console.log('✅ [Database] PostgreSQL tables verified and updated.');
}

// Unified query wrapper for PostgreSQL
async function query(sqlText, params = []) {
  if (!pgPool) {
    await initializeDatabase();
  }
  const result = await pgPool.query(sqlText, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount
  };
}

function getDatabaseStatus() {
  return {
    type: 'postgres',
    connected: !!pgPool,
    engine: 'PostgreSQL',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'commondb',
    user: process.env.DB_USER || 'postgres'
  };
}

module.exports = {
  initializeDatabase,
  query,
  getDatabaseStatus
};

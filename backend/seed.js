const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./config/db');

async function seedDatabase() {
  try {
    // Check if an admin already exists
    const adminCheck = await query("SELECT id FROM users WHERE role = 'ADMIN'");
    if (adminCheck.rows.length === 0) {
      console.log('🌱 [Seed] Creating default administrator account...');
      const adminId = uuidv4();
      const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
      const now = new Date().toISOString();
      await query(
        `INSERT INTO users (id, email, password_hash, name, role, customer_id, is_verified, two_factor_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NULL, true, false, $6, $6)`,
        [adminId, 'admin@thingspulse.io', adminPasswordHash, 'System Administrator', 'ADMIN', now]
      );
      console.log('✅ [Seed] Default administrator created: admin@thingspulse.io / Admin@123');
    }
  } catch (error) {
    console.error('❌ [Seed] Error initializing admin:', error);
  }
}

module.exports = { seedDatabase };

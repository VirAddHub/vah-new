import { Pool, PoolClient } from 'pg';

// Production PostgreSQL Database Configuration
class DatabaseManager {
    private pool: Pool;
    private static instance: DatabaseManager;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

    static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    async query(text: string, params?: any[]): Promise<any> {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();

// Database Schema and Tables
export const createTables = async () => {
    const queries = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      company_name VARCHAR(255) NOT NULL,
      business_type VARCHAR(50),
      company_number VARCHAR(20),
      vat_number VARCHAR(20),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      postcode VARCHAR(20),
      country VARCHAR(100) DEFAULT 'United Kingdom',
      plan VARCHAR(20) DEFAULT 'basic',
      role VARCHAR(20) DEFAULT 'user',
      is_admin BOOLEAN DEFAULT FALSE,
      kyc_status VARCHAR(20) DEFAULT 'pending',
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      mail_count INTEGER DEFAULT 0,
      total_spent DECIMAL(10,2) DEFAULT 0.00
    )`,

        // Mail items table
        `CREATE TABLE IF NOT EXISTS mail_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      sender VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      tag VARCHAR(50),
      status VARCHAR(20) DEFAULT 'received',
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      scanned BOOLEAN DEFAULT FALSE,
      forwarded BOOLEAN DEFAULT FALSE,
      tracking_number VARCHAR(100),
      weight VARCHAR(20),
      dimensions VARCHAR(50),
      scan_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

        // Forwarding requests table
        `CREATE TABLE IF NOT EXISTS forwarding_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      mail_item_id INTEGER REFERENCES mail_items(id) ON DELETE CASCADE,
      destination_address TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'standard',
      tracking_number VARCHAR(100),
      carrier VARCHAR(100),
      estimated_delivery DATE,
      actual_delivery DATE,
      cost DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

        // Transactions table
        `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'GBP',
      status VARCHAR(20) DEFAULT 'pending',
      description TEXT,
      payment_method VARCHAR(100),
      invoice_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

        // Audit logs table
        `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      data JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

        // System settings table
        `CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

        // Create indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
        `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
        `CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan)`,
        `CREATE INDEX IF NOT EXISTS idx_mail_items_user_id ON mail_items(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mail_items_status ON mail_items(status)`,
        `CREATE INDEX IF NOT EXISTS idx_forwarding_requests_user_id ON forwarding_requests(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
        `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`
    ];

    for (const query of queries) {
        await db.query(query);
    }
};

// Initialize database on startup
export const initializeDatabase = async () => {
    try {
        await createTables();
        console.log('Database tables created successfully');

        // Insert default admin user if not exists
        await createDefaultAdmin();

        // Insert default system settings
        await createDefaultSettings();

    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

// Create default admin user
const createDefaultAdmin = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

    try {
        const existingAdmin = await db.query(
            'SELECT id FROM users WHERE email = $1 AND is_admin = TRUE',
            [adminEmail]
        );

        if (existingAdmin.rows.length === 0) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(adminPassword, 12);

            await db.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, company_name,
          plan, role, is_admin, kyc_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
                adminEmail,
                hashedPassword,
                'Admin',
                'User',
                'VirtualAddressHub',
                'professional',
                'super_admin',
                true,
                'approved',
                'active'
            ]);

            console.log('Default admin user created:', adminEmail);
        }
    } catch (error) {
        console.error('Failed to create default admin:', error);
    }
};

// Create default system settings
const createDefaultSettings = async () => {
    const defaultSettings = [
        {
            key: 'site_name',
            value: { value: 'VirtualAddressHub' }
        },
        {
            key: 'site_url',
            value: { value: process.env.NEXT_PUBLIC_BASE_URL || 'https://virtualaddresshub.co.uk' }
        },
        {
            key: 'admin_email',
            value: { value: process.env.ADMIN_EMAIL || 'admin@virtualaddresshub.co.uk' }
        },
        {
            key: 'maintenance_mode',
            value: { value: false }
        },
        {
            key: 'email_notifications',
            value: { value: true }
        },
        {
            key: 'sms_notifications',
            value: { value: false }
        },
        {
            key: 'two_factor_auth',
            value: { value: true }
        },
        {
            key: 'session_timeout',
            value: { value: 30 }
        },
        {
            key: 'password_policy',
            value: { value: 'strong' }
        },
        {
            key: 'audit_logging',
            value: { value: true }
        }
    ];

    for (const setting of defaultSettings) {
        try {
            await db.query(`
        INSERT INTO system_settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) DO NOTHING
      `, [setting.key, setting.value]);
        } catch (error) {
            console.error('Failed to insert setting:', setting.key, error);
        }
    }
};

export default db;

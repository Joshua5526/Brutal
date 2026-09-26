const { Pool } = require("pg");

require("dotenv").config();

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_SSL === "true"
                ? { rejectUnauthorized: false }
                : undefined
        }
        : {
            user: process.env.PGUSER || "postgres",
            host: process.env.PGHOST || "localhost",
            database: process.env.PGDATABASE || "brutal",
            password: process.env.PGPASSWORD,
            port: Number(process.env.PGPORT || 5432)
        }
);

// Create the tables required by Brutal if they don't already exist.
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,
                anonymous BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL
                    REFERENCES conversations(id)
                    ON DELETE CASCADE,
                sender TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_users_email
                ON users(email);

            CREATE INDEX IF NOT EXISTS idx_conversations_user_id
                ON conversations(user_id);

            CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
                ON messages(conversation_id);

            CREATE INDEX IF NOT EXISTS idx_messages_created_at
                ON messages(created_at);
        `);

        console.log("Database initialized successfully.");
    } catch (error) {
        console.error("Database initialization failed:", error);
    }
}

initializeDatabase();

module.exports = pool;
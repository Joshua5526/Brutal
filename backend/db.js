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

module.exports = pool;

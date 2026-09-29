import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_PATH || './data/campus_placement.db';
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    migrateSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      email                       TEXT UNIQUE NOT NULL,
      password_hash               TEXT,
      full_name                   TEXT NOT NULL,

      -- OTP fields (educational email)
      otp_hash                    TEXT,
      otp_expires_at              TEXT,
      otp_attempts                INTEGER DEFAULT 0,
      otp_last_sent_at            TEXT,
      otp_send_count              INTEGER DEFAULT 0,
      otp_send_window_start       TEXT,

      -- Personal / recovery email
      personal_email              TEXT,
      personal_email_verified     INTEGER DEFAULT 0,
      personal_otp_hash           TEXT,
      personal_otp_expires_at     TEXT,
      personal_otp_attempts       INTEGER DEFAULT 0,
      personal_otp_last_sent_at   TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      university TEXT,
      degree TEXT,
      branch TEXT,
      graduation_year INTEGER,
      cgpa REAL,
      backlogs INTEGER DEFAULT 0,
      preferred_role TEXT,
      target_company TEXT,
      onboarding_completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      technologies TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      issuer TEXT,
      year INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      extracted_text TEXT,
      upload_date TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('eligibility', 'skill-gap', 'preparation')),
      target_company TEXT,
      target_role TEXT,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS preparation_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      target_company TEXT,
      target_role TEXT,
      plan_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

/** Add new columns to existing DBs without breaking existing users */
function migrateSchema(db: Database.Database): void {
  const columns = [
    { table: 'users', col: 'otp_hash',                 def: 'TEXT' },
    { table: 'users', col: 'otp_expires_at',            def: 'TEXT' },
    { table: 'users', col: 'otp_attempts',              def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'otp_last_sent_at',          def: 'TEXT' },
    { table: 'users', col: 'otp_send_count',            def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'otp_send_window_start',     def: 'TEXT' },
    { table: 'users', col: 'personal_email',            def: 'TEXT' },
    { table: 'users', col: 'personal_email_verified',   def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'personal_otp_hash',         def: 'TEXT' },
    { table: 'users', col: 'personal_otp_expires_at',   def: 'TEXT' },
    { table: 'users', col: 'personal_otp_attempts',     def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'personal_otp_last_sent_at', def: 'TEXT' },
    // ── Phone OTP fields (nullable — existing users unaffected) ──────────────
    { table: 'users', col: 'phone_number',              def: 'TEXT' },
    { table: 'users', col: 'phone_verified',            def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'phone_verified_at',         def: 'TEXT' },
    { table: 'users', col: 'phone_otp_hash',            def: 'TEXT' },
    { table: 'users', col: 'phone_otp_expires_at',      def: 'TEXT' },
    { table: 'users', col: 'phone_otp_attempts',        def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'phone_otp_last_sent_at',    def: 'TEXT' },
    { table: 'users', col: 'phone_otp_send_count',      def: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'phone_otp_send_window_start', def: 'TEXT' },
  ];

  for (const { table, col, def } of columns) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // Make password_hash nullable for OTP-only users
  // SQLite doesn't support DROP NOT NULL via ALTER TABLE — rebuild if needed
  try {
    const tableInfo = db.prepare('PRAGMA table_info(users)').all() as any[];
    const pwCol = tableInfo.find((c: any) => c.name === 'password_hash');
    if (pwCol && pwCol.notnull === 1) {
      db.exec(`
        BEGIN;
        CREATE TABLE users_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          full_name TEXT NOT NULL,
          otp_hash TEXT, otp_expires_at TEXT, otp_attempts INTEGER DEFAULT 0,
          otp_last_sent_at TEXT, otp_send_count INTEGER DEFAULT 0, otp_send_window_start TEXT,
          personal_email TEXT, personal_email_verified INTEGER DEFAULT 0,
          personal_otp_hash TEXT, personal_otp_expires_at TEXT,
          personal_otp_attempts INTEGER DEFAULT 0, personal_otp_last_sent_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO users_v2 (id,email,password_hash,full_name,created_at,updated_at)
          SELECT id,email,password_hash,full_name,created_at,updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_v2 RENAME TO users;
        COMMIT;
      `);
      console.info('[DB] Migrated users table: password_hash is now nullable (OTP-only accounts supported)');
    }
  } catch (e) {
    // Already migrated or new DB — safe to ignore
  }

  // Rebuild analyses table to remove the restrictive CHECK constraint on type
  // This allows new types like 'resume-intelligence' to be stored
  try {
    const analysesInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='analyses'").get() as any;
    if (analysesInfo && analysesInfo.sql && analysesInfo.sql.includes("CHECK(type IN ('eligibility'")) {
      db.exec(`
        BEGIN;
        CREATE TABLE analyses_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          target_company TEXT,
          target_role TEXT,
          result TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO analyses_v2 SELECT * FROM analyses;
        DROP TABLE analyses;
        ALTER TABLE analyses_v2 RENAME TO analyses;
        COMMIT;
      `);
      console.info('[DB] Migrated analyses table: removed type CHECK constraint');
    }
  } catch (e) {
    // Already migrated — safe to ignore
  }
}

export default getDatabase;

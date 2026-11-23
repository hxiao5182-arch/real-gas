import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Standalone SQLite database (Node built-in driver).
 * Same tables as the original Cloudflare D1 schema.
 */
const DB_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "real-gas-v4.sqlite");

let database: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (database) return database;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY NOT NULL,
      team_id INTEGER NOT NULL,
      student_code TEXT NOT NULL,
      temperature REAL NOT NULL,
      pressure REAL NOT NULL,
      z REAL NOT NULL,
      deviation REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS class_control (
      id INTEGER PRIMARY KEY NOT NULL,
      collecting INTEGER DEFAULT 1 NOT NULL,
      frozen INTEGER DEFAULT 0 NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS level2_answers (
      id TEXT PRIMARY KEY NOT NULL,
      class_code TEXT NOT NULL,
      team_id INTEGER NOT NULL,
      student_code TEXT NOT NULL,
      kind TEXT NOT NULL,
      answers TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);
    CREATE INDEX IF NOT EXISTS idx_level2_team ON level2_answers(team_id);
  `);
  db.prepare(
    "INSERT OR IGNORE INTO class_control (id, collecting, frozen, updated_at) VALUES (1, 1, 0, ?)",
  ).run(Date.now());
  database = db;
  return db;
}

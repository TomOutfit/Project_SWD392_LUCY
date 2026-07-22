import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data/lucy.db');

const db = new Database(dbPath);
const rows = db.prepare('SELECT id, title, file_url, duration_sec FROM podcasts LIMIT 5').all();
console.log(JSON.stringify(rows, null, 2));
db.close();

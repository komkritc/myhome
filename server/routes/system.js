import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, getDefaultDb } from '../db/database.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', '_data');

// All tables that need to be preserved during factory reset
const TABLES_TO_BACKUP = [
  'settings', 'rooms', 'tenants', 'contracts',
  'meters', 'meter_readings', 'monthly_meter_readings',
  'invoices', 'payments', 'expenses'
];

// GET /api/system/backup - export all data as JSON
router.get('/backup', (req, res) => {
  const db = getDb();
  const backup = { exported_at: new Date().toISOString(), tables: {} };

  for (const table of TABLES_TO_BACKUP) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      backup.tables[table] = rows;
    } catch {
      backup.tables[table] = [];
    }
  }

  // Write backup file for download
  const filename = `dormitory-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  res.json({ success: true, message: 'Backup created', filename, fileCount: Object.keys(backup.tables).length });
});

// POST /api/system/factory-reset - reset database but preserve data via backup
router.post('/factory-reset', (req, res) => {
  const db = getDefaultDb();
  
  // Step 1: Create backup in memory first
  const backup = { exported_at: new Date().toISOString(), tables: {} };
  for (const table of TABLES_TO_BACKUP) {
    try {
      backup.tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      backup.tables[table] = [];
    }
  }

  // Step 2: Save backup file
  const filename = `dormitory-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  // Step 3: Drop all user tables
  db.exec(`
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS meter_readings;
    DROP TABLE IF EXISTS monthly_meter_readings;
    DROP TABLE IF EXISTS contracts;
    DROP TABLE IF EXISTS tenants;
    DROP TABLE IF EXISTS rooms;
    DROP TABLE IF EXISTS meters;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS sqlite_sequence;
  `);

  // Step 4: Keep settings table (user config) - just reset counters
  try {
    db.prepare("DELETE FROM sqlite_sequence").run();
  } catch {}

  // Step 5: Reinitialize schema and seed defaults
  const reinitModule = await import('../db/database.js');
  reinitModule.reinitDb();

  res.json({ 
    success: true, 
    message: 'Factory reset complete - all user data cleared',
    backupFile: filename,
    restoredTables: TABLES_TO_BACKUP.length
  });
});

// POST /api/system/restore - restore from backup file
router.post('/restore', (req, res) => {
  const db = getDb();
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({ error: 'Filename required' });
  }

  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Backup file not found' });
  }

  const backup = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

  // Disable foreign keys during restore
  db.pragma('foreign_keys = OFF');

  for (const [table, rows] of Object.entries(backup.tables)) {
    if (!rows.length) continue;

    // Clear table first
    db.prepare(`DELETE FROM ${table}`).run();

    // Insert restored data
    const cols = Object.keys(rows[0]);
    const values = cols.map(c => `'${String(rows[0][c] ?? '').replace(/'/g, "''")}'`).join(', ');
    
    for (const row of rows) {
      const vals = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number') return v;
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      
      try {
        db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${vals})`).run();
      } catch (err) {
        // Skip duplicates/conflicts during restore
      }
    }
  }

  db.pragma('foreign_keys = ON');

  res.json({ success: true, message: `Restored ${Object.keys(backup.tables).length} tables from ${filename}` });
});

// GET /api/system/backups - list available backup files
router.get('/backups', (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json')).map(f => {
    const stat = fs.statSync(path.join(BACKUP_DIR, f));
    return { filename: f, size: stat.size, date: stat.mtime };
  });
  res.json({ backups: files });
});

export default router;

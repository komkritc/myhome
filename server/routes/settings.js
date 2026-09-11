import { Router } from 'express';
import { getDb, getDbPath, reinitDb } from '../db/database.js';
import { join, dirname } from 'path';
import { existsSync, copyFileSync, writeFileSync, unlinkSync } from 'fs';
import crypto from 'crypto';

const router = Router();

// Get all settings
router.get('/', (_req, res) => {
  const db = getDb();
  const setting = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!setting) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการตั้งค่า' });
  }
  res.json({ success: true, data: setting });
});

// Update settings
router.put('/', (req, res) => {
  const db = getDb();
  const body = req.body;
  const setters = [];
  const params = [];
  const stringKeys = ['dorm_name','address','phone','tax_id'];
  const numberKeys = ['default_electric_rate','default_water_rate',
    'default_service_charge','default_security_deposit','payment_due_day'];

  for (const key of stringKeys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      setters.push(`${key} = COALESCE(?, ${key})`);
      params.push(String(body[key]));
    }
  }
  for (const key of numberKeys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      setters.push(`${key} = COALESCE(?, ${key})`);
      params.push(Number(body[key]) || null);
    }
  }
  if (body.email !== undefined) {
    setters.push('email = COALESCE(?, email)');
    params.push(body.email || null);
  }
  if (body.currency_symbol !== undefined) {
    setters.push('currency_symbol = COALESCE(?, currency_symbol)');
    params.push(body.currency_symbol || '฿');
  }
  if (setters.length === 0) {
    return res.status(400).json({ success: false, error: 'ไม่มีข้อมูลที่จะอัปเดต' });
  }
  setters.push("updated_at = datetime('now')");
  db.prepare(`UPDATE settings SET ${setters.join(', ')} WHERE id = 1`).run(...params);
  const setting = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ success: true, data: setting });
});

// Get global API key (from first meter)
router.get('/api-key', (_req, res) => {
  const db = getDb();
  const meter = db.prepare('SELECT api_key FROM meters LIMIT 1').get();
  if (!meter || !meter.api_key) {
    // Generate a new one
    const key = 'dorm-' + crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE meters SET api_key = ?').run(key);
    return res.json({ success: true, data: { api_key: key } });
  }
  res.json({ success: true, data: { api_key: meter.api_key } });
});

// Update global API key (all meters)
router.put('/api-key', (req, res) => {
  const db = getDb();
  const { api_key } = req.body;
  if (!api_key) {
    return res.status(400).json({ success: false, error: 'api_key เป็นข้อมูลที่จำเป็น' });
  }
  db.prepare('UPDATE meters SET api_key = ?').run(api_key);
  res.json({ success: true, data: { api_key } });
});

// Generate new global API key
router.post('/api-key/generate', (_req, res) => {
  const db = getDb();
  const key = 'dorm-' + crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE meters SET api_key = ?').run(key);
  res.json({ success: true, data: { api_key: key } });
});

// Backup / download database
router.get('/backup', (_req, res) => {
  // Ensure DB is initialized first
  getDb();
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์ฐานข้อมูล' });
  }
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `dormitory_backup_${timestamp}.db`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(dbPath);
});

// Restore database from uploaded file
router.post('/restore', (req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    try {
      const buf = Buffer.concat(chunks);
      if (buf.length < 100) {
        return res.status(400).json({ success: false, error: 'ไฟล์ฐานข้อมูลไม่ถูกต้อง' });
      }
      const header = buf.slice(0, 16).toString('ascii');
      if (!header.startsWith('SQLite format 3')) {
        return res.status(400).json({ success: false, error: 'ไฟล์ไม่ใช่ SQLite database ที่ถูกต้อง' });
      }

      const dbPath = getDbPath();
      const dbDir = dirname(dbPath);

      // Backup current DB before restore
      const db = getDb();
      const backupName = `dormitory_before_restore_${Date.now()}.db`;
      if (existsSync(dbPath)) {
        copyFileSync(dbPath, join(dbDir, backupName));
      }

      // Close current connection, write new DB, re-init
      db.close();
      writeFileSync(dbPath, buf);
      reinitDb();

      res.json({ success: true, message: 'กู้คืนฐานข้อมูลสำเร็จ', backup: backupName });
    } catch (err) {
      console.error('Restore error:', err);
      res.status(500).json({ success: false, error: `กู้คืนไม่สำเร็จ: ${err.message}` });
    }
  });
  req.on('error', (err) => {
    res.status(500).json({ success: false, error: err.message });
  });
});

// Factory reset: clear all user data, keep settings intact
router.post('/factory-reset', async (req, res) => {
  const { password } = req.body;
  
  if (!password || password !== '12345678') {
    return res.status(403).json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' });
  }

  try {
    const db = getDb();
    
    // Disable FK to truncate in any order
    db.pragma('foreign_keys = OFF');
    
    // Clear all tables (keep settings)
    db.prepare("DELETE FROM payments").run();
    db.prepare("DELETE FROM invoices").run();
    db.prepare("DELETE FROM meter_readings").run();
    db.prepare("DELETE FROM monthly_meter_readings").run();
    db.prepare("DELETE FROM contracts").run();
    db.prepare("DELETE FROM meters").run();
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM tenants").run();
    db.prepare("DELETE FROM rooms").run();
    
    // Reset sequences
    db.prepare("DELETE FROM sqlite_sequence").run();
    
    db.pragma('foreign_keys = ON');
    
    res.json({ 
      success: true, 
      message: '✅ รีเซ็ตสำเร็จ ลบข้อมูลทั้งหมดแล้ว (คงค่า settings)'
    });
  } catch (err) {
    console.error('Factory reset error:', err);
    res.status(500).json({ success: false, error: `รีเซ็ตไม่สำเร็จ: ${err.message}` });
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/database.js';
import crypto from 'crypto';

const router = Router();

function toISO(dateStr) {
  if (!dateStr) return dateStr;
  if (dateStr.includes('T')) return dateStr;
  return dateStr.replace(' ', 'T') + 'Z';
}

// GET /api/meters - List all registered meters
router.get('/', (req, res) => {
  const db = getDb();
  const { room_id, meter_type, status } = req.query;
  
  let query = `SELECT m.*, r.room_number,
    (SELECT reading FROM meter_readings WHERE meter_id = m.id ORDER BY id DESC LIMIT 1) as last_reading,
    (SELECT reading_time FROM meter_readings WHERE meter_id = m.id ORDER BY id DESC LIMIT 1) as last_reading_time
    FROM meters m
    JOIN rooms r ON m.room_id = r.id`;
  let whereClause = [];
  let params = [];
  
  if (room_id) {
    whereClause.push('m.room_id = ?');
    params.push(Number(room_id));
  }
  if (meter_type) {
    whereClause.push('m.meter_type = ?');
    params.push(meter_type);
  }
  if (status) {
    whereClause.push('m.status = ?');
    params.push(status);
  }
  
  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }
  query += ' ORDER BY r.room_number, m.meter_type';
  
  const result = db.prepare(query).all(...params).map(r => ({
    ...r,
    last_seen_at: toISO(r.last_seen_at),
    installed_at: toISO(r.installed_at),
    created_at: toISO(r.created_at),
    updated_at: toISO(r.updated_at),
  }));
  res.json({ success: true, data: result });
});

// GET /api/meters/:id - Get single meter
router.get('/:id', (req, res) => {
  const db = getDb();
  const meter = db.prepare(`SELECT m.*, r.room_number,
    (SELECT reading FROM meter_readings WHERE meter_id = m.id ORDER BY id DESC LIMIT 1) as last_reading,
    (SELECT reading_time FROM meter_readings WHERE meter_id = m.id ORDER BY id DESC LIMIT 1) as last_reading_time
    FROM meters m JOIN rooms r ON m.room_id = r.id WHERE m.id = ?`).get(req.params.id);
  
  if (!meter) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์' });
  }
  res.json({ success: true, data: {
    ...meter,
    last_seen_at: toISO(meter.last_seen_at),
    installed_at: toISO(meter.installed_at),
    created_at: toISO(meter.created_at),
    updated_at: toISO(meter.updated_at),
  }});
});

// POST /api/meters - Register a new meter
router.post('/', (req, res) => {
  const db = getDb();
  const { room_id, meter_type, device_id, unit, api_key } = req.body;
  
  if (!room_id || !meter_type || !device_id) {
    return res.status(400).json({ success: false, error: 'room_id, meter_type, และ device_id เป็นข้อมูลที่จำเป็น' });
  }
  
  if (!['electricity', 'water'].includes(meter_type)) {
    return res.status(400).json({ success: false, error: 'meter_type ต้องเป็น electricity หรือ water' });
  }
  
  // Check for duplicate device_id
  const existing = db.prepare('SELECT id FROM meters WHERE device_id = ?').get(device_id);
  if (existing) {
    return res.status(409).json({ success: false, error: 'device_id นี้มีอยู่แล้ว' });
  }
  
  const generatedApiKey = api_key || crypto.randomBytes(32).toString('hex');
  const defaultUnit = unit || (meter_type === 'electricity' ? 'kWh' : 'm3');
  
  try {
    const result = db.prepare(`INSERT INTO meters (room_id, meter_type, device_id, unit, api_key, status)
      VALUES (?, ?, ?, ?, ?, 'active')`).run(room_id, meter_type, device_id, defaultUnit, generatedApiKey);
    
    const meter = db.prepare('SELECT * FROM meters WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: meter });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/meters/:id - Update meter
router.put('/:id', (req, res) => {
  const db = getDb();
  const { room_id, meter_type, device_id, unit, api_key, status } = req.body;
  
  const existing = db.prepare('SELECT * FROM meters WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์' });
  }
  
  try {
    db.prepare(`UPDATE meters SET room_id=?, meter_type=?, device_id=?, unit=?, api_key=?, status=?, updated_at=datetime('now')
      WHERE id=?`).run(
      room_id || existing.room_id,
      meter_type || existing.meter_type,
      device_id || existing.device_id,
      unit || existing.unit,
      api_key || existing.api_key,
      status || existing.status,
      req.params.id
    );
    
    const meter = db.prepare('SELECT * FROM meters WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: meter });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/meters/:id - Delete meter
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM meters WHERE id = ?').run(req.params.id);
  if (result.changes > 0) {
    res.json({ success: true, message: 'ลบมิเตอร์สำเร็จ' });
  } else {
    res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์' });
  }
});

// GET /api/meters/:id/status - Get meter status
router.get('/:id/status', (req, res) => {
  const db = getDb();
  const meter = db.prepare('SELECT * FROM meters WHERE id = ?').get(req.params.id);
  if (!meter) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์' });
  }
  
  const lastReading = db.prepare('SELECT * FROM meter_readings WHERE meter_id = ? ORDER BY id DESC LIMIT 1')
    .get(req.params.id);
  
  const todayStart = new Date().toISOString().split('T')[0];
  const todayReadings = db.prepare('SELECT COUNT(*) as count FROM meter_readings WHERE meter_id = ? AND reading_time >= ?')
    .get(req.params.id, todayStart);
  
  const isOnline = meter.last_seen_at && (Date.now() - new Date(meter.last_seen_at).getTime() < 5 * 60 * 1000);
  
  res.json({
    success: true,
    data: {
      ...meter,
      last_seen_at: toISO(meter.last_seen_at),
      installed_at: toISO(meter.installed_at),
      created_at: toISO(meter.created_at),
      updated_at: toISO(meter.updated_at),
      is_online: isOnline,
      today_readings: todayReadings.count,
      last_reading: lastReading
    }
  });
});

export default router;

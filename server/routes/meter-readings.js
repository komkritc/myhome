import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

const round1 = n => Math.round(n * 10) / 10;

// Sync smart meter reading to monthly_meter_readings
function syncToMonthly(db, meter, readingValue, readingTime) {
  const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(meter.room_id);
  if (!room) return;

  const date = new Date(readingTime);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Find or create monthly record
  let existing = db.prepare('SELECT id, electric_before, electric_current, water_before, water_current FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
    .get(meter.room_id, month, year);

  if (existing) {
    // Update the current reading for this meter type
    if (meter.meter_type === 'electricity') {
      db.prepare("UPDATE monthly_meter_readings SET electric_current = ?, updated_at = datetime('now') WHERE id = ?")
        .run(round1(readingValue), existing.id);
    } else if (meter.meter_type === 'water') {
      db.prepare("UPDATE monthly_meter_readings SET water_current = ?, updated_at = datetime('now') WHERE id = ?")
        .run(round1(readingValue), existing.id);
    }
  } else {
    // Get the before values from the previous month's reading
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevReading = db.prepare('SELECT electric_current, water_current FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
      .get(meter.room_id, prevMonth, prevYear);

    const electricBefore = prevReading ? prevReading.electric_current : 0;
    const waterBefore = prevReading ? prevReading.water_current : 0;

    const electricCurrent = meter.meter_type === 'electricity' ? round1(readingValue) : electricBefore;
    const waterCurrent = meter.meter_type === 'water' ? round1(readingValue) : waterBefore;

    db.prepare(`INSERT INTO monthly_meter_readings (room_id, month, year, electric_before, water_before, electric_current, water_current, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(meter.room_id, month, year, round1(electricBefore), round1(waterBefore), round1(electricCurrent), round1(waterCurrent), 'synced from smart meter');
  }
}

// POST /api/meter-readings - Smart meter sends a reading (by device_id in body)
router.post('/', (req, res) => {
  const db = getDb();
  const { device_id, room_id, meter_type, reading, timestamp, api_key } = req.body;
  
  if (!device_id || reading === undefined) {
    return res.status(400).json({ success: false, error: 'device_id และ reading เป็นข้อมูลที่จำเป็น' });
  }
  
  // Find meter by device_id
  const meter = db.prepare('SELECT * FROM meters WHERE device_id = ?').get(device_id);
  if (!meter) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์ที่ลงทะเบียนด้วย device_id นี้' });
  }
  
  // Verify API key if meter has one
  if (meter.api_key && api_key !== meter.api_key) {
    return res.status(401).json({ success: false, error: 'API key ไม่ถูกต้อง' });
  }
  
  // Validate reading is number and non-negative
  const readingValue = parseFloat(reading);
  if (isNaN(readingValue) || readingValue < 0) {
    return res.status(400).json({ success: false, error: 'reading ต้องเป็นตัวเลขที่ไม่ต่ำกว่า 0' });
  }
  
  // Check for meter type match if provided
  if (meter_type && meter.meter_type !== meter_type) {
    return res.status(400).json({ success: false, error: `มิเตอร์นี้เป็นประเภท ${meter.meter_type} ไม่ใช่ ${meter_type}` });
  }
  
  // Get previous reading for response
  const lastReading = db.prepare('SELECT reading FROM meter_readings WHERE meter_id = ? ORDER BY reading_time DESC LIMIT 1')
    .get(meter.id);
  
  const readingTime = timestamp || new Date().toISOString();
  
  try {
    const result = db.prepare('INSERT INTO meter_readings (meter_id, reading, reading_time) VALUES (?, ?, ?)')
      .run(meter.id, readingValue, readingTime);
    
    // Update meter last_seen_at
    db.prepare("UPDATE meters SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(meter.id);
    
    // Sync to monthly_meter_readings
    syncToMonthly(db, meter, readingValue, readingTime);
    
    res.status(201).json({ 
      success: true, 
      data: { 
        id: result.lastInsertRowid, 
        meter_id: meter.id, 
        device_id: meter.device_id,
        reading: readingValue, 
        reading_time: readingTime,
        previous_reading: lastReading?.reading || null
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/meter-readings/:device_id - Smart meter sends a reading (by device_id in URL)
router.post('/:device_id', (req, res) => {
  const db = getDb();
  const { device_id } = req.params;
  const { reading, timestamp, api_key } = req.body;
  
  if (reading === undefined) {
    return res.status(400).json({ success: false, error: 'reading เป็นข้อมูลที่จำเป็น' });
  }
  
  // Find meter by device_id
  const meter = db.prepare('SELECT * FROM meters WHERE device_id = ?').get(device_id);
  if (!meter) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์ที่ลงทะเบียนด้วย device_id นี้' });
  }
  
  // Verify API key if meter has one
  if (meter.api_key && api_key !== meter.api_key) {
    return res.status(401).json({ success: false, error: 'API key ไม่ถูกต้อง' });
  }
  
  // Validate reading
  const readingValue = parseFloat(reading);
  if (isNaN(readingValue) || readingValue < 0) {
    return res.status(400).json({ success: false, error: 'reading ต้องเป็นตัวเลขที่ไม่ต่ำกว่า 0' });
  }
  
  // Get previous reading for response
  const lastReading = db.prepare('SELECT reading FROM meter_readings WHERE meter_id = ? ORDER BY reading_time DESC LIMIT 1')
    .get(meter.id);
  
  const readingTime = timestamp || new Date().toISOString();
  
  try {
    const result = db.prepare('INSERT INTO meter_readings (meter_id, reading, reading_time) VALUES (?, ?, ?)')
      .run(meter.id, readingValue, readingTime);
    
    // Update meter last_seen_at
    db.prepare("UPDATE meters SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(meter.id);
    
    // Sync to monthly_meter_readings
    syncToMonthly(db, meter, readingValue, readingTime);
    
    res.status(201).json({ 
      success: true, 
      data: { 
        id: result.lastInsertRowid, 
        meter_id: meter.id, 
        device_id: meter.device_id,
        reading: readingValue, 
        reading_time: readingTime,
        previous_reading: lastReading?.reading || null
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/meter-readings/:room_id - Get readings for a room
router.get('/:room_id', (req, res) => {
  const db = getDb();
  const { room_id } = req.params;
  const { meter_type, from, to, limit } = req.query;
  
  let query = `SELECT mr.*, m.device_id, m.meter_type, m.unit, m.room_id, r.room_number
    FROM meter_readings mr
    JOIN meters m ON mr.meter_id = m.id
    JOIN rooms r ON m.room_id = r.id
    WHERE m.room_id = ?`;
  let params = [Number(room_id)];
  
  if (meter_type) {
    query += ' AND m.meter_type = ?';
    params.push(meter_type);
  }
  if (from) {
    query += ' AND mr.reading_time >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND mr.reading_time <= ?';
    params.push(to);
  }
  
  query += ' ORDER BY mr.id DESC';
  
  if (limit) {
    query += ' LIMIT ?';
    params.push(Number(limit));
  }
  
  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// GET /api/meter-readings/:room_id/latest - Get latest readings for a room
router.get('/:room_id/latest', (req, res) => {
  const db = getDb();
  const { room_id } = req.params;
  
  const electricity = db.prepare(`SELECT mr.*, m.device_id, m.unit
    FROM meter_readings mr
    JOIN meters m ON mr.meter_id = m.id
    WHERE m.room_id = ? AND m.meter_type = 'electricity'
    ORDER BY mr.id DESC LIMIT 1`).get(room_id);
  
  const water = db.prepare(`SELECT mr.*, m.device_id, m.unit
    FROM meter_readings mr
    JOIN meters m ON mr.meter_id = m.id
    WHERE m.room_id = ? AND m.meter_type = 'water'
    ORDER BY mr.id DESC LIMIT 1`).get(room_id);
  
  res.json({ success: true, data: { electricity, water } });
});

// GET /api/meter-readings/:room_id/monthly - Get monthly summary for a room
router.get('/:room_id/monthly', (req, res) => {
  const db = getDb();
  const { room_id } = req.params;
  const { year } = req.query;
  
  const targetYear = year || new Date().getFullYear();
  
  const electricity = db.prepare(`
    SELECT 
      strftime('%m', mr.reading_time) as month,
      MIN(mr.reading) as first_reading,
      MAX(mr.reading) as last_reading,
      MAX(mr.reading) - MIN(mr.reading) as consumption,
      COUNT(*) as reading_count
    FROM meter_readings mr
    JOIN meters m ON mr.meter_id = m.id
    WHERE m.room_id = ? AND m.meter_type = 'electricity' 
      AND strftime('%Y', mr.reading_time) = ?
    GROUP BY strftime('%m', mr.reading_time)
    ORDER BY month`).all(room_id, String(targetYear));
  
  const water = db.prepare(`
    SELECT 
      strftime('%m', mr.reading_time) as month,
      MIN(mr.reading) as first_reading,
      MAX(mr.reading) as last_reading,
      MAX(mr.reading) - MIN(mr.reading) as consumption,
      COUNT(*) as reading_count
    FROM meter_readings mr
    JOIN meters m ON mr.meter_id = m.id
    WHERE m.room_id = ? AND m.meter_type = 'water' 
      AND strftime('%Y', mr.reading_time) = ?
    GROUP BY strftime('%m', mr.reading_time)
    ORDER BY month`).all(room_id, String(targetYear));
  
  res.json({ success: true, data: { year: Number(targetYear), electricity, water } });
});

// POST /api/meter-readings/:device_id/set-before - Set initial/before reading
router.post('/:device_id/set-before', (req, res) => {
  const db = getDb();
  const { device_id } = req.params;
  const { reading, timestamp, api_key } = req.body;
  
  if (reading === undefined) {
    return res.status(400).json({ success: false, error: 'reading เป็นข้อมูลที่จำเป็น' });
  }
  
  // Find meter by device_id
  const meter = db.prepare('SELECT * FROM meters WHERE device_id = ?').get(device_id);
  if (!meter) {
    return res.status(404).json({ success: false, error: 'ไม่พบมิเตอร์ที่ลงทะเบียนด้วย device_id นี้' });
  }
  
  // Verify API key if meter has one
  if (meter.api_key && api_key !== meter.api_key) {
    return res.status(401).json({ success: false, error: 'API key ไม่ถูกต้อง' });
  }
  
  // Validate reading
  const readingValue = parseFloat(reading);
  if (isNaN(readingValue) || readingValue < 0) {
    return res.status(400).json({ success: false, error: 'reading ต้องเป็นตัวเลขที่ไม่ต่ำกว่า 0' });
  }
  
  const readingTime = timestamp || new Date().toISOString();
  
  try {
    // Delete all existing readings for this meter (reset)
    const deleteResult = db.prepare('DELETE FROM meter_readings WHERE meter_id = ?').run(meter.id);
    
    // Reset monthly_meter_readings for current month - set before = reading, current = reading
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    
    let monthlyUpdate;
    const existingMonthly = db.prepare('SELECT id FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
      .get(meter.room_id, curMonth, curYear);
    
    if (existingMonthly) {
      if (meter.meter_type === 'electricity') {
        monthlyUpdate = db.prepare("UPDATE monthly_meter_readings SET electric_before = ?, electric_current = ?, updated_at = datetime('now') WHERE id = ?")
          .run(readingValue, readingValue, existingMonthly.id);
      } else {
        monthlyUpdate = db.prepare("UPDATE monthly_meter_readings SET water_before = ?, water_current = ?, updated_at = datetime('now') WHERE id = ?")
          .run(readingValue, readingValue, existingMonthly.id);
      }
    } else {
      if (meter.meter_type === 'electricity') {
        monthlyUpdate = db.prepare("INSERT INTO monthly_meter_readings (room_id, month, year, electric_before, electric_current, water_before, water_current, notes) VALUES (?, ?, ?, ?, ?, 0, 0, ?)")
          .run(meter.room_id, curMonth, curYear, readingValue, readingValue, `reset ${device_id} before=${readingValue}`);
      } else {
        monthlyUpdate = db.prepare("INSERT INTO monthly_meter_readings (room_id, month, year, electric_before, electric_current, water_before, water_current, notes) VALUES (?, ?, ?, 0, 0, ?, ?, ?)")
          .run(meter.room_id, curMonth, curYear, readingValue, readingValue, `reset ${device_id} before=${readingValue}`);
      }
    }
    
    // Insert the before reading
    const result = db.prepare('INSERT INTO meter_readings (meter_id, reading, reading_time) VALUES (?, ?, ?)')
      .run(meter.id, readingValue, readingTime);
    
    // Update meter last_seen_at
    db.prepare("UPDATE meters SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(meter.id);
    
    res.status(201).json({ 
      success: true, 
      message: `ตั้งค่าเริ่มต้นมิเตอร์ ${device_id} เป็น ${readingValue} ${meter.unit} สำเร็จ`,
      data: { 
        id: result.lastInsertRowid, 
        meter_id: meter.id, 
        device_id: meter.device_id,
        reading: readingValue, 
        reading_time: readingTime
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

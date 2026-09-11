import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Get monthly meter readings (from manual billing + smart meter aggregates)
router.get('/', (req, res) => {
  const db = getDb();
  const { month, year, room_id } = req.query;

  let query = `SELECT mmr.id, mmr.room_id, r.room_number,
               mmr.month, mmr.year,
               mmr.electric_before, mmr.water_before,
               mmr.electric_current, mmr.water_current,
               mmr.notes, mmr.created_at, mmr.updated_at
               FROM monthly_meter_readings mmr
               JOIN rooms r ON mmr.room_id = r.id`;
  let whereClause = [];
  let params = [];

  if (room_id) {
    if (!isNaN(Number(room_id))) {
      whereClause.push('mmr.room_id = ?');
      params.push(Number(room_id));
    } else {
      const room = db.prepare('SELECT id FROM rooms WHERE room_number = ?').get(room_id);
      if (room) {
        whereClause.push('mmr.room_id = ?');
        params.push(room.id);
      }
    }
  }
  if (month) {
    whereClause.push('mmr.month = ?');
    params.push(Number(month));
  }
  if (year) {
    whereClause.push('mmr.year = ?');
    params.push(Number(year));
  }

  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }
  query += ' ORDER BY mmr.year DESC, mmr.month DESC';

  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get single meter reading
router.get('/:id', (req, res) => {
  const db = getDb();
  const reading = db.prepare(`
    SELECT mmr.*, r.room_number FROM monthly_meter_readings mmr
    JOIN rooms r ON mmr.room_id = r.id WHERE mmr.id = ?`).get(req.params.id);

  if (!reading) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลมิเตอร์' });
  }

  res.json({ success: true, data: reading });
});

// Create or update meter reading (manual billing entry)
router.post('/', (req, res) => {
  const db = getDb();
  const { room_id, month, year, electric_before, water_before, electric_current, water_current, notes } = req.body;

  if (!room_id || !month || !year) {
    return res.status(400).json({ success: false, error: 'เลขห้อง เดือน และปี เป็นข้อมูลที่จำเป็น' });
  }

  const roomId = Number(room_id);
  const monthNum = Number(month);
  const yearNum = Number(year);

  // Round to 1 decimal place
  const round1 = (n) => Math.round(n * 10) / 10;

  // Get room for defaults
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
  }

  // Check existing record for upsert
  const existing = db.prepare('SELECT id FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?').get(roomId, monthNum, yearNum);

  const currentElectric = round1(Math.max(0, Number(electric_current) >= 0 ? Number(electric_current) : (existing?.electric_current || 0)));
  const currentWater = round1(Math.max(0, Number(water_current) >= 0 ? Number(water_current) : (existing?.water_current ?? 0)));
  const beforeElectric = round1(Number(electric_before) >= 0 ? Number(electric_before) : (existing?.electric_before || 0));
  const beforeWater = round1(Number(water_before) >= 0 ? Number(water_before) : (existing?.water_before || 0));

  try {
    let result;
    if (existing) {
      // Update existing
      result = db.prepare(`UPDATE monthly_meter_readings SET
        electric_before = ?, water_before = ?, electric_current = ?, water_current = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?`).run(
        beforeElectric, beforeWater, currentElectric, currentWater, notes || '', existing.id
      );
    } else {
      // Insert new
      result = db.prepare(`INSERT INTO monthly_meter_readings
        (room_id, month, year, electric_before, water_before, electric_current, water_current, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        roomId, monthNum, yearNum,
        beforeElectric, beforeWater, currentElectric, currentWater, notes || ''
      );
    }

    res.json({ success: true, data: { changes: result.changes } });
  } catch (err) {
    console.error('Meter save error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete meter reading
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM monthly_meter_readings WHERE id = ?').run(req.params.id);
  if (result.changes > 0) {
    res.json({ success: true, message: 'ลบข้อมูลมิเตอร์สำเร็จ' });
  } else {
    res.status(404).json({ success: false, error: 'ไม่พบข้อมูลมิเตอร์' });
  }
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Get all rooms (with optional filters)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, floor, search } = req.query;
  
  let query = 'SELECT * FROM rooms';
  let whereClause = [];
  let params = [];
  
  if (status) {
    whereClause.push('status = ?');
    params.push(status);
  }
  if (floor) {
    whereClause.push('floor = ?');
    params.push(Number(floor));
  }
  if (search && typeof search === 'string') {
    whereClause.push('(room_number LIKE ? OR description LIKE ?)');
    const searchText = `%${search}%`;
    params.push(searchText, searchText);
  }
  
  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }
  query += ' ORDER BY room_number';
  
  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get single room by ID or number
router.get('/:id', (req, res) => {
  const db = getDb();
  const room_id = parseInt(req.params.id);
  
  let room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!room) {
    room = db.prepare('SELECT * FROM rooms WHERE room_number = ?').get(req.params.id);
  }
  
  if (!room) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
  }
  
  let currentTenant = null;
  if (room.current_tenant_id) {
    currentTenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(room.current_tenant_id);
  }
  
  res.json({ success: true, data: room, tenant: currentTenant });
});

// Create new room
router.post('/', (req, res) => {
  const db = getDb();

  // Begin transaction for room + optional tenant creation
  const stmtRoom = db.prepare(`INSERT INTO rooms 
    (room_number, floor, rental_price, electric_rate, water_rate, service_charge, security_deposit, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  let status = 'available';
  let currentTenantId = null;

  try {
    db.prepare('BEGIN').run();

    const result = stmtRoom.run(
      req.body.room_number,
      Number(req.body.floor) || 1,
      Math.max(0, Number(req.body.rental_price) || 0),
      Math.max(0, Number(req.body.electric_rate) || 8),
      Math.max(0, Number(req.body.water_rate) || 18),
      Math.max(0, Number(req.body.service_charge) || 100),
      Math.max(0, Number(req.body.security_deposit) || 2000),
      req.body.description || ''
    );

    const roomId = Number(result.lastInsertRowid);

    // If tenant data provided, create tenant + contract
    if (req.body.tenant && typeof req.body.tenant === 'object' && 
        (req.body.tenant.first_name || req.body.tenant.phone)) {
      const insertTenant = db.prepare(`INSERT INTO tenants 
        (first_name, last_name, phone, email, id_card, status)
        VALUES (?, ?, ?, ?, ?, ?)`);
      
      const tenantResult = insertTenant.run(
        req.body.tenant.first_name || '',
        req.body.tenant.last_name || '',
        req.body.tenant.phone || '',
        req.body.tenant.email || '',
        req.body.tenant.id_card || '',
        'active'
      );

      const tenantId = Number(tenantResult.lastInsertRowid);

      // Create contract linking room + tenant
      db.prepare(`INSERT INTO contracts 
        (room_id, tenant_id, start_date, end_date, status)
        VALUES (?, ?, DATE('now'), DATE('now', '+1 year'), 'active')`).run(
        roomId, tenantId
      );

      status = 'occupied';
      currentTenantId = tenantId;
    }

    // Update room status if occupied
    if (status === 'occupied') {
      db.prepare('UPDATE rooms SET status = ?, current_tenant_id = ? WHERE id = ?').run(
        status, currentTenantId, roomId
      );
    }

    db.prepare('COMMIT').run();

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    res.status(201).json({ success: true, data: room });

  } catch (err) {
    db.prepare('ROLLBACK').run();
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update room info and optionally assign/remove a tenant
router.put('/:id', (req, res) => {
  const db = getDb();
  const room_id = parseInt(req.params.id);
  
  const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
  }

  const { tenant_id, remove_tenant } = req.body;
  
  const status_val = req.body.status || existing.status;
  const room_number_val = req.body.room_number || existing.room_number;
  const floor_val = Number(req.body.floor) || existing.floor;
  
  db.prepare(`UPDATE rooms SET
    room_number = ?,
    floor = ?,
    status = ?,
    rental_price = COALESCE(?, rental_price),
    electric_rate = COALESCE(?, electric_rate),
    water_rate = COALESCE(?, water_rate),
    service_charge = COALESCE(?, service_charge),
    security_deposit = COALESCE(?, security_deposit),
    description = ?
  WHERE id = ?`).run(
    room_number_val,
    floor_val,
    status_val,
    Number(req.body.rental_price) !== undefined && req.body.rental_price !== '' ? Math.max(0, Number(req.body.rental_price)) : null,
    Number(req.body.electric_rate) !== undefined && req.body.electric_rate !== '' ? Math.max(0, Number(req.body.electric_rate)) : null,
    Number(req.body.water_rate) !== undefined && req.body.water_rate !== '' ? Math.max(0, Number(req.body.water_rate)) : null,
    Number(req.body.service_charge) !== undefined && req.body.service_charge !== '' ? Math.max(0, Number(req.body.service_charge)) : null,
    Number(req.body.security_deposit) !== undefined && req.body.security_deposit !== '' ? Math.max(0, Number(req.body.security_deposit)) : null,
    (req.body.description ?? existing.description),
    room_id
  );
  
  // Handle tenant assignment or removal
  if (tenant_id && !isNaN(tenant_id)) {
    const tenant = db.prepare("SELECT id FROM tenants WHERE id = ? AND status != 'inactive'").get(tenant_id);
    if (tenant) {
      db.prepare('UPDATE rooms SET current_tenant_id = ?, status = ? WHERE id = ?').run(
        tenant.id, 'occupied', room_id
      );
      // Update or create contract
      const existingContract = db.prepare("SELECT id FROM contracts WHERE room_id = ? AND status = 'active' LIMIT 1").get(room_id);
      if (existingContract) {
        db.prepare('UPDATE contracts SET tenant_id = ? WHERE id = ?').run(tenant.id, existingContract.id);
      } else {
        db.prepare('INSERT INTO contracts (room_id, tenant_id, start_date, end_date, status) VALUES (?, ?, DATE(\'now\'), DATE(\'now\', \'+1 year\'), \'active\')').run(room_id, tenant.id);
      }
    }
  } else if (remove_tenant || req.body.status === 'available') {
    db.prepare('UPDATE rooms SET current_tenant_id = NULL, status = ? WHERE id = ?').run(
      'available', room_id
    );
  }
  
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  res.json({ success: true, data: room });
});
// Delete room
router.delete('/:id', (req, res) => {
  const db = getDb();
  const room_id = parseInt(req.params.id);
  
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!room) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
  }
  
  try {
    db.prepare('DELETE FROM contracts WHERE room_id = ?').run(room_id);
    const invoices = db.prepare('SELECT id FROM invoices WHERE room_id = ?').all(room_id);
    if (invoices.length > 0) {
      const ids = invoices.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`DELETE FROM payments WHERE invoice_id IN (${placeholders})`).run(...ids);
    }
    db.prepare('DELETE FROM invoices WHERE room_id = ?').run(room_id);
    // Clear tenant reference if still set
    db.prepare('UPDATE rooms SET current_tenant_id = NULL WHERE id = ?').run(room_id);
    db.prepare('DELETE FROM rooms WHERE id = ?').run(room_id);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'ไม่สามารถลบห้องได้' });
  }
  
  res.json({ success: true, message: 'ลบห้องสำเร็จ' });
});

// Update room status and tenant
router.put('/:id/status', (req, res) => {
  const db = getDb();
  const room_id = parseInt(req.params.id);
  const { status, tenant_id } = req.body;
  if (!status || !['available', 'occupied', 'booked', 'maintenance'].includes(status)) {
    return res.status(400).json({ success: false, error: 'สถานะห้องไม่ถูกต้อง' });
  }
  
  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, room_id);
  
  if (tenant_id === '') {
    db.prepare('UPDATE rooms SET current_tenant_id = NULL WHERE id = ?').run(room_id);
    db.prepare("UPDATE contracts SET status = 'inactive' WHERE room_id = ? AND status = 'active'").run(room_id);
  } else if (status === 'occupied' && tenant_id) {
    db.prepare('UPDATE rooms SET current_tenant_id = ? WHERE id = ?').run(tenant_id, room_id);
    const existing = db.prepare("SELECT id FROM contracts WHERE room_id = ? AND tenant_id = ? AND status = 'active'").get(room_id, tenant_id);
    if (!existing) {
      db.prepare("UPDATE contracts SET status = 'inactive' WHERE room_id = ? AND status = 'active'").run(room_id);
      db.prepare("INSERT INTO contracts (room_id, tenant_id, start_date, end_date, status) VALUES (?, ?, DATE('now'), DATE('now', '+1 year'), 'active')").run(room_id, tenant_id);
    }
  }
  
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  res.json({ success: true, data: room });
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Get all invoices (with optional filters)
router.get('/', (req, res) => {
  const db = getDb();
  const { month, year, room_id, status, tenant_search } = req.query;
  
  let query = `SELECT i.*, r.room_number, t.first_name, t.last_name,
               COALESCE(paid.total_paid, 0) AS amount_paid,
               (i.total_amount - COALESCE(paid.total_paid, 0)) AS remaining_balance
              FROM invoices i
              LEFT JOIN rooms r ON i.room_id = r.id
              LEFT JOIN tenants t ON i.tenant_id = t.id
               LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid ON i.id = paid.invoice_id`;
  let whereClause = [];
  let params = [];
  
  if (status) {
    whereClause.push('i.status = ?');
    params.push(status);
  }
  if (month) {
    whereClause.push('i.month = ?');
    params.push(Number(month));
  }
  if (year) {
    whereClause.push('i.year = ?');
    params.push(Number(year));
  }
  if (room_id && !isNaN(room_id)) {
    whereClause.push('i.room_id = ?');
    params.push(Number(room_id));
  }
  if (tenant_search && typeof tenant_search === 'string') {
    const searchText = `%${tenant_search}%`;
    whereClause.push('(t.first_name LIKE ? OR t.last_name LIKE ?)');
    params.push(searchText, searchText);
  }
  
  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }

  // BUG-02 FIX: Add pagination support — must come after ORDER BY in SQL
  const limit = req.query.limit !== undefined ? Math.min(parseInt(req.query.limit), 500) : 100;
  const offset = req.query.offset !== undefined ? parseInt(req.query.offset) : 0;

  query += ` ORDER BY i.year DESC, i.month DESC, r.room_number LIMIT ${limit} OFFSET ${offset}`;

  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get single invoice
router.get('/:id', (req, res) => {
  const db = getDb();
  const invoice_id = parseInt(req.params.id);
  
  const invoice = db.prepare(`SELECT i.*, r.room_number, t.first_name, t.last_name
      FROM invoices i
      LEFT JOIN rooms r ON i.room_id = r.id
      LEFT JOIN tenants t ON i.tenant_id = t.id
      WHERE i.id = ?`).get(invoice_id);
  
  if (!invoice) {
    return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });
  }

try {
    // Get payments for this invoice
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(invoice_id);
    
    res.json({ success: true, data: invoice, payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create and calculate billing for a specific room/month/year
router.post('/calculate', (req, res) => {
  const db = getDb();
  const { room_id, month, year } = req.body;
  
  if (!room_id || !month || !year) {
    return res.status(400).json({ success: false, error: 'เลขห้อง เดือน และปี เป็นข้อมูลที่จำเป็น' });
  }

try {
    // Get room info + current tenant
    const room = db.prepare(`SELECT r.*, t.first_name, t.last_name 
      FROM rooms r LEFT JOIN tenants t ON r.current_tenant_id = t.id 
      WHERE r.id = ?`).get(room_id);

    if (!room) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
    }

    // Get meter readings from monthly_meter_readings (billing data)
    const monthlyReading = db.prepare('SELECT * FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
      .get(room_id, month, year);

    let electricUnits = 0;
    let waterUnits = 0;

    if (monthlyReading) {
      electricUnits = Math.max(0, (monthlyReading.electric_current || 0) - (monthlyReading.electric_before || 0));
      waterUnits = Math.max(0, (monthlyReading.water_current || 0) - (monthlyReading.water_before || 0));
    }

    const electricityCost = electricUnits * room.electric_rate;
    const waterCost = waterUnits * room.water_rate;
    const serviceCharge = room.service_charge != null ? room.service_charge : 100;
    const totalAmount = room.rental_price + electricityCost + waterCost + serviceCharge;

    res.json({
      success: true,
      data: {
        room_number: room.room_number,
        tenant_name: room.first_name ? `${room.first_name} ${room.last_name || ''}` : null,
        rental_price: room.rental_price,
        electric_units: Math.round(electricUnits * 100) / 100,
        electric_rate: room.electric_rate,
        electricity_cost: Math.round(electricityCost * 100) / 100,
        water_units: Math.round(waterUnits * 100) / 100,
        water_rate: room.water_rate,
        water_cost: Math.round(waterCost * 100) / 100,
        service_charge: serviceCharge,
        total_amount: Math.round(totalAmount * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate invoice for a specific room/month/year from calculated data
router.post('/', (req, res) => {
  const db = getDb();
  const { room_id, tenant_id, month, year, due_date } = req.body;
  
  if (!room_id || !month || !year) {
    return res.status(400).json({ success: false, error: 'เลขห้อง เดือน และปี เป็นข้อมูลที่จำเป็น' });
  }

try {
    // Check if invoice already exists for this room/month/year
    const existing = db.prepare('SELECT id FROM invoices WHERE room_id = ? AND month = ? AND year = ?').get(room_id, month, year);
    if (existing) {
      return res.status(409).json({ success: false, error: 'ใบแจ้งหนี้สำหรับห้องนี้ในเดือน/ปีนี้มีอยู่แล้ว' });
    }

    // Get room info
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (!room) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลห้อง' });
    }

    // Get meter readings from monthly_meter_readings (billing data)
    const monthlyReading = db.prepare('SELECT * FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
      .get(room_id, month, year);

    let electricUnits = 0;
    let waterUnits = 0;

    if (monthlyReading) {
      electricUnits = Math.max(0, (monthlyReading.electric_current || 0) - (monthlyReading.electric_before || 0));
      waterUnits = Math.max(0, (monthlyReading.water_current || 0) - (monthlyReading.water_before || 0));
    }

    const electricityCost = electricUnits * room.electric_rate;
    const waterCost = waterUnits * room.water_rate;
    const serviceCharge = room.service_charge != null ? room.service_charge : 100;
    const totalAmount = room.rental_price + electricityCost + waterCost + serviceCharge;

    // Generate invoice number (BUG-04 FIX: use YYYY format consistent with seed)
    const invoiceNumber = `INV-${String(year).padStart(4,'0')}${String(month).padStart(2, '0')}-${room.room_number}`;

    // Get tenant_id from room if not provided
    const finalTenantId = tenant_id || room.current_tenant_id || null;

    // Get payment_due_day from settings
    const settings = db.prepare('SELECT payment_due_day FROM settings LIMIT 1').get();
    const dueDay = settings?.payment_due_day || 2;
    const dueMonth = month + 1 > 12 ? 1 : month + 1;
    const dueYear = month + 1 > 12 ? year + 1 : year;
    const computedDueDate = due_date || `${String(dueYear).padStart(4, '0')}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    const result = db.prepare(`INSERT INTO invoices 
      (invoice_number, room_id, tenant_id, month, year, rental_price, electric_units, electric_rate, electricity_cost,
       water_units, water_rate, water_cost, service_charge, total_amount, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      invoiceNumber, room_id, finalTenantId, month, year,
      room.rental_price, Math.round(electricUnits * 100) / 100, room.electric_rate, Math.round(electricityCost * 100) / 100,
      Math.round(waterUnits * 100) / 100, room.water_rate, Math.round(waterCost * 100) / 100, serviceCharge, Math.round(totalAmount * 100) / 100,
      due_date || computedDueDate
    );

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid);
    // Set default status to 'pending' instead of 'draft'
    db.prepare("UPDATE invoices SET status = 'pending' WHERE id = ?").run(result.lastInsertRowid);
    res.status(201).json({ success: true, data: db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update invoice status/amounts
router.put('/:id', async (req, res) => {
  const db = getDb();
  const invoice_id = parseInt(req.params.id);
  
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });
  }

  const { due_date, status, notes } = req.body;
  
  const newDueDate = due_date !== undefined && due_date !== null ? due_date : existing.due_date;
  const newStatus = status !== undefined && status !== null ? status : existing.status;
  const newNotes = notes !== undefined && notes !== null ? notes : existing.notes;

  // BUG-01 FIX: Validate status before UPDATE to prevent sqlite CHECK constraint crash
  // Remove 'draft' from valid statuses — default is now 'pending'
  const validStatuses = ['paid','unpaid','sent','partially_paid','overdue', 'pending', 'draft'];
  if (newStatus !== existing.status && !validStatuses.includes(newStatus)) {
    return res.status(400).json({ success: false, error: 'สถานะไม่ถูกต้อง' });
  }

  try {
    db.prepare(`UPDATE invoices SET due_date=?, status=?, notes=? WHERE id=?`).run(
      newDueDate, newStatus, newNotes, invoice_id);

    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk generate invoices for all rooms in a given month/year
router.post('/generate-bulk', (req, res) => {
  const db = getDb();
  const { month, year, room_ids } = req.body;
  
  if (!month || !year) {
    return res.status(400).json({ success: false, error: 'เดือน และปี เป็นข้อมูลที่จำเป็น' });
  }

try {
    
    let roomsQuery = 'SELECT * FROM rooms WHERE 1=1';
    let params = [];
    
    if (room_ids) {
      const ids = Array.isArray(room_ids) ? room_ids : JSON.parse(room_ids);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        roomsQuery += ` AND id IN (${placeholders})`;
        params = [...ids];
      }
    } else {
      roomsQuery += ' AND status = \'occupied\'';
    }

    const rooms = db.prepare(roomsQuery).all(...params);
    const generated = [];

    for (const room of rooms) {
      // Skip if invoice already exists
      const existing = db.prepare('SELECT id FROM invoices WHERE room_id = ? AND month = ? AND year = ?').get(room.id, month, year);
      if (existing) continue;

      // Get meter readings from monthly_meter_readings (billing data)
      const monthlyReading = db.prepare('SELECT * FROM monthly_meter_readings WHERE room_id = ? AND month = ? AND year = ?')
        .get(room.id, month, year);

      let electricUnits = 0;
      let waterUnits = 0;

      if (monthlyReading) {
        electricUnits = Math.max(0, (monthlyReading.electric_current || 0) - (monthlyReading.electric_before || 0));
        waterUnits = Math.max(0, (monthlyReading.water_current || 0) - (monthlyReading.water_before || 0));
      }
      
      const electricityCost = electricUnits * room.electric_rate;
      const waterCost = waterUnits * room.water_rate;
    const serviceCharge = room.service_charge != null ? room.service_charge : 100;
    const totalAmount = room.rental_price + electricityCost + waterCost + serviceCharge;

    // Get payment_due_day from settings
    const settings = db.prepare('SELECT payment_due_day FROM settings LIMIT 1').get();
    const dueDay = settings?.payment_due_day || 2;
    const dueMonth = month + 1 > 12 ? 1 : month + 1;
    const dueYear = month + 1 > 12 ? year + 1 : year;
    const computedDueDate = due_date || `${String(dueYear).padStart(4, '0')}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      const invoiceNumber = `INV-${String(year).padStart(4,'0')}${String(month).padStart(2, '0')}-${room.room_number}`;

      const result = db.prepare(`INSERT INTO invoices 
        (invoice_number, room_id, tenant_id, month, year, rental_price, electric_units, electric_rate, electricity_cost,
         water_units, water_rate, water_cost, service_charge, total_amount, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        invoiceNumber, room.id, room.current_tenant_id || null, month, year,
        room.rental_price, Math.round(electricUnits * 100) / 100, room.electric_rate, Math.round(electricityCost * 100) / 100,
        Math.round(waterUnits * 100) / 100, room.water_rate, Math.round(waterCost * 100) / 100, serviceCharge, Math.round(totalAmount * 100) / 100,
        `${String(year).padStart(4, '0')}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}-07`
      );

      generated.push(db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid));
    }

    res.json({ success: true, data: generated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Delete invoice (cascades to payments)
router.delete('/:id', (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: 'Invalid invoice ID' });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  // Check for payments before deleting
  const paymentCount = db.prepare('SELECT COUNT(*) as cnt FROM payments WHERE invoice_id = ?').get(id).cnt;
  
  try {
    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    res.json({ success: true, message: `Deleted invoice ${invoice.invoice_number} (payments: ${paymentCount})` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
export default router;

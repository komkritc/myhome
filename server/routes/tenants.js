import { Router } from 'express';
import { getDb } from '../db/database.js';
import multer from 'multer';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, '..', '_data', 'uploads', 'tenants');
mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const ext = allowed.test(extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ หรือ PDF เท่านั้น'));
  }
});

/** @type {import('express').Router} */
const router = Router();

// Get all tenants
router.get('/', (req, res) => {
  const db = getDb();
  const { status, search } = req.query;
  
  let query = `SELECT tenants.*, rooms.room_number, rooms.floor 
               FROM tenants 
               LEFT JOIN contracts ON contracts.tenant_id = tenants.id AND contracts.status = 'active'
               LEFT JOIN rooms ON rooms.id = contracts.room_id`;
  let whereClause = [];
  let params = [];
  
  if (status) {
    whereClause.push('tenants.status = ?');
    params.push(status);
  }
  if (search && typeof search === 'string') {
    const searchText = `%${search}%`;
    whereClause.push('(tenants.first_name LIKE ? OR tenants.last_name LIKE ? OR tenants.phone LIKE ?)');
    params.push(searchText, searchText, searchText);
  }
  
  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';
  
  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get single tenant
router.get('/:id', (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้เช่า' });
  }

try {
    // Get contracts
    const contracts = db.prepare('SELECT * FROM contracts WHERE tenant_id = ? ORDER BY start_date DESC').all(tenant_id);
    
    // Get current room
    let currentRoom = null;
    const activeContract = contracts.find(c => c.status === 'active');
    if (activeContract) {
      currentRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(activeContract.room_id);
    }
    
    res.json({ success: true, data: tenant, contracts, currentRoom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create tenant
router.post('/', (req, res) => {
  const db = getDb();
  const { first_name, last_name, phone, email, id_card, notes, lease_start_date, lease_end_date } = req.body;
  
  if (!first_name || !last_name) {
    return res.status(400).json({ success: false, error: 'ชื่อและนามสกุลเป็นข้อมูลที่จำเป็น' });
  }

try {
    const result = db.prepare(`INSERT INTO tenants (first_name, last_name, phone, email, id_card, notes, lease_start_date, lease_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(first_name, last_name, phone || null, email || null, id_card || null, notes || null, lease_start_date || null, lease_end_date || null);
    
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update tenant
router.put('/:id', (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  
  const existing = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้เช่า' });
  }

  try {
    const { first_name, last_name, phone, email, id_card, status, notes, lease_start_date, lease_end_date } = req.body;
    
    db.prepare(`UPDATE tenants SET
      first_name = COALESCE(?, first_name),
      last_name = COALESCE(?, last_name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      id_card = COALESCE(?, id_card),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      lease_start_date = COALESCE(?, lease_start_date),
      lease_end_date = COALESCE(?, lease_end_date)
    WHERE id = ?`).run(first_name, last_name, phone, email, id_card, status, notes, lease_start_date, lease_end_date, tenant_id);
    
    const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create contract
router.post('/:id/contracts', (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  const { room_id, start_date, end_date } = req.body;
  
  if (!room_id || !start_date) {
    return res.status(400).json({ success: false, error: 'เลขห้องและวันเริ่มเช่าเป็นข้อมูลที่จำเป็น' });
  }

try {
    // Check if room is already occupied
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
    if (room.status === 'occupied') {
      return res.status(400).json({ success: false, error: 'ห้องนี้มีผู้เช่าอยู่แล้ว' });
    }

    // Get deposit from room
    const contract = db.prepare(`INSERT INTO contracts (room_id, tenant_id, start_date, end_date)
      VALUES (?, ?, ?, ?)`).run(room_id, tenant_id, start_date, end_date || null);
    
    // Update room status
    db.prepare('UPDATE rooms SET status = ?, current_tenant_id = ? WHERE id = ?').run('occupied', tenant_id, room_id);
    
    res.json({ success: true, data: contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Delete tenant (hard delete)
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id);
    
    // Check if tenant exists and get their data
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'ไม่พบผู้เช่า' });
    }
    
    // Clear any room pointing to this tenant
    db.prepare('UPDATE rooms SET current_tenant_id = NULL WHERE current_tenant_id = ?').run(id);
    
    // Delete uploaded document if exists
    if (tenant.document_path) {
      const filePath = join(uploadsDir, tenant.document_path);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
    
    // Delete the tenant
    db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /tenants/:id] error:', err);
    res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาด' });
  }
});

// Upload document for tenant
router.post('/:id/document', upload.single('document'), (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  
  const existing = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้เช่า' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'กรุณาเลือกไฟล์' });
  }

  try {
    // Delete old document if exists
    if (existing.document_path) {
      const oldPath = join(uploadsDir, existing.document_path);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    const filename = req.file.filename;
    db.prepare('UPDATE tenants SET document_path = ? WHERE id = ?').run(filename, tenant_id);
    
    const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve tenant documents
router.get('/:id/document', (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  
  const tenant = db.prepare('SELECT document_path FROM tenants WHERE id = ?').get(tenant_id);
  if (!tenant || !tenant.document_path) {
    return res.status(404).json({ success: false, error: 'ไม่พบเอกสาร' });
  }

  const filePath = join(uploadsDir, tenant.document_path);
  if (!existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'ไม่พบไฟล์เอกสาร' });
  }

  res.sendFile(filePath);
});

// Delete tenant document
router.delete('/:id/document', (req, res) => {
  const db = getDb();
  const tenant_id = parseInt(req.params.id);
  
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
  if (!tenant) {
    return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้เช่า' });
  }

  if (tenant.document_path) {
    const filePath = join(uploadsDir, tenant.document_path);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    db.prepare('UPDATE tenants SET document_path = NULL WHERE id = ?').run(tenant_id);
  }

  const updated = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
  res.json({ success: true, data: updated });
});

export default router;

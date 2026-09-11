import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Get all payments (with optional filters)
router.get('/', (req, res) => {
  const db = getDb();
  const results = db.prepare(`
    SELECT p.*, i.invoice_number, i.total_amount, i.status as invoice_status,
           r.room_number, t.first_name, t.last_name
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN rooms r ON i.room_id = r.id
    LEFT JOIN tenants t ON i.tenant_id = t.id`).all();

  res.json({ success: true, data: results });
});

// Get single payment
router.get('/:id', (req, res) => {
  const db = getDb();
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการชำระเงิน' });
  res.json({ success: true, data: payment });
});

// Create payment
router.post('/', (req, res) => {
  const db = getDb();
  const { invoice_id, amount, payment_method, notes } = req.body;

  if (!invoice_id || !amount || !payment_method) {
    return res.status(400).json({ success: false, error: 'เลขที่ใบแจ้งหนี้ จำนวนเงิน และวิธีการชำระ ต้องครบถ้วน' });
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice_id);
  if (!invoice) return res.status(404).json({ success: false, error: 'ไม่พบใบแจ้งหนี้' });

  const existingPayments = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE invoice_id = ?').get(invoice_id);
  if (existingPayments.total + amount > invoice.total_amount) {
    return res.status(400).json({ success: false, error: `จำนวนเงินชำระเกินยอดใบแจ้งหนี้` });
  }

  const result = db.prepare(`INSERT INTO payments (invoice_id, amount, payment_date, payment_method, notes)
    VALUES (?, ?, date('now'), ?, ?)`).run(invoice_id, amount, payment_method, notes || '');

  // Update invoice status
  let newStatus = invoice.status;
  if (existingPayments.total + amount >= invoice.total_amount) newStatus = 'paid';
  else if (existingPayments.total + amount > 0) newStatus = 'partially_paid';
  
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(newStatus, invoice_id);

  res.status(201).json({ success: true, data: result });
});

// Update payment
router.put('/:id', (req, res) => {
  const db = getDb();
  const payment_id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id);
  if (!existing) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการชำระเงิน' });

  const { amount, notes } = req.body;
  db.prepare('UPDATE payments SET amount=?, notes=? WHERE id=?').run(amount || existing.amount, notes || existing.notes, payment_id);

  // Recalc invoice status
  const totals = db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id = ?').get(existing.invoice_id);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(existing.invoice_id);
  if (totals.total >= invoice.total_amount) {
    db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ?").run(invoice.id);
  } else if (totals.total > 0) {
    db.prepare("UPDATE invoices SET status = 'partially_paid' WHERE id = ?").run(invoice.id);
  }

  res.json({ success: true, data: existing });
});

// Delete payment
router.delete('/:id', (req, res) => {
  const db = getDb();
  const payment_id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id);
  if (!existing) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลการชำระเงิน' });

  db.prepare('DELETE FROM payments WHERE id = ?').run(payment_id);
  res.json({ success: true, message: 'ลบข้อมูลการชำระเงินสำเร็จ' });
});

export default router;

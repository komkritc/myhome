import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// Expense categories with labels
const expenseCategories = {
  lawn_care: 'ดูแลสนาม/สวน',
  repair: 'ซ่อมแซม',
  housekeeping: 'ทำความสะอาด',
  common_electricity: 'ค่าไฟพื้นที่ส่วนกลาง',
  common_water: 'ค่าน้ำพื้นที่ส่วนกลาง',
  insurance: 'ประกัน',
  other: 'อื่นๆ',
};

// Get monthly expense summary (total by category) - must be before /:id
router.get('/summary', (req, res) => {
  const db = getDb();
  const { month, year } = req.query;

  let query = `SELECT category, SUM(amount) as total FROM expenses`;
  let whereClause = [];
  let params = [];

  if (month && year) {
    whereClause.push('strftime(\'%m\', expense_date) = ? AND strftime(\'%Y\', expense_date) = ?');
    params.push(String(month).padStart(2, '0'), String(year));
  }

  query += whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : '';
  query += ' GROUP BY category ORDER BY total DESC';

  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get monthly breakdown of expenses (grouped by month)
router.get('/summary/monthly', (req, res) => {
  const db = getDb();
  const { months } = req.query; // number of months to look back (default 6)
  const lookback = Number(months) || 6;

  const result = db.prepare(`
    SELECT strftime('%Y', expense_date) as year,
           strftime('%m', expense_date) as month,
           SUM(amount) as total,
           SUM(CASE WHEN category = 'lawn_care' THEN amount ELSE 0 END) as lawn_care,
           SUM(CASE WHEN category = 'repair' THEN amount ELSE 0 END) as repair,
           SUM(CASE WHEN category = 'housekeeping' THEN amount ELSE 0 END) as housekeeping,
           SUM(CASE WHEN category = 'common_electricity' THEN amount ELSE 0 END) as common_electricity,
           SUM(CASE WHEN category = 'common_water' THEN amount ELSE 0 END) as common_water,
           SUM(CASE WHEN category = 'insurance' THEN amount ELSE 0 END) as insurance,
           SUM(CASE WHEN category = 'other' THEN amount ELSE 0 END) as other
    FROM expenses
    WHERE expense_date >= date('now', '-' || ? || ' months', 'start of month')
    GROUP BY strftime('%Y-%m', expense_date)
    ORDER BY year DESC, month DESC
  `).all(lookback);

  res.json({ success: true, data: result });
});

// Get all expenses (with optional filters)
router.get('/', (req, res) => {
  const db = getDb();
  const { category, month, year } = req.query;

  let query = 'SELECT * FROM expenses';
  let whereClause = [];
  let params = [];

  if (category && typeof category === 'string') {
    whereClause.push('category = ?');
    params.push(category);
  }
  if (month && year) {
    whereClause.push('strftime(\'%m\', expense_date) = ? AND strftime(\'%Y\', expense_date) = ?');
    params.push(String(month).padStart(2, '0'), String(year));
  }

  if (whereClause.length > 0) {
    query += ' WHERE ' + whereClause.join(' AND ');
  }
  query += ' ORDER BY expense_date DESC';

  const result = db.prepare(query).all(...params);
  res.json({ success: true, data: result });
});

// Get single expense by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลค่าใช้จ่าย' });
  res.json({ success: true, data: expense });
});

// Create new expense
router.post('/', (req, res) => {
  const db = getDb();
  const { category, amount, expense_date, description } = req.body;

  if (!category || !amount || !expense_date) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกหมวดหมู่ จำนวนเงิน และวันที่' });
  }

  const insert = db.prepare('INSERT INTO expenses (category, amount, expense_date, description) VALUES (@category, @amount, @expense_date, @description)');
  const result = insert.run({ category, amount, expense_date, description: description || null });
  const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: newExpense });
});

// Update expense
router.put('/:id', (req, res) => {
  const db = getDb();
  const expense_id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expense_id);
  if (!existing) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลค่าใช้จ่าย' });

  const { category, amount, expense_date, description } = req.body;
  const updated_data = {
    category: category !== undefined ? category : null,
    amount: amount !== undefined ? amount : null,
    expense_date: expense_date || null,
    description: description !== undefined ? description : null,
    id: expense_id,
  };
  db.prepare('UPDATE expenses SET category = COALESCE(@category, category), amount = COALESCE(@amount, amount), expense_date = COALESCE(@expense_date, expense_date), description = COALESCE(@description, description), updated_at = datetime(\'now\') WHERE id = @id').run(updated_data);

  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expense_id);
  res.json({ success: true, data: updated });
});

// Delete expense
router.delete('/:id', (req, res) => {
  const db = getDb();
  const expense_id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expense_id);
  if (!existing) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลค่าใช้จ่าย' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(expense_id);
  res.json({ success: true, message: 'ลบข้อมูลค่าใช้จ่ายเรียบร้อยแล้ว' });
});

export default router;

import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/stats', (_req, res) => {
  const db = getDb();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const roomStats = db.prepare(`
    SELECT COUNT(*) as total,
           SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
           SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
           SUM(CASE WHEN status='booked' THEN 1 ELSE 0 END) as booked,
           SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) as maintenance
    FROM rooms`).get();

  const currentMonthIncome = db.prepare(`
    SELECT COALESCE(SUM(r.rental_price),0) as rental_income,
           COALESCE(SUM(i.electricity_cost),0) as electric_income,
           COALESCE(SUM(i.water_cost),0) as water_income,
           COALESCE(SUM(i.service_charge),0) as service_income,
           COALESCE(SUM(i.total_amount),0) as total_income
    FROM rooms r
    LEFT JOIN invoices i ON i.room_id = r.id AND i.month = ? AND i.year = ?
    WHERE r.status = 'occupied'
  `).get(currentMonth, currentYear);

  const outstanding = db.prepare(`
    SELECT COUNT(*) as rooms_count, COALESCE(SUM(i.total_amount - COALESCE(paid.total_paid, 0)), 0) as total_outstanding
    FROM invoices i LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid ON i.id = paid.invoice_id
    WHERE i.status IN ('draft','pending','partially_paid','unpaid','sent')`).get();

  const overdue = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total_overdue
    FROM invoices WHERE status IN ('draft','pending','partially_paid','unpaid','sent') AND due_date < date('now')`).get();

  const pendingRooms = db.prepare(`
    SELECT i.id, i.total_amount, r.room_number, t.first_name || ' ' || t.last_name as tenant_name
    FROM invoices i
    LEFT JOIN rooms r ON i.room_id = r.id
    LEFT JOIN tenants t ON i.tenant_id = t.id
    WHERE ((i.month=? AND i.year=?) OR i.due_date < date('now'))
      AND (i.status IN ('draft','pending','partially_paid','unpaid','sent'))
    GROUP BY i.room_id ORDER BY i.total_amount DESC LIMIT 5
  `).all(currentMonth, currentYear);

  const recentPayments = db.prepare(`
    SELECT p.*, i.invoice_number, i.total_amount, i.status AS invoice_status, r.room_number 
    FROM payments p JOIN invoices i ON p.invoice_id=i.id LEFT JOIN rooms r ON i.room_id=r.id
    ORDER BY p.payment_date DESC LIMIT 10`).all();

  res.json({ success: true, data: { roomStats, currentMonthIncome, outstandingBalances: outstanding || {}, overdueCounts: overdue || {}, pendingRooms: pendingRooms || [], recentPayments: recentPayments || [] } });
});

router.get('/monthly-income', (req, res) => {
  const db = getDb();
  const query = req.query;
  let startMonth, startYear, endMonth, endYear;
  
  if (query.start_month && query.start_year && query.end_month && query.end_year) {
    startMonth = Number(query.start_month);
    startYear = Number(query.start_year);
    endMonth = Number(query.end_month);
    endYear = Number(query.end_year);
  } else {
    const now = new Date();
    startMonth = 1;
    startYear = now.getFullYear();
    endMonth = now.getMonth() + 1;
    endYear = now.getFullYear();
  }

  const startKey = startYear * 100 + startMonth;
  const endKey = endYear * 100 + endMonth;

  const income = db.prepare(`
    SELECT year, month,
           COALESCE(SUM(rental_price),0) as rental_income,
           COALESCE(SUM(electricity_cost),0) as electric_income,
           COALESCE(SUM(water_cost),0) as water_income,
           COALESCE(SUM(service_charge),0) as service_income,
           COALESCE(SUM(total_amount),0) as total_income
    FROM invoices 
    WHERE (year * 100 + month) >= ? AND (year * 100 + month) <= ?
    GROUP BY year, month`).all(startKey, endKey);

  const expenses = db.prepare(`
    SELECT CAST(strftime('%Y', expense_date) AS INTEGER) as year,
           CAST(strftime('%m', expense_date) AS INTEGER) as month,
           COALESCE(SUM(amount),0) as total_expenses
    FROM expenses
    WHERE (CAST(strftime('%Y', expense_date) AS INTEGER) * 100 + CAST(strftime('%m', expense_date) AS INTEGER)) >= ?
      AND (CAST(strftime('%Y', expense_date) AS INTEGER) * 100 + CAST(strftime('%m', expense_date) AS INTEGER)) <= ?
    GROUP BY year, month`).all(startKey, endKey);

  const expMap = {};
  for (const e of expenses) { expMap[`${e.year}-${e.month}`] = e.total_expenses; }

  const result = income.map(row => ({
    ...row,
    expenses: expMap[`${row.year}-${row.month}`] || 0,
    net_income: Number(row.total_income) - (expMap[`${row.year}-${row.month}`] || 0),
  })).sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  res.json({ success: true, data: result });
});

router.get('/occupancy', (_req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT COUNT(*) as total_rooms,
           SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied_rooms,
           SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available_rooms,
           ROUND(CAST(SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as occupancy_rate
    FROM rooms`).get();

  res.json({ success: true, data: stats });
});

router.get('/debtors', (_req, res) => {
  const db = getDb();
const result = db.prepare(`
SELECT r.id as room_id, max(r.room_number) as room_number,
       COALESCE(t.first_name || ' ' || t.last_name, 'ยังไม่มีผู้เช่า') as tenant_name,
       MAX(i.total_amount - COALESCE(paid.total_paid,0)) as amount_due,
       MIN(i.due_date) as due_date
FROM invoices i LEFT JOIN rooms r ON i.room_id=r.id
LEFT JOIN tenants t ON i.tenant_id=t.id
LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid ON i.id=paid.invoice_id
WHERE i.status IN ('sent', 'partially_paid')
GROUP BY r.id HAVING amount_due > 0 ORDER BY amount_due DESC
`).all();

  res.json({ success: true, data: result });
});

// Projected income: what we expect to collect this month from occupied rooms
router.get('/projected-income', (_req, res) => {
  const db = getDb();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Projected income from occupied rooms (rental + service + estimated utilities)
  const projected = db.prepare(`
    SELECT 
      COALESCE(SUM(r.rental_price), 0) as projected_rental,
      COALESCE(SUM(r.service_charge), 0) as projected_service,
      COUNT(*) as occupied_rooms
    FROM rooms r WHERE r.status = 'occupied'
  `).get();

  // Estimated utility costs from current month meter readings (or previous month as fallback)
  const estimatedUtilities = db.prepare(`
    SELECT 
      COALESCE(SUM(
        CASE WHEN mcr.electric_current > 0 AND mcr.electric_before >= 0 
          THEN (mcr.electric_current - mcr.electric_before) * r.electric_rate ELSE 0 END
      ), 0) as est_electric,
      COALESCE(SUM(
        CASE WHEN mcr.water_current > 0 AND mcr.water_before >= 0 
          THEN (mcr.water_current - mcr.water_before) * r.water_rate ELSE 0 END
      ), 0) as est_water
    FROM rooms r 
    LEFT JOIN monthly_meter_readings mcr ON r.id = mcr.room_id 
      AND mcr.month = ? AND mcr.year = ?
    WHERE r.status = 'occupied'
  `).get(currentMonth, currentYear);

  // If no current month readings, use previous month as estimate
  let estElectric = estimatedUtilities.est_electric || 0;
  let estWater = estimatedUtilities.est_water || 0;
  if (estElectric === 0 && estWater === 0) {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevEst = db.prepare(`
      SELECT 
        COALESCE(SUM(
          CASE WHEN mcr.electric_current > 0 AND mcr.electric_before >= 0 
            THEN (mcr.electric_current - mcr.electric_before) * r.electric_rate ELSE 0 END
        ), 0) as est_electric,
        COALESCE(SUM(
          CASE WHEN mcr.water_current > 0 AND mcr.water_before >= 0 
            THEN (mcr.water_current - mcr.water_before) * r.water_rate ELSE 0 END
        ), 0) as est_water
      FROM rooms r 
      LEFT JOIN monthly_meter_readings mcr ON r.id = mcr.room_id 
        AND mcr.month = ? AND mcr.year = ?
      WHERE r.status = 'occupied'
    `).get(prevMonth, prevYear);
    estElectric = prevEst.est_electric || 0;
    estWater = prevEst.est_water || 0;
  }

  // Actual income collected this month
  const actual = db.prepare(`
    SELECT 
      COALESCE(SUM(i.rental_price), 0) as actual_rental,
      COALESCE(SUM(i.electricity_cost), 0) as actual_electric,
      COALESCE(SUM(i.water_cost), 0) as actual_water,
      COALESCE(SUM(i.service_charge), 0) as actual_service,
      COALESCE(SUM(i.total_amount), 0) as actual_total
    FROM invoices i WHERE i.month = ? AND i.year = ?
  `).get(currentMonth, currentYear);

  // Payments received this month
  const payments = db.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as total_received
    FROM payments p WHERE strftime('%m', p.payment_date) = ? AND strftime('%Y', p.payment_date) = ?
  `).all(String(currentMonth).padStart(2, '0'), String(currentYear));

  const totalReceived = payments.length > 0 ? payments[0].total_received : 0;

  // Outstanding balance
  const outstanding = db.prepare(`
    SELECT COALESCE(SUM(i.total_amount - COALESCE(paid.total_paid, 0)), 0) as total_outstanding
    FROM invoices i 
    LEFT JOIN (SELECT invoice_id, SUM(amount) AS total_paid FROM payments GROUP BY invoice_id) paid ON i.id = paid.invoice_id
    WHERE i.status IN ('draft','pending','partially_paid','unpaid','sent')
  `).get();

  // Expenses this month
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses WHERE strftime('%m', expense_date) = ? AND strftime('%Y', expense_date) = ?
  `).get(String(currentMonth).padStart(2, '0'), String(currentYear));

  // Monthly income trend (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const trend = months.map(({ month, year }) => {
    const inc = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as income
      FROM invoices WHERE month = ? AND year = ?
    `).get(month, year);
    const exp = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as expenses
      FROM expenses WHERE strftime('%m', expense_date) = ? AND strftime('%Y', expense_date) = ?
    `).all(String(month).padStart(2, '0'), String(year));
    const pmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as received
      FROM payments WHERE strftime('%m', payment_date) = ? AND strftime('%Y', payment_date) = ?
    `).all(String(month).padStart(2, '0'), String(year));
    return {
      month,
      year,
      income: inc?.income || 0,
      expenses: exp.length > 0 ? exp[0].expenses : 0,
      received: pmt.length > 0 ? pmt[0].received : 0,
    };
  });

  // Income by category (current month)
  const byCategory = db.prepare(`
    SELECT 
      COALESCE(SUM(rental_price), 0) as rental,
      COALESCE(SUM(electricity_cost), 0) as electric,
      COALESCE(SUM(water_cost), 0) as water,
      COALESCE(SUM(service_charge), 0) as service
    FROM invoices WHERE month = ? AND year = ?
  `).get(currentMonth, currentYear);

  res.json({
    success: true,
    data: {
      projected: {
        rental: projected.projected_rental || 0,
        service: projected.projected_service || 0,
        electric: estElectric,
        water: estWater,
        total: (projected.projected_rental || 0) + (projected.projected_service || 0) + estElectric + estWater,
        occupied_rooms: projected.occupied_rooms || 0,
      },
      actual: {
        rental: actual.actual_rental || 0,
        electric: actual.actual_electric || 0,
        water: actual.actual_water || 0,
        service: actual.actual_service || 0,
        total: actual.actual_total || 0,
      },
      received: totalReceived,
      outstanding: outstanding.total_outstanding || 0,
      expenses: expenses.total_expenses || 0,
      netProfit: totalReceived - (expenses.total_expenses || 0),
      trend,
      byCategory: {
        rental: byCategory.rental || 0,
        electric: byCategory.electric || 0,
        water: byCategory.water || 0,
        service: byCategory.service || 0,
      },
    },
  });
});

export default router;

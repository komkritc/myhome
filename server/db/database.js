import Database from 'better-sqlite3';
import { join } from 'path';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(resolve(__dirname, '..', '_data'), 'dormitory.db');

let dbInstance;

export function getDbPath() {
  return DB_PATH;
}

export function reinitDb() {
  if (dbInstance) {
    try { dbInstance.close(); } catch {}
  }
  dbInstance = null;
  return getDb();
}

export function getDb() {
  if (!dbInstance) {
    const dbDir = resolve(__dirname, '..', '_data');
    mkdirSync(dbDir, { recursive: true });
    dbInstance = new Database(join(dbDir, 'dormitory.db'));
    dbInstance.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return dbInstance;
}

// Default export for convenience
let defaultDB;
export function getDefaultDb() {
  if (!defaultDB) {
    defaultDB = getDb();
  }
  return defaultDB;
}

function initializeSchema() {
  console.log('🗃️ Initializing database schema...');
  
  // Create tables
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      dorm_name TEXT DEFAULT 'หอพักของฉัน',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      tax_id TEXT DEFAULT '',
      default_electric_rate REAL DEFAULT 8.0,
      default_water_rate REAL DEFAULT 18.0,
      default_service_charge REAL DEFAULT 100.0,
      default_security_deposit REAL DEFAULT 2000.0,
      payment_due_day INTEGER DEFAULT 7,
      email TEXT DEFAULT '',
      currency_symbol TEXT DEFAULT '฿',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      floor INTEGER DEFAULT 1,
      status TEXT DEFAULT 'available' CHECK(status IN ('available','occupied','booked','maintenance')),
      rental_price REAL DEFAULT 3500.0 CHECK (rental_price >= 0),
      electric_rate REAL DEFAULT 8.0 CHECK (electric_rate >= 0),
      water_rate REAL DEFAULT 18.0 CHECK (water_rate >= 0),
      service_charge REAL DEFAULT 100.0 CHECK (service_charge >= 0),
      security_deposit REAL DEFAULT 2000.0 CHECK (security_deposit >= 0),
      description TEXT,
      current_tenant_id INTEGER,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      
      FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      id_card TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      security_deposit REAL DEFAULT 2000.0 CHECK (security_deposit >= 0),
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')),
      
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS meters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      meter_type TEXT NOT NULL CHECK (meter_type IN ('electricity', 'water')),
      device_id TEXT UNIQUE NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kWh',
      api_key TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
      installed_at DATETIME DEFAULT (datetime('now')),
      last_seen_at DATETIME,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meter_id INTEGER NOT NULL,
      reading REAL NOT NULL CHECK (reading >= 0),
      reading_time DATETIME NOT NULL DEFAULT (datetime('now')),
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (meter_id) REFERENCES meters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      electric_before REAL,
      water_before REAL,
      electric_current REAL,
      water_current REAL,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      UNIQUE(room_id, month, year),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      room_id INTEGER NOT NULL,
      tenant_id INTEGER,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      rental_price REAL DEFAULT 0 CHECK (rental_price >= 0),
      electric_units REAL DEFAULT 0,
      electric_rate REAL DEFAULT 0 CHECK (electric_rate >= 0),
      electricity_cost REAL DEFAULT 0 CHECK (electricity_cost >= 0),
      water_units REAL DEFAULT 0,
      water_rate REAL DEFAULT 0 CHECK (water_rate >= 0),
      water_cost REAL DEFAULT 0 CHECK (water_cost >= 0),
      service_charge REAL DEFAULT 0 CHECK (service_charge >= 0),
      total_amount REAL DEFAULT 0 CHECK (total_amount >= 0),
      due_date DATE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','paid','partially_paid','unpaid','overdue')),
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now')),
      
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      payment_date DATE NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('lawn_care','repair','housekeeping','common_electricity','common_water','insurance','other')),
      amount REAL NOT NULL CHECK(amount >= 0),
      expense_date DATE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Add new columns to tenants table if they don't exist
  const tenantColumns = dbInstance.prepare("PRAGMA table_info(tenants)").all().map(c => c.name);
  if (!tenantColumns.includes('lease_start_date')) {
    dbInstance.exec("ALTER TABLE tenants ADD COLUMN lease_start_date TEXT");
  }
  if (!tenantColumns.includes('lease_end_date')) {
    dbInstance.exec("ALTER TABLE tenants ADD COLUMN lease_end_date TEXT");
  }
  if (!tenantColumns.includes('document_path')) {
    dbInstance.exec("ALTER TABLE tenants ADD COLUMN document_path TEXT");
  }

  // Initialize default settings if not exists
  const existing = dbInstance.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (existing.count === 0) {
    dbInstance.prepare(`INSERT INTO settings 
      (dorm_name, address, phone, default_electric_rate, default_water_rate, 
       default_service_charge, default_security_deposit, payment_due_day, email, currency_symbol)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'หอพักของฉัน', '', '', 8.0, 18.0, 100.0, 2000.0, 7, '', '฿'
    );
    console.log('✅ Default settings created');
  }

  // Seed initial rooms if not exists
  const roomCount = dbInstance.prepare('SELECT COUNT(*) as count FROM rooms').get();
  if (roomCount.count === 0) {
    seedRooms();
  }

  // Seed initial expenses if not exists
  const expenseCount = dbInstance.prepare('SELECT COUNT(*) as count FROM expenses').get();
  if (expenseCount.count === 0) {
    seedExpenses();
  }
}

function seedRooms() {
  console.log('🌱 Seeding initial data...');
  
  const roomTypes = [
    { number: '01', floor: 1, price: 3500, electricRate: 8.0, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '02', floor: 1, price: 3800, electricRate: 8.0, waterRate: 20.0, service: 100, deposit: 2500 },
    { number: '03', floor: 1, price: 3500, electricRate: 7.5, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '04', floor: 1, price: 4000, electricRate: 8.0, waterRate: 18.0, service: 150, deposit: 2500 },
    { number: '05', floor: 2, price: 3600, electricRate: 7.5, waterRate: 19.0, service: 100, deposit: 2000 },
    { number: '06', floor: 2, price: 3800, electricRate: 8.0, waterRate: 20.0, service: 100, deposit: 2500 },
    { number: '07', floor: 2, price: 3500, electricRate: 8.0, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '08', floor: 3, price: 4200, electricRate: 9.0, waterRate: 22.0, service: 150, deposit: 3000 },
  ];

  const insertRoom = dbInstance.prepare(`INSERT INTO rooms 
    (room_number, floor, status, rental_price, electric_rate, water_rate, 
     service_charge, security_deposit, description)
    VALUES (@number, @floor, 'available', @price, @electricRate, @waterRate, @service, @deposit, @desc)`);

  const insertTenant = dbInstance.prepare(`INSERT INTO tenants (first_name, last_name, phone, email, id_card, status, notes, lease_start_date, lease_end_date) 
    VALUES (@first, @last, @phone, @email, @idCard, @status, @notes, @leaseStart, @leaseEnd)`);

  for (const room of roomTypes) {
    let tenantId = null;
    
    const idx = roomTypes.indexOf(room);
    const tenants = [
      { first: 'สมชาย', last: 'วงศ์อมร', phone: '0812345678', email: 'somchai.w@gmail.com', idCard: '3100100123456', status: 'active', notes: 'ผู้เช่าประจำ ชำระเงินตรงเวลา', leaseStart: '2025-01-01', leaseEnd: '2026-01-01' },
      { first: 'กมลวรรณ', last: 'สุขสวัสดิ์', phone: '0898765432', email: 'kamolwan.s@gmail.com', idCard: '3100100234567', status: 'active', notes: 'ผู้เช่าใหม่ เข้าพักเดือนแรก', leaseStart: '2025-08-01', leaseEnd: '2025-11-01' },
      { first: 'พิชัย', last: 'มงคลสุข', phone: '0876543210', email: 'pichai.m@hotmail.com', idCard: '3100100345678', status: 'active', notes: 'เช่ามา 2 ปี ต่อสัญญาทุกปี', leaseStart: '2024-06-01', leaseEnd: '2026-06-01' },
      { first: 'อรุณี', last: 'เจริญผล', phone: '0855556666', email: 'arunee.j@yahoo.com', idCard: '3100100456789', status: 'active', notes: 'ทำงานโรงงาน กลับดึก', leaseStart: '2025-03-01', leaseEnd: '2026-03-01' },
      { first: 'สุรศักดิ์', last: 'พิทักษ์วงศ์', phone: '0833334444', email: 'surasak.p@gmail.com', idCard: '3100100567890', status: 'active', notes: 'มีรถมอเตอร์ไซค์ จอดที่ลานจอด', leaseStart: '2025-02-01', leaseEnd: '2026-02-01' },
      { first: 'พิมพ์ใจ', last: 'ชัยชนะ', phone: '0822221111', email: 'pimjai.c@gmail.com', idCard: '3100100678901', status: 'active', notes: 'นักศึกษาฝึกงาน 3 เดือน', leaseStart: '2025-07-01', leaseEnd: '2025-10-01' },
      { first: 'ธนากร', last: 'ศรีสุข', phone: '0811110000', email: 'thanakorn.s@hotmail.com', idCard: '3100100789012', status: 'active', notes: 'ย้ายเข้าเดือนหน้า มีสัตว์เลี้ยง (แมว)', leaseStart: '2025-09-01', leaseEnd: '2026-09-01' },
      { first: 'วิภาวดี', last: 'วรรณวงศ์', phone: '0844445555', email: 'wipawadee.w@gmail.com', idCard: '3100100890123', status: 'active', notes: 'พยาบาล ทำงานเป็นผลัด', leaseStart: '2025-04-01', leaseEnd: '2026-04-01' },
    ];
    
    tenantId = insertTenant.run({ 
      first: tenants[idx].first, 
      last: tenants[idx].last, 
      phone: tenants[idx].phone,
      email: tenants[idx].email,
      idCard: tenants[idx].idCard,
      status: tenants[idx].status,
      notes: tenants[idx].notes,
      leaseStart: tenants[idx].leaseStart,
      leaseEnd: tenants[idx].leaseEnd
    });

    // IMPORTANT: Room MUST be inserted BEFORE linking child records
    const roomResult = insertRoom.run({
      number: room.number,
      floor: room.floor,
      price: room.price,
      electricRate: room.electricRate,
      waterRate: room.waterRate,
      service: room.service,
      deposit: room.deposit,
      desc: 'ห้องมาตรฐาน (มีผู้เช่า)'
    });
    const roomId = roomResult.lastInsertRowid;

    // Now create contract with correct roomId and tenantId
    dbInstance.prepare(`INSERT INTO contracts (room_id, tenant_id, start_date) VALUES (@rid, @tid, date('now', '-1 month'))`).run(
      { rid: roomId, tid: tenantId.lastInsertRowid }
    );

    // Create sample meter readings for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Create meters for this room
    const elecMeter = dbInstance.prepare(`INSERT INTO meters (room_id, meter_type, device_id, unit, api_key, status)
      VALUES (?, 'electricity', ?, 'kWh', ?, 'active')`).run(roomId, `ELEC-R${room.number}`, `elec-key-${room.number}`);
    const waterMeter = dbInstance.prepare(`INSERT INTO meters (room_id, meter_type, device_id, unit, api_key, status)
      VALUES (?, 'water', ?, 'm3', ?, 'active')`).run(roomId, `WATER-R${room.number}`, `water-key-${room.number}`);

    // Seed some historical readings for this month
    const baseElec = 1000 + Math.floor(Math.random() * 200);
    const baseWater = 400 + Math.floor(Math.random() * 50);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const readingDays = Math.min(5, daysInMonth);

    for (let d = 1; d <= readingDays; d++) {
      const progress = d / daysInMonth;
      const elecReading = baseElec + (50 * progress) + (Math.random() * 5);
      const waterReading = baseWater + (20 * progress) + (Math.random() * 2);
      const readTime = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}T08:00:00`;
      dbInstance.prepare(`INSERT INTO meter_readings (meter_id, reading, reading_time) VALUES (?, ?, ?)`)
        .run(elecMeter.lastInsertRowid, Math.round(elecReading * 100) / 100, readTime);
      dbInstance.prepare(`INSERT INTO meter_readings (meter_id, reading, reading_time) VALUES (?, ?, ?)`)
        .run(waterMeter.lastInsertRowid, Math.round(waterReading * 100) / 100, readTime);
    }

    // Get meter readings for billing calculation
    const lastElecReading = dbInstance.prepare(`SELECT reading FROM meter_readings WHERE meter_id = ? ORDER BY reading_time DESC LIMIT 1`).get(elecMeter.lastInsertRowid);
    const lastWaterReading = dbInstance.prepare(`SELECT reading FROM meter_readings WHERE meter_id = ? ORDER BY reading_time DESC LIMIT 1`).get(waterMeter.lastInsertRowid);
    
    // Get first reading of month for "before" value
    const firstElecReading = dbInstance.prepare(`SELECT reading FROM meter_readings WHERE meter_id = ? AND strftime('%Y-%m', reading_time) = ? ORDER BY reading_time ASC LIMIT 1`)
      .get(elecMeter.lastInsertRowid, `${currentYear}-${String(currentMonth).padStart(2,'0')}`);
    const firstWaterReading = dbInstance.prepare(`SELECT reading FROM meter_readings WHERE meter_id = ? AND strftime('%Y-%m', reading_time) = ? ORDER BY reading_time ASC LIMIT 1`)
      .get(waterMeter.lastInsertRowid, `${currentYear}-${String(currentMonth).padStart(2,'0')}`);

    const electricUnits = lastElecReading && firstElecReading ? Math.max(0, lastElecReading.reading - firstElecReading.reading) : 50;
    const waterUnits = lastWaterReading && firstWaterReading ? Math.max(0, lastWaterReading.reading - firstWaterReading.reading) : 10;
    const electricityCost = electricUnits * 8.0;
    const waterCost = waterUnits * 18.0;

    // Create sample invoice for current month with correct roomId and tenantId
    dbInstance.prepare(`INSERT INTO invoices (invoice_number, room_id, tenant_id, month, year, 
      rental_price, electric_units, electric_rate, electricity_cost, water_units, water_rate, water_cost, 
      service_charge, total_amount, due_date, status)
      VALUES (@inv, @rid, @tid, @m, @y, @rental, @eu, @elrate, @ecost, @wu, @watrate, @wcost, @svc, @total, date('now', '+7 days'), 'unpaid')`).run(
      { 
        inv: `INV-${String(currentYear).slice(-2)}${String(currentMonth).padStart(2,'0')}-${room.number}`,
        rid: roomId,
        tid: tenantId.lastInsertRowid,
        m: currentMonth,
        y: currentYear,
        rental: room.price,
        eu: Math.round(electricUnits * 100) / 100,
        elrate: 8.0,
        ecost: Math.round(electricityCost * 100) / 100,
        wu: Math.round(waterUnits * 100) / 100,
        watrate: 18.0,
        wcost: Math.round(waterCost * 100) / 100,
        svc: room.service,
        total: room.price + electricityCost + waterCost + room.service
      }
    );

    // Update room status with correct IDs
    dbInstance.prepare('UPDATE rooms SET status = ?, current_tenant_id = ? WHERE id = ?').run(
      'occupied', tenantId.lastInsertRowid, roomId
    );
  }

  console.log('✅ Initial data seeded successfully');
}

function seedExpenses() {
  console.log('🌱 Seeding expenses...');
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const expenses = [
    { category: 'lawn_care', amount: 1500, day: 5, desc: 'ดูแลสนามเดือนปัจจุบัน' },
    { category: 'repair', amount: 3200, day: 8, desc: 'ซ่อมแอร์ห้อง 03' },
    { category: 'housekeeping', amount: 2800, day: 10, desc: 'ค่าทำความสะอาดพื้นที่ส่วนกลาง' },
    { category: 'common_electricity', amount: 4500, day: 12, desc: 'ค่าไฟฟ้าพื้นที่ส่วนกลาง' },
    { category: 'common_water', amount: 900, day: 12, desc: 'ค่าน้ำพื้นที่ส่วนกลาง' },
    { category: 'insurance', amount: 2100, day: 15, desc: 'ประกันอาคารประจำเดือน' },
    { category: 'other', amount: 650, day: 18, desc: 'ค่าอุปกรณ์ทำความสะอาด' },
    { category: 'repair', amount: 1200, day: 20, desc: 'ซ่อมประตูรั้ว' },
    { category: 'lawn_care', amount: 1500, day: 5, desc: 'ดูแลสนามเดือนก่อนหน้า' },
    { category: 'housekeeping', amount: 2800, day: 10, desc: 'ค่าทำความสะอาดเดือนก่อนหน้า' },
    { category: 'common_electricity', amount: 4200, day: 12, desc: 'ค่าไฟฟ้าส่วนกลางเดือนก่อนหน้า' },
    { category: 'common_water', amount: 850, day: 12, desc: 'ค่าน้ำส่วนกลางเดือนก่อนหน้า' },
    { category: 'lawn_care', amount: 1500, day: 5, desc: 'ดูแลสนามสองเดือนก่อนหน้า' },
    { category: 'repair', amount: 1800, day: 10, desc: 'ซ่อมลิฟต์ประจำเดือน' },
    { category: 'housekeeping', amount: 3200, day: 15, desc: 'ทำความสะอาดสระว่ายน้ำ' },
    { category: 'common_electricity', amount: 5200, day: 20, desc: 'ค่าไฟลิฟต์และปั๊มน้ำ' },
    { category: 'common_water', amount: 1100, day: 22, desc: 'ค่าน้ำสระและรดน้ำต้นไม้' },
    { category: 'insurance', amount: 2100, day: 1, desc: 'ประกันอัคคีภัย เดือนปัจจุบัน' },
    { category: 'other', amount: 850, day: 8, desc: 'ค่าไฟฉายฉุกเฉิน' },
    { category: 'repair', amount: 2400, day: 12, desc: 'ซ่อมหลังคารั่วห้อง 05' },
    { category: 'lawn_care', amount: 1800, day: 15, desc: 'ตัดหญ้าและปรับภูมิทัศน์' },
    { category: 'common_electricity', amount: 4800, day: 25, desc: 'ค่าไฟโคมไฟหน้าหอพัก' },
    { category: 'repair', amount: 976.5, day: 28, desc: 'ซ่อมห้องน้ำห้อง 07' },
  ];

  const insert = dbInstance.prepare('INSERT INTO expenses (category, amount, expense_date, description) VALUES (?, ?, ?, ?)');
  for (const e of expenses) {
    const date = new Date(y, m, e.day);
    insert.run(e.category, e.amount, date.toISOString().slice(0, 10), e.desc);
  }
  console.log('✅ Expenses seeded');
}

export function closeDb() {
  if (dbInstance) dbInstance.close();
}

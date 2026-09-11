import type { Room, Tenant, Invoice, MeterReading, Payment, DashboardData, Debtor, OccupancyStats, MonthlyIncome, Settings } from '../types';

const API_BASE = '/api';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface MessageResponse {
  success: true;
  message: string;
}

async function request<T extends SuccessResponse<unknown> | MessageResponse>(path: string, options?: RequestInit): Promise<T> {
  if (isMock()) return mockRequest(path, options) as Promise<T>;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  return response.json();
}
const MOCK_KEY = '__mock';

// --- Mock Data (mirrors seed data in server/db/database.js) ---

interface MRoom {
  id: number; room_number: string; floor: number; status: string;
  rental_price: number; electric_rate: number; water_rate: number;
  service_charge: number; security_deposit: number; description: string | null;
  current_tenant_id: number | null;
}

interface MReading {
  id: number; room_id: number; month: number; year: number;
  electric_before: number; water_before: number;
  electric_current: number; water_current: number; notes: string | null;
  room_number?: string;
}

const now = new Date();
const curMonth = now.getMonth() + 1;
const curYear = now.getFullYear();

const mockRooms: MRoom[] = [
  { id:1, room_number:'01', floor:1, status:'occupied', rental_price:3500, electric_rate:8.0, water_rate:18, service_charge:100, security_deposit:2000, description:'ห้องมาตรฐาน', current_tenant_id:1 },
  { id:2, room_number:'02', floor:1, status:'occupied', rental_price:3800, electric_rate:8.0, water_rate:20, service_charge:100, security_deposit:2500, description:'ห้องมาตรฐาน', current_tenant_id:2 },
  { id:3, room_number:'03', floor:1, status:'occupied', rental_price:3500, electric_rate:7.5, water_rate:18, service_charge:100, security_deposit:2000, description:'ห้องมาตรฐาน', current_tenant_id:3 },
  { id:4, room_number:'04', floor:1, status:'occupied', rental_price:4000, electric_rate:8.0, water_rate:18, service_charge:150, security_deposit:2500, description:'ห้องมาตรฐาน', current_tenant_id:4 },
  { id:5, room_number:'05', floor:2, status:'occupied', rental_price:3600, electric_rate:7.5, water_rate:19, service_charge:100, security_deposit:2000, description:'ห้องมาตรฐาน', current_tenant_id:5 },
  { id:6, room_number:'06', floor:2, status:'occupied', rental_price:3800, electric_rate:8.0, water_rate:20, service_charge:100, security_deposit:2500, description:'ห้องมาตรฐาน', current_tenant_id:6 },
  { id:7, room_number:'07', floor:2, status:'occupied', rental_price:3500, electric_rate:8.0, water_rate:18, service_charge:100, security_deposit:2000, description:'ห้องมาตรฐาน', current_tenant_id:7 },
  { id:8, room_number:'08', floor:3, status:'occupied', rental_price:4200, electric_rate:9.0, water_rate:22, service_charge:150, security_deposit:3000, description:'ห้องมาตรฐาน', current_tenant_id:8 },
];

const mockTenants = [
  { id:1, first_name:'สมชาย', last_name:'วงศ์อมร', phone:'0812345678', email:'somchai.w@gmail.com', id_card:'3100100123456', status:'active', notes:'ผู้เช่าประจำ ชำระเงินตรงเวลา', lease_start_date:'2025-01-01', lease_end_date:'2026-01-01', document_path:null },
  { id:2, first_name:'กมลวรรณ', last_name:'สุขสวัสดิ์', phone:'0898765432', email:'kamolwan.s@gmail.com', id_card:'3100100234567', status:'active', notes:'ผู้เช่าใหม่ เข้าพักเดือนแรก', lease_start_date:'2025-08-01', lease_end_date:'2025-11-01', document_path:null },
  { id:3, first_name:'พิชัย', last_name:'มงคลสุข', phone:'0876543210', email:'pichai.m@hotmail.com', id_card:'3100100345678', status:'active', notes:'เช่ามา 2 ปี ต่อสัญญาทุกปี', lease_start_date:'2024-06-01', lease_end_date:'2026-06-01', document_path:null },
  { id:4, first_name:'อรุณี', last_name:'เจริญผล', phone:'0855556666', email:'arunee.j@yahoo.com', id_card:'3100100456789', status:'active', notes:'ทำงานโรงงาน กลับดึก', lease_start_date:'2025-03-01', lease_end_date:'2026-03-01', document_path:null },
  { id:5, first_name:'สุรศักดิ์', last_name:'พิทักษ์วงศ์', phone:'0833334444', email:'surasak.p@gmail.com', id_card:'3100100567890', status:'active', notes:'มีรถมอเตอร์ไซค์ จอดที่ลานจอด', lease_start_date:'2025-02-01', lease_end_date:'2026-02-01', document_path:null },
  { id:6, first_name:'พิมพ์ใจ', last_name:'ชัยชนะ', phone:'0822221111', email:'pimjai.c@gmail.com', id_card:'3100100678901', status:'active', notes:'นักศึกษาฝึกงาน 3 เดือน', lease_start_date:'2025-07-01', lease_end_date:'2025-10-01', document_path:null },
  { id:7, first_name:'ธนากร', last_name:'ศรีสุข', phone:'0811110000', email:'thanakorn.s@hotmail.com', id_card:'3100100789012', status:'active', notes:'ย้ายเข้าเดือนหน้า มีสัตว์เลี้ยง (แมว)', lease_start_date:'2025-09-01', lease_end_date:'2026-09-01', document_path:null },
  { id:8, first_name:'วิภาวดี', last_name:'วรรณวงศ์', phone:'0844445555', email:'wipawadee.w@gmail.com', id_card:'3100100890123', status:'active', notes:'พยาบาล ทำงานเป็นผลัด', lease_start_date:'2025-04-01', lease_end_date:'2026-04-01', document_path:null },
];

const mockReadings: MReading[] = [
  { id:1, room_id:1, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:150, water_current:60, notes:'' },
  { id:2, room_id:2, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:135, water_current:58, notes:'' },
  { id:3, room_id:3, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:140, water_current:55, notes:'' },
  { id:4, room_id:4, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:155, water_current:62, notes:'' },
  { id:5, room_id:5, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:120, water_current:53, notes:'ประหยัดมาก' },
  { id:6, room_id:6, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:145, water_current:59, notes:'' },
  { id:7, room_id:7, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:130, water_current:56, notes:'' },
  { id:8, room_id:8, month:curMonth, year:curYear, electric_before:100, water_before:50, electric_current:160, water_current:64, notes:'' },
];

function mockRequest(path: string, options?: RequestInit): Promise<any> {
  const url = new URL(`${API_BASE}${path}`, window.location.href);
  const pathname = url.pathname.replace(/^\/api/, '');
  const qs = url.searchParams;

  // --- Rooms ---
  if (pathname === '/rooms') {
    if (options?.method === 'DELETE') return Promise.resolve({ data: null });
    if (options?.method === 'POST' || options?.method === 'PUT') {
      return new Promise(resolve => {
        const body = JSON.parse(options.body as string);
        resolve({ data: { ...body, id: body.id || mockRooms.length + 1 } });
      });
    }
    let filtered = [...mockRooms];
    if (qs.get('status')) filtered = filtered.filter(r => r.status === qs.get('status'));
    return Promise.resolve({ data: filtered });
  }
  if (pathname.startsWith('/rooms/')) {
    const id = Number(pathname.split('/')[2]);
    const room = mockRooms.find(r => r.id === id);
    if (!room) return Promise.reject(new Error('Room not found'));
    if (options?.method === 'PUT') {
      return new Promise(resolve => { const body = JSON.parse(options.body as string); resolve({ data: { ...room, ...body } }); });
    }
    if (options?.method === 'DELETE') return Promise.resolve({ data: null });
    return Promise.resolve({ data: room });
  }

  // --- Tenants ---
  if (pathname === '/tenants') {
    let filtered = [...mockTenants];
    if (qs.get('status')) filtered = filtered.filter(t => t.status === qs.get('status'));
    return Promise.resolve({ data: filtered });
  }
  if (pathname.startsWith('/tenants/')) {
    const id = Number(pathname.split('/')[2]);
    const tenant = mockTenants.find(t => t.id === id);
    if (!tenant) return Promise.reject(new Error('Tenant not found'));
    if (options?.method === 'PUT') {
      return new Promise(resolve => { const body = JSON.parse(options.body as string); resolve({ data: { ...tenant, ...body } }); });
    }
    return Promise.resolve({ data: tenant });
  }

  // --- Meters ---
  if (pathname === '/meters') {
    let filtered = [...mockReadings];
    if (qs.get('month')) filtered = filtered.filter(r => r.month === Number(qs.get('month')!));
    return Promise.resolve({ data: filtered });
  }

  // --- Invoices ---
  if (pathname === '/invoices') {
    if (options?.method === 'DELETE') return Promise.resolve({ data: null });
    let invoices = mockRooms.filter(r => r.current_tenant_id).map((room, i) => ({
      id: i + 1, room_number: room.room_number, invoice_number: `INV-${curYear}${String(curMonth).padStart(2,'0')}-${room.room_number}`,
      amount: room.rental_price + (Math.floor(Math.random()*30)+40) * room.electric_rate + Math.floor(Math.random()*15)*room.water_rate,
      status: 'unpaid', due_date: new Date(curYear, curMonth-1+1, 7).toISOString().split('T')[0]
    }));
    if (options?.method === 'POST') {
      return new Promise(resolve => {
        const body = JSON.parse(options.body as string);
        const newInvoice = {
          id: invoices.length + 1,
          room_number: mockRooms.find(r => r.id === body.room_id)?.room_number || String(body.room_id),
          invoice_number: `INV-${String(body.year).padStart(4,'0')}${String(body.month).padStart(2,'0')}-${mockRooms.find(r => r.id === body.room_id)?.room_number}`,
          total_amount: body.total_amount || 3500,
          status: 'draft',
          due_date: body.due_date || `${body.year}-` + String((body.month % 12) + 1).padStart(2,'0') + '-07',
        };
        resolve({ data: newInvoice });
      });
    }
    return Promise.resolve({ data: invoices });
  }

  // --- Payments ---
  if (pathname === '/payments') {
    return Promise.resolve({ data: [] });
  }

  // --- Dashboard ---
  if (pathname === '/dashboard') {
    const totalRooms = mockRooms.length;
    const occupiedRooms = mockRooms.filter(r => r.status === 'occupied').length;
    const totalRevenue = mockTenants.reduce((sum, t) => {
      const room = mockRooms.find(r => r.current_tenant_id === t.id);
      return sum + (room ? room.rental_price + 600 : 0);
    }, 0);
    return Promise.resolve({ data: { totalRooms, occupiedRooms, availableRooms: totalRooms - occupiedRooms, totalRevenue } });
  }

  // --- Settings ---
  if (pathname === '/settings') {
    const settings = qs.get('key');
    if (settings) return Promise.resolve({ data: { key: settings, value: 'default' } });
    return Promise.resolve({ data: { dorm_name:'หอพักของฉัน', address:'', phone:'', default_electric_rate:8.0, default_water_rate:18.0, currency_symbol:'฿' } });
  }


  // --- Expenses ---
  if (pathname === '/expenses') {
    if (qs.get('category')) {
      return Promise.resolve({ data: expData.filter(e => e.category === qs.get('category')!) });
    }
    return Promise.resolve({ data: expData });
  }
  if (pathname === '/expenses/summary') {
    const summary = expData.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    return Promise.resolve({ data: Object.entries(summary).map(([category, total]) => ({ category, total })) });
  }
  if (pathname.startsWith('/expenses/')) {
    const id = Number(pathname.split('/')[2]);
    if (isNaN(id)) return Promise.reject(new Error('Invalid expense ID'));
    const exp = expData.find(e => e.id === id);
    if (!exp) return Promise.reject(new Error('Expense not found'));
    if (options?.method === 'PUT') {
      return new Promise(resolve => { const body = JSON.parse(options.body as string); resolve({ data: { ...exp, ...body } }); });
    }
    if (options?.method === 'DELETE') return Promise.resolve({ success: true });
    return Promise.resolve({ data: exp });
  }
  // --- Unknown ---
  return Promise.reject(new Error(`Unknown mock endpoint: ${pathname}`));
}

function isMock(): boolean {
  if (typeof window === 'undefined') return false;
  return new URL(window.location.href).searchParams.has(MOCK_KEY);
}
interface RoomSuccessResponse {
  success: true;
  data: Room;
  tenant?: Tenant | null;
}

interface RoomListSuccessResponse {
  success: true;
  data: Room[];
}

interface TenantSuccessResponse {
  success: true;
  data: Tenant;
}

interface TenantListSuccessResponse {
  success: true;
  data: Tenant[];
}

interface InvoiceSuccessResponse {
  success: true;
  data: Invoice;
  payments?: Payment[];
}

interface InvoiceListSuccessResponse {
  success: true;
  data: Invoice[];
}

interface InvoiceCalcResponse {
  success: true;
  data: {
    room_number: string;
    tenant_name: string;
    rental_price: number;
    electric_units: number;
    electric_rate: number;
    electricity_cost: number;
    water_units: number;
    water_rate: number;
    water_cost: number;
    service_charge: number;
    total_amount: number;
  };
}

interface MeterListSuccessResponse {
  success: true;
  data: MeterReading[];
}

interface PaymentSuccessResponse {
  success: true;
  data: Payment;
}

interface PaymentListSuccessResponse {
  success: true;
  data: Payment[];
}

interface DashboardStatsResponse {
  success: true;
  data: DashboardData;
}

interface MonthlyIncomeResponse {
  success: true;
  data: MonthlyIncome[];
}

interface OccupancyResponse {
  success: true;
  data: OccupancyStats;
}

interface DebtorListResponse {
  success: true;
  data: Debtor[];
}

interface ProjectedIncomeData {
  projected: { rental: number; service: number; electric: number; water: number; total: number; occupied_rooms: number };
  actual: { rental: number; electric: number; water: number; service: number; total: number };
  received: number;
  outstanding: number;
  expenses: number;
  netProfit: number;
  trend: Array<{ month: number; year: number; income: number; expenses: number; received: number }>;
  byCategory: { rental: number; electric: number; water: number; service: number };
}

interface SettingsResponse {
  success: true;
  data: Settings;
}

interface ExpenseSuccessResponse {
  success: true;
  data: Expense;
}

interface ExpenseListSuccessResponse {
  success: true;
  data: Expense[];
}

interface ExpenseSummaryResponse {
  success: true;
  data: Array<{ category: string; total: number }>;
}

export interface MonthlyExpenseSummary {
  year: string;
  month: string;
  total: number;
  lawn_care: number;
  repair: number;
  housekeeping: number;
  common_electricity: number;
  common_water: number;
  insurance: number;
  other: number;
}

interface Expense {
  id: number;
  category: string;
  amount: number;
  expense_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Rooms
export const roomsApi = {
  getAll: (status?: string, floor?: number, search?: string): Promise<RoomListSuccessResponse> => {
    const parts: string[] = [];
    if (status) parts.push(`status=${status}`);
    if (floor) parts.push(`floor=${floor}`);
    if (search) parts.push(`search=${encodeURIComponent(search)}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return request<RoomListSuccessResponse>(`/rooms${qs}`);
  },
  getOne: (id: number | string): Promise<RoomSuccessResponse> =>
    request<RoomSuccessResponse>(`/rooms/${id}`),
  create: (data: Record<string, unknown>): Promise<RoomSuccessResponse> =>
    request<RoomSuccessResponse>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  update: (idOrPath: number | string, data: Record<string, unknown>): Promise<RoomSuccessResponse> => {
    const path = typeof idOrPath === 'number' ? `/${idOrPath}` : idOrPath;
    return request<RoomSuccessResponse>(`/rooms${path}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  delete: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/rooms/${id}`, { method: 'DELETE' }),
  updateStatus: (id: number | string, data: { status: string; tenant_id?: string }): Promise<RoomSuccessResponse> =>
    request<RoomSuccessResponse>(`/rooms/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Tenants
export const tenantsApi = {
  getAll: (_status?: string, _search?: string): Promise<TenantListSuccessResponse> =>
    request<TenantListSuccessResponse>(`/tenants${_status ? `?status=${_status}` : ''}`),
  getOne: (id: number): Promise<TenantSuccessResponse> =>
    request<TenantSuccessResponse>(`/tenants/${id}`),
  create: (data: Record<string, unknown>): Promise<TenantSuccessResponse> =>
    request<TenantSuccessResponse>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>): Promise<TenantSuccessResponse> =>
    request<TenantSuccessResponse>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/tenants/${id}`, { method: 'DELETE' }),
};

// Meters
export const metersApi = {
  getAll: (month?: number, year?: number, roomId?: number): Promise<MeterListSuccessResponse> => {
    const parts: string[] = [];
    if (month) parts.push(`month=${month}`);
    if (year) parts.push(`year=${year}`);
    if (roomId) parts.push(`room_id=${roomId}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return request<MeterListSuccessResponse>(`/meters${qs}`);
  },
  createOrUpdate: (data: Record<string, unknown>): Promise<SuccessResponse<unknown>> =>
    request<SuccessResponse<unknown>>('/meters', { method: 'POST', body: JSON.stringify(data) }),
};

// Device Meters (new smart meter device registry)
export interface DeviceMeter {
  id: number; room_id: number; meter_type: string; device_id: string; unit: string;
  api_key: string; status: string; installed_at: string; last_seen_at: string | null;
  room_number?: string; last_reading?: number; last_reading_time?: string | null;
}

export const deviceMetersApi = {
  getAll: (params?: { room_id?: number; meter_type?: string; status?: string }): Promise<SuccessResponse<DeviceMeter[]>> => {
    const parts: string[] = [];
    if (params?.room_id) parts.push(`room_id=${params.room_id}`);
    if (params?.meter_type) parts.push(`meter_type=${params.meter_type}`);
    if (params?.status) parts.push(`status=${params.status}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return request<SuccessResponse<DeviceMeter[]>>(`/device-meters${qs}`);
  },
  getOne: (id: number): Promise<SuccessResponse<DeviceMeter>> =>
    request<SuccessResponse<DeviceMeter>>(`/device-meters/${id}`),
  create: (data: Record<string, unknown>): Promise<SuccessResponse<DeviceMeter>> =>
    request<SuccessResponse<DeviceMeter>>('/device-meters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>): Promise<SuccessResponse<DeviceMeter>> =>
    request<SuccessResponse<DeviceMeter>>(`/device-meters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/device-meters/${id}`, { method: 'DELETE' }),
  getStatus: (id: number): Promise<SuccessResponse<DeviceMeter & { is_online: boolean; today_readings: number }>> =>
    request<SuccessResponse<DeviceMeter & { is_online: boolean; today_readings: number }>>(`/device-meters/${id}/status`),
};

// Meter Readings (time-series from devices)
export interface MeterReadingEntry {
  id: number; meter_id: number; reading: number; reading_time: string;
  device_id?: string; meter_type?: string; unit?: string; room_id?: number; room_number?: string;
}

export interface MeterReadingsByRoom {
  electricity: MeterReadingEntry | null;
  water: MeterReadingEntry | null;
}

export interface MonthlySummary {
  year: number;
  electricity: Array<{ month: string; first_reading: number; last_reading: number; consumption: number; reading_count: number }>;
  water: Array<{ month: string; first_reading: number; last_reading: number; consumption: number; reading_count: number }>;
}

export const meterReadingsApi = {
  getByRoom: (roomId: number, params?: { meter_type?: string; from?: string; to?: string; limit?: number }): Promise<SuccessResponse<MeterReadingEntry[]>> => {
    const parts: string[] = [];
    if (params?.meter_type) parts.push(`meter_type=${params.meter_type}`);
    if (params?.from) parts.push(`from=${params.from}`);
    if (params?.to) parts.push(`to=${params.to}`);
    if (params?.limit) parts.push(`limit=${params.limit}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return request<SuccessResponse<MeterReadingEntry[]>>(`/meter-readings/${roomId}${qs}`);
  },
  getLatest: (roomId: number): Promise<SuccessResponse<MeterReadingsByRoom>> =>
    request<SuccessResponse<MeterReadingsByRoom>>(`/meter-readings/${roomId}/latest`),
  getMonthly: (roomId: number, year?: number): Promise<SuccessResponse<MonthlySummary>> => {
    const qs = year ? `?year=${year}` : '';
    return request<SuccessResponse<MonthlySummary>>(`/meter-readings/${roomId}/monthly${qs}`);
  },
  setBefore: (deviceId: string, reading: number, api_key?: string): Promise<SuccessResponse<{ id: number; meter_id: number; device_id: string; reading: number; reading_time: string }>> =>
    request<SuccessResponse<{ id: number; meter_id: number; device_id: string; reading: number; reading_time: string }>>(`/meter-readings/${deviceId}/set-before`, { method: 'POST', body: JSON.stringify({ reading, api_key }) }),
};

// Invoices
export const invoicesApi = {
  getAll: (params?: Record<string, string>): Promise<InvoiceListSuccessResponse> => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return request<InvoiceListSuccessResponse>(`/invoices${qs}`);
  },
  getOne: (id: number): Promise<InvoiceSuccessResponse> =>
    request<InvoiceSuccessResponse>(`/invoices/${id}`),
  calculate: (data: { room_id: number; month: number; year: number }): Promise<InvoiceCalcResponse> =>
    request<InvoiceCalcResponse>('/invoices/calculate', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: Record<string, unknown>): Promise<InvoiceSuccessResponse> =>
    request<InvoiceSuccessResponse>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>): Promise<InvoiceSuccessResponse> =>
    request<InvoiceSuccessResponse>(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  destroy: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/invoices/${id}`, { method: 'DELETE' }),
};
// Payments
export const paymentsApi = {
  getAll: (): Promise<PaymentListSuccessResponse> =>
    request<PaymentListSuccessResponse>('/payments'),
  getByInvoice: (invoiceId: number): Promise<PaymentListSuccessResponse> =>
    request<PaymentListSuccessResponse>(`/payments?invoice_id=${invoiceId}`),
  create: (data: Record<string, unknown>): Promise<SuccessResponse<unknown>> =>
    request<SuccessResponse<unknown>>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>): Promise<PaymentSuccessResponse> =>
    request<PaymentSuccessResponse>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/payments/${id}`, { method: 'DELETE' }),
};

// Dashboard & Reports
export const dashboardApi = {
  getStats: (): Promise<DashboardStatsResponse> =>
    request<DashboardStatsResponse>('/dashboard/stats'),
  getMonthlyIncome: (params?: Record<string, string>): Promise<MonthlyIncomeResponse> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<MonthlyIncomeResponse>(`/dashboard/monthly-income${qs}`);
  },
  getOccupancy: (): Promise<OccupancyResponse> =>
    request<OccupancyResponse>('/dashboard/occupancy'),
  getDebtors: (): Promise<DebtorListResponse> =>
    request<DebtorListResponse>('/dashboard/debtors'),
  getProjectedIncome: (): Promise<SuccessResponse<ProjectedIncomeData>> =>
    request<SuccessResponse<ProjectedIncomeData>>('/dashboard/projected-income'),
};

// Settings
export const settingsApi = {
  get: (): Promise<SettingsResponse> =>
    request<SettingsResponse>('/settings'),
  update: (data: Record<string, unknown>): Promise<SettingsResponse> =>
    request<SettingsResponse>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  backup: (): Promise<void> => {
    const a = document.createElement('a');
    a.href = `${API_BASE}/settings/backup`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return Promise.resolve();
  },
  restore: (file: File): Promise<{ success: boolean; message: string; backup: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch(`${API_BASE}/settings/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: reader.result,
          });
          const data = await res.json();
          if (!res.ok || !data.success) reject(new Error(data.error || 'Restore failed'));
          else resolve(data);
        } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    }),
  getApiKey: (): Promise<SuccessResponse<{ api_key: string }>> =>
    request<SuccessResponse<{ api_key: string }>>('/settings/api-key'),
  generateApiKey: (): Promise<SuccessResponse<{ api_key: string }>> =>
    request<SuccessResponse<{ api_key: string }>>('/settings/api-key/generate', { method: 'POST' }),
  factoryReset: (): Promise<MessageResponse> =>
    request<MessageResponse>('/settings/factory-reset', { method: 'POST', body: JSON.stringify({ password: '12345678' }) }),
};

// Expenses (owner cost tracking)
export const expensesApi = {
  list: (params?: Record<string, string>): Promise<ExpenseListSuccessResponse> =>
    request<ExpenseListSuccessResponse>('/expenses' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  get: (id: number): Promise<ExpenseSuccessResponse> =>
    request<ExpenseSuccessResponse>(`/expenses/${id}`),
  create: (data: Record<string, unknown>): Promise<ExpenseSuccessResponse> =>
    request<ExpenseSuccessResponse>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>): Promise<ExpenseSuccessResponse> =>
    request<ExpenseSuccessResponse>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number): Promise<MessageResponse> =>
    request<MessageResponse>(`/expenses/${id}`, { method: 'DELETE' }),
  summary: (params?: Record<string, string>): Promise<ExpenseSummaryResponse> =>
    request<ExpenseSummaryResponse>('/expenses/summary' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  summaryMonthly: (months?: number): Promise<SuccessResponse<MonthlyExpenseSummary[]>> =>
    request<SuccessResponse<MonthlyExpenseSummary[]>>('/expenses/summary/monthly' + (months ? `?months=${months}` : '')),
};
// Re-export for convenience
export type { SuccessResponse, MessageResponse, ProjectedIncomeData };

// --- Expense Mock Data ---
const expensesCategories = ['lawn_care','repair','housekeeping','common_electricity','common_water','insurance','other'];

const expenseLabels: Record<string, string> = {
  lawn_care: 'ดูแลสนาม/สวน',
  repair: 'ซ่อมแซม',
  housekeeping: 'ทำความสะอาด',
  common_electricity: 'ค่าไฟพื้นที่ส่วนกลาง',
  common_water: 'ค่าน้ำพื้นที่ส่วนกลาง',
  insurance: 'ประกัน',
  other: 'อื่นๆ',
};

const expData: Expense[] = [];
let expId = 1;
expensesCategories.forEach((cat, i) => {
  expData.push({
    id: expId++, category: cat, amount: [1500,3200,2800,4500,900,2100,650][i],
    expense_date: new Date(curYear, curMonth - 2, (i * 5) + 1).toISOString().slice(0, 10),
    description: `ค่าใช้จ่าย${expenseLabels[cat]}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
});

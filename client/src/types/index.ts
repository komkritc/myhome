// Room types
export interface Room {
  id?: number;
  room_number: string;
  floor: number;
  status: 'available' | 'occupied' | 'booked' | 'maintenance';
  rental_price: number;
  electric_rate: number;
  water_rate: number;
  service_charge: number;
  security_deposit: number;
  description?: string;
  current_tenant_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id?: number;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  id_card?: string;
  status?: string;
  notes?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  document_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contract {
  id?: number;
  room_id: number;
  tenant_id: number;
  start_date: string;
  end_date?: string;
  security_deposit?: number;
  status?: string;
  created_at?: string;
}

export interface MeterReading {
  id?: number;
  room_id: number;
  month: number;
  year: number;
  electric_before: number;
  water_before: number;
  electric_current: number;
  water_current: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  room_id: number;
  tenant_id?: number | null;
  month: number;
  year: number;
  rental_price: number;
  electric_units: number;
  electric_rate: number;
  electricity_cost: number;
  water_units: number;
  water_rate: number;
  water_cost: number;
  service_charge: number;
  total_amount: number;
  due_date?: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'unpaid' | 'overdue';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  amount_paid?: number;
  remaining_balance?: number;
}

export interface Payment {
  id?: number;
  invoice_id: number;
  amount: number;
  total_amount?: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at?: string;
}

export interface DashboardData {
  roomStats: RoomStats;
  currentMonthIncome: CurrentIncome;
  outstandingBalances: Outstanding;
  overdueCounts: Overdue;
  pendingRooms: PendingRoom[];
  recentPayments: PaymentDisplay[];
}

export interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  booked: number;
  maintenance: number;
}

export interface CurrentIncome {
  rental_income: number;
  electric_income: number;
  water_income: number;
  service_income: number;
  total_income: number;
}

export interface Outstanding {
  rooms_count: number;
  total_outstanding: number;
}

export interface Overdue {
  count: number;
  total_overdue: number;
}

export interface PendingRoom {
  id: number;
  total_amount: number;
  room_number: string;
  tenant_name?: string;
}

export interface PaymentDisplay extends Payment {
  invoice_number?: string;
  room_number?: string;
}

export interface OccupancyStats {
  total_rooms: number;
  occupied_rooms: number;
  available_rooms: number;
  occupancy_rate: number;
}

export interface MonthlyIncome {
  year: string;
  month: string;
  rental_income: number;
  electric_income: number;
  water_income: number;
  service_income: number;
  total_income: number;
  expenses: number;
  net_income: number;
}

export interface Debtor {
  room_id: number;
  room_number: string;
  tenant_name: string;
  amount_due: number;
  due_date: string;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  expense_date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  dorm_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  currency_symbol?: string;
  default_electric_rate?: number;
  default_water_rate?: number;
  default_service_charge?: number;
  default_security_deposit?: number;
  payment_due_day?: number;
}

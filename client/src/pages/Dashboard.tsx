import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/date';

interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  booked: number;
  maintenance: number;
}

interface OutstandingBalances {
  rooms_count: number;
  total_outstanding: number;
}

interface OverdueCounts {
  count: number;
  total_overdue: number;
}

interface DashboardStatsData {
  roomStats: RoomStats;
  currentMonthIncome: { rental_income: number; electric_income: number; water_income: number; service_income: number; total_income: number };
  outstandingBalances: OutstandingBalances;
  overdueCounts: OverdueCounts;
  pendingRooms: Array<{ id: number; room_number: string; tenant_name?: string; total_amount: number }>;
  recentPayments: Array<{ id?: number; room_number?: string; payment_date?: string; amount: number; total_amount?: number; invoice_status?: string }>;
}

const statusLabels: Record<string, string> = {
  available: 'ว่าง',
  occupied: 'มีผู้เช่า',
  booked: 'จองแล้ว',
  maintenance: 'ปิดปรับปรุง',
  draft: 'ร่าง',
  sent: 'ส่งแล้ว',
  paid: 'ชำระแล้ว',
  partially_paid: 'ชำระบางส่วน',
  unpaid: 'ยังไม่ชำระ',
  overdue: 'เกินกำหนด',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'badge-success',
    partially_paid: 'badge-warning',
    unpaid: 'badge-neutral',
    overdue: 'badge-danger',
  };
  return <span className={styles[status] || 'badge-neutral'}>{statusLabels[status] || status}</span>;
}

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStats();
      setStats(res.data);
    } catch(e) { toast.addError(`โหลดข้อมูลแดชบอร์ดล้มเหลว: ${(e as Error).message}`); }
    setLoading(false);
  };

  const latestPayments = Array.isArray(stats?.recentPayments) ? stats.recentPayments.slice(-5).reverse() : [];
  const rs = stats?.roomStats || { total: 0, available: 0, occupied: 0, booked: 0, maintenance: 0 };
  const occupancyRate = rs.total ? Math.round((rs.occupied / rs.total) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-4 bg-surface-100 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-surface-100 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title">แดชบอร์ด</h1>
        <button onClick={loadDashboard} className="btn-secondary btn-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          รีเฟรช
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Occupancy Rate */}
        <div className="card col-span-2 lg:col-span-1 p-5 bg-brand-600 text-white border-0">
          <p className="text-xs font-medium opacity-80 mb-1">อัตราเข้าพัก</p>
          <p className="text-3xl font-bold">{occupancyRate}%</p>
          <p className="text-xs opacity-60 mt-1">{rs.occupied}/{rs.total} ห้อง</p>
        </div>

        {/* Income */}
        <div className="card p-5">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">รายรับเดือนนี้</p>
          <p className="text-xl font-bold text-surface-800">฿{(stats?.currentMonthIncome.rental_income || 0).toLocaleString('th-TH', {minimumFractionDigits:0})}</p>
          <p className="text-xs text-surface-400 mt-1">ค่าเช่า</p>
        </div>

        {/* Outstanding */}
        <div className="card p-5">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">ค้างชำระ</p>
          <p className="text-xl font-bold text-danger">฿{Number(stats?.outstandingBalances?.total_outstanding || 0).toLocaleString()}</p>
          <p className="text-xs text-surface-400 mt-1">{stats?.outstandingBalances?.rooms_count || 0} ห้อง</p>
        </div>

        {/* Overdue */}
        <div className="card p-5">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">เกินกำหนด</p>
          <p className="text-xl font-bold text-warning">฿{Number(stats?.overdueCounts?.total_overdue || 0).toLocaleString()}</p>
          <p className="text-xs text-surface-400 mt-1">{stats?.overdueCounts?.count || 0} รายการ</p>
        </div>
      </div>

      {/* Room Status Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-700">สถานะห้อง</h3>
          <span className="text-xs text-surface-400">{rs.total} ห้องทั้งหมด</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-surface-100">
          {rs.available > 0 && (
            <div
              style={{ width: `${(rs.available / (rs.total || 1)) * 100}%` }}
              className="bg-success transition-all"
              title={`ว่าง ${rs.available}`}
            />
          )}
          {rs.occupied > 0 && (
            <div
              style={{ width: `${(rs.occupied / (rs.total || 1)) * 100}%` }}
              className="bg-brand-500 transition-all"
              title={`มีผู้เช่า ${rs.occupied}`}
            />
          )}
          {(rs.booked + rs.maintenance) > 0 && (
            <div
              style={{ width: `${((rs.booked + rs.maintenance) / (rs.total || 1)) * 100}%` }}
              className="bg-surface-300 transition-all"
              title={`อื่น ${rs.booked + rs.maintenance}`}
            />
          )}
        </div>
        <div className="flex gap-4 mt-2.5">
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-2 h-2 rounded-full bg-success" /> ว่าง {rs.available}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-2 h-2 rounded-full bg-brand-500" /> มีผู้เช่า {rs.occupied}
          </span>
          {(rs.booked + rs.maintenance) > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-surface-500">
              <span className="w-2 h-2 rounded-full bg-surface-300" /> อื่น {rs.booked + rs.maintenance}
            </span>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="card">
        <div className="px-5 py-3.5 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-surface-700">รายการล่าสุด</h3>
        </div>
        {latestPayments.length === 0 ? (
          <p className="text-surface-400 text-center py-10 text-sm">ยังไม่มีรายการ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>วันที่</th>
                  <th className="text-right">ยอดรวม</th>
                  <th className="text-right">ชำระ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {latestPayments.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.room_number || '-'}</td>
                    <td className="text-surface-500">{formatDate(p.payment_date)}</td>
                    <td className="text-right">฿{(Number(p.total_amount) || 0).toLocaleString()}</td>
                    <td className="text-right font-semibold text-success">฿{(Number(p.amount) || 0).toLocaleString()}</td>
                    <td><StatusBadge status={p.invoice_status || ''} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: '/rooms', label: 'จัดการห้อง', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
          { to: '/tenants', label: 'ผู้เช่า', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { to: '/invoices', label: 'ใบแจ้งหนี้', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { to: '/reports', label: 'รายงาน', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        ].map(a => (
          <Link key={a.label} to={a.to} className="card-hover flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
            </div>
            <span className="text-sm font-medium text-surface-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { dashboardApi, expensesApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate, THAI_MONTHS } from '../utils/date';
import type { MonthlyIncome, Debtor } from '../types';
import type { ProjectedIncomeData } from '../services/api';

type Tab = 'overview' | 'monthly' | 'debtors' | 'expenses';

const CATEGORY_LABELS: Record<string, string> = {
  rental: 'ค่าเช่า',
  electric: 'ค่าไฟ',
  water: 'ค่าน้ำ',
  service: 'ค่าบริการ',
};

const EXPENSE_CAT_LABELS: Record<string, string> = {
  lawn_care: 'ดูแลสนาม/สวน',
  repair: 'ซ่อมแซม',
  housekeeping: 'ทำความสะอาด',
  common_electricity: 'ค่าไฟส่วนกลาง',
  common_water: 'ค่าน้ำส่วนกลาง',
  insurance: 'ประกัน',
  other: 'อื่นๆ',
};

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDecimal(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 bg-surface-100 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-surface-100 rounded w-1/4 mb-2"></div>
      <div className="h-3 bg-surface-100 rounded w-1/2"></div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="table-container animate-pulse">
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-surface-100 rounded flex-1"></div>
            <div className="h-4 bg-surface-100 rounded w-20"></div>
            <div className="h-4 bg-surface-100 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Dashboard ──────────────────────────────────────────────
function Overview({ data, loading }: { data: ProjectedIncomeData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="card p-8 text-center text-surface-400">ไม่มีข้อมูล</div>
    );
  }

  const { projected, actual, received, outstanding, expenses, netProfit, trend, byCategory } = data;
  const collectionRate = projected.total > 0 ? Math.round((received / projected.total) * 100) : 0;
  const maxTrend = Math.max(...trend.map((t: ProjectedIncomeData['trend'][0]) => Math.max(t.income, t.expenses)), 1);

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-5 bg-brand-600 text-white border-0">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
            </svg>
            <p className="text-xs font-medium opacity-80">รายได้ที่คาดการณ์</p>
          </div>
          <p className="text-2xl font-bold">฿{fmt(projected.total)}</p>
          <div className="text-xs opacity-70 mt-1 space-y-0.5">
            <p>{projected.occupied_rooms} ห้องมีผู้เช่า</p>
            <p>ค่าเช่า ฿{fmt(projected.rental)} + ค่าบริการ ฿{fmt(projected.service)} + ค่าไฟ ฿{fmt(projected.electric || 0)} + ค่าน้ำ ฿{fmt(projected.water || 0)}</p>
          </div>
        </div>
        <div className="card p-5 bg-success border-0 text-white">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium opacity-80">เก็บแล้ว</p>
          </div>
          <p className="text-2xl font-bold">฿{fmt(received)}</p>
          <p className="text-xs opacity-70 mt-1">{collectionRate}% ของเป้า</p>
        </div>
        <div className="card p-5 bg-danger border-0 text-white">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
            </svg>
            <p className="text-xs font-medium opacity-80">ค่าใช้จ่าย</p>
          </div>
          <p className="text-2xl font-bold">฿{fmt(expenses)}</p>
          <p className="text-xs opacity-70 mt-1">เดือนปัจจุบัน</p>
        </div>
        <div className={`card p-5 border-0 text-white ${netProfit >= 0 ? 'bg-success' : 'bg-danger'}`}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium opacity-80">กำไรสุทธิ</p>
          </div>
          <p className="text-2xl font-bold">฿{fmt(netProfit)}</p>
          <p className="text-xs opacity-70 mt-1">รายได้ - ค่าใช้จ่าย</p>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs font-medium text-surface-500">ค้างชำระ</p>
          </div>
          <p className="text-xl font-bold text-warning">฿{fmt(outstanding)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <p className="text-xs font-medium text-surface-500">ค่าเช่าจริง</p>
          </div>
          <p className="text-xl font-bold text-brand-600">฿{fmt(actual.rental)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <p className="text-xs font-medium text-surface-500">ค่าไฟจริง</p>
          </div>
          <p className="text-xl font-bold text-brand-400">฿{fmt(actual.electric)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97 2.197.315 4.467.47 6.652.47 2.185 0 4.455-.155 6.652-.47 1.978-.29 3.348-2.024 3.348-3.97V6.741c0-1.946-1.37-3.68-3.348-3.97A56.782 56.782 0 0012 2.25Z" />
            </svg>
            <p className="text-xs font-medium text-surface-500">ค่าน้ำจริง</p>
          </div>
          <p className="text-xl font-bold text-blue-500">฿{fmt(actual.water)}</p>
        </div>
      </div>

      {/* Monthly Trend Bar Chart */}
      <div className="card p-6">
        <h3 className="page-title flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          แนวโน้มรายได้ vs ค่าใช้จ่าย (6 เดือน)
        </h3>
        <div className="flex items-end gap-3 h-48">
          {trend.map((t: ProjectedIncomeData['trend'][0]) => {
            const incH = maxTrend > 0 ? (t.income / maxTrend) * 100 : 0;
            const expH = maxTrend > 0 ? (t.expenses / maxTrend) * 100 : 0;
            return (
              <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex gap-1 items-end w-full" style={{ height: '140px' }}>
                  <div className="flex-1 rounded-t-md bg-brand-500 transition-all hover:bg-brand-600 relative group"
                    style={{ height: `${Math.max(incH, 2)}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-brand-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      ฿{fmt(t.income)}
                    </span>
                  </div>
                  <div className="flex-1 rounded-t-md bg-danger transition-all hover:bg-danger-dark relative group"
                    style={{ height: `${Math.max(expH, 2)}%` }}>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-danger-dark font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      ฿{fmt(t.expenses)}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-surface-500 font-medium">{THAI_MONTHS[t.month]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-3 text-xs text-surface-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" /> รายได้</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-danger inline-block" /> ค่าใช้จ่าย</span>
        </div>
      </div>

      {/* Income Breakdown by Category */}
      <div className="card p-6">
        <h3 className="page-title flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          สัดส่วนรายได้เดือนนี้
        </h3>
        <div className="space-y-3">
          {(Object.entries(byCategory) as Array<[string, number]>).map(([key, value]) => {
            const maxCat = Math.max(...Object.values(byCategory) as number[], 1);
            const pct = actual.total > 0 ? Math.round((value / actual.total) * 100) : 0;
            const barW = maxCat > 0 ? (value / maxCat) * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-4">
                <span className="w-24 text-sm text-surface-600 shrink-0">{CATEGORY_LABELS[key] || key}</span>
                <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(barW, 5)}%` }}>
                    <span className="text-[11px] text-white font-medium">฿{fmt(value)}</span>
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-medium text-surface-700">{pct}%</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-surface-100 flex justify-between items-center">
          <span className="text-sm font-medium text-surface-600">รวมทั้งหมด</span>
          <span className="text-lg font-bold text-surface-800">฿{fmt(actual.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Monthly Income Tab ──────────────────────────────────────────────
function RenderMonthly({ data, loading }: { data: MonthlyIncome[]; loading: boolean }) {
  const toast = useToast();
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filteredData, setFilteredData] = useState<MonthlyIncome[]>(data);
  const [loadingFilter, setLoadingFilter] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterMonth, filterYear]);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const loadData = async () => {
    setLoadingFilter(true);
    try {
      const now = new Date();
      let startYear = filterYear;
      let endYear = filterYear;
      let startMonth = filterMonth > 0 ? filterMonth : 1;
      let endMonth = filterMonth > 0 ? filterMonth : 12;
      
      if (filterMonth === 0) {
        startMonth = now.getMonth() - 5;
        if (startMonth < 1) startMonth += 12;
        startYear = startMonth > (now.getMonth() + 1) ? now.getFullYear() - 1 : now.getFullYear();
        endMonth = now.getMonth() + 1;
        endYear = now.getFullYear();
      }
      
      const r = await dashboardApi.getMonthlyIncome({
        start_month: String(startMonth).padStart(2, '0'),
        start_year: String(startYear),
        end_month: String(endMonth).padStart(2, '0'),
        end_year: String(endYear),
      });
      setFilteredData(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      toast.addError(`โหลดข้อมูลล้มเหลว: ${(e as Error).message}`);
    }
    setLoadingFilter(false);
  };

  const isLoading = loading || loadingFilter;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex gap-2 animate-pulse">
          <div className="h-9 bg-surface-100 rounded-lg w-36"></div>
          <div className="h-9 bg-surface-100 rounded-lg w-24"></div>
        </div>
        <SkeletonTable />
      </div>
    );
  }
  const totals = filteredData.reduce((acc, row) => ({
    rental: acc.rental + Number(row.rental_income || 0),
    electric: acc.electric + Number(row.electric_income || 0),
    water: acc.water + Number(row.water_income || 0),
    service: acc.service + Number(row.service_income || 0),
    expenses: acc.expenses + Number(row.expenses || 0),
    total: acc.total + Number(row.total_income || 0),
    net: acc.net + Number(row.net_income || 0),
  }), { rental: 0, electric: 0, water: 0, service: 0, expenses: 0, total: 0, net: 0 });

  return (
    <div className="space-y-5">
      {/* Month/Year Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="input w-auto">
          <option value={0}>ทุกเดือน</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{THAI_MONTHS[i + 1]}</option>
          ))}
        </select>
        <input type="number" min={2000} max={2100}
          value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="input w-24" />
        {(filterMonth > 0 || filterYear) && (
          <button onClick={() => { setFilterMonth(0); setFilterYear(new Date().getFullYear()); }}
            className="btn-secondary btn-sm">
            รีเซ็ต
          </button>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="card p-8 text-center text-surface-400">ไม่มีข้อมูลรายได้</div>
      ) : (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>เดือน/ปี</th>
              <th className="text-right">ค่าเช่า</th>
              <th className="text-right">ค่าไฟ</th>
              <th className="text-right">ค่าน้ำ</th>
              <th className="text-right">บริการ</th>
              <th className="text-right">รวมรายได้</th>
              <th className="text-right text-danger">ค่าใช้จ่าย</th>
              <th className="text-right text-success">กำไรสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={`${row.year}-${row.month}`}>
                <td className="font-medium">{THAI_MONTHS[Number(row.month)]} / {String(row.year).slice(2)}</td>
                <td className="text-right">฿{fmt(Number(row.rental_income || 0))}</td>
                <td className="text-right">฿{fmt(Number(row.electric_income || 0))}</td>
                <td className="text-right">฿{fmt(Number(row.water_income || 0))}</td>
                <td className="text-right">฿{fmt(Number(row.service_income || 0))}</td>
                <td className="text-right font-bold">฿{fmt(Number(row.total_income || 0))}</td>
                <td className="text-right text-danger">฿{fmt(Number(row.expenses || 0))}</td>
                <td className={`text-right font-bold ${Number(row.net_income || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  ฿{fmt(Number(row.net_income || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-surface-50">
              <td>รวม</td>
              <td className="text-right">฿{fmt(totals.rental)}</td>
              <td className="text-right">฿{fmt(totals.electric)}</td>
              <td className="text-right">฿{fmt(totals.water)}</td>
              <td className="text-right">฿{fmt(totals.service)}</td>
              <td className="text-right text-brand-600">฿{fmt(totals.total)}</td>
              <td className="text-right text-danger">฿{fmt(totals.expenses)}</td>
              <td className={`text-right ${totals.net >= 0 ? 'text-success' : 'text-danger'}`}>฿{fmt(totals.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}

// ─── Debtors Tab ─────────────────────────────────────────────────────
function RenderDebtors({ data, loading }: { data: Debtor[]; loading: boolean }) {
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const filteredData = useMemo(() => {
    let filtered = data;
    if (filterMonth > 0) {
      filtered = filtered.filter(d => d.due_date && Number(d.due_date.split('-')[1]) === filterMonth);
    }
    if (filterYear) {
      filtered = filtered.filter(d => d.due_date && Number(d.due_date.split('-')[0]) === filterYear);
    }
    return filtered;
  }, [data, filterMonth, filterYear]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex gap-2 animate-pulse">
          <div className="h-9 bg-surface-100 rounded-lg w-36"></div>
          <div className="h-9 bg-surface-100 rounded-lg w-24"></div>
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-1/3 mb-3"></div>
          <div className="h-10 bg-surface-100 rounded w-1/4"></div>
        </div>
        <SkeletonTable />
      </div>
    );
  }

  const totalDue = filteredData.reduce((s, r) => s + Number(r.amount_due || 0), 0);

  return (
    <div className="space-y-5">
      {/* Month/Year Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="input w-auto">
          <option value={0}>ทุกเดือน</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{THAI_MONTHS[i + 1]}</option>
          ))}
        </select>
        <input type="number" min={2000} max={2100}
          value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="input w-24" />
        {(filterMonth > 0 || filterYear) && (
          <button onClick={() => { setFilterMonth(0); setFilterYear(new Date().getFullYear()); }}
            className="btn-secondary btn-sm">
            รีเซ็ต
          </button>
        )}
      </div>

      <div className="card p-5 bg-danger-light border border-danger/20 text-center">
        <p className="text-sm text-surface-600 mb-1">ยอดค้างชำระทั้งหมด</p>
        <p className="text-3xl font-bold text-danger">฿{fmt(totalDue)}</p>
        <p className="text-xs text-surface-500 mt-1">{filteredData.length} รายการ</p>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ห้อง</th>
              <th>ผู้เช่า</th>
              <th className="text-right">ยอดค้างชำระ</th>
              <th>กำหนดชำระ</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={String(row.room_id)}>
                <td className="font-medium">{String(row.room_number).replace('ห้อง', '')}</td>
                <td>{row.tenant_name || '-'}</td>
                <td className="text-right text-danger font-bold">฿{fmt(Number(row.amount_due || 0))}</td>
                <td>{formatDate(row.due_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Expenses Tab ────────────────────────────────────────────────────
function RenderExpenses({ data, monthlyData, loading }: { data: Array<{ category: string; total: number }>; monthlyData: import('../services/api').MonthlyExpenseSummary[]; loading: boolean }) {
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const filteredMonthlyData = useMemo(() => {
    let filtered = monthlyData;
    if (filterMonth > 0) {
      filtered = filtered.filter(m => Number(m.month) === filterMonth);
    }
    if (filterYear) {
      filtered = filtered.filter(m => Number(m.year) === filterYear);
    }
    return filtered;
  }, [monthlyData, filterMonth, filterYear]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex gap-2 animate-pulse">
          <div className="h-9 bg-surface-100 rounded-lg w-36"></div>
          <div className="h-9 bg-surface-100 rounded-lg w-24"></div>
        </div>
        <div className="card p-6 animate-pulse">
          <div className="h-4 bg-surface-100 rounded w-1/3 mb-3"></div>
          <div className="h-10 bg-surface-100 rounded w-1/4"></div>
        </div>
        <SkeletonCard />
      </div>
    );
  }
  if (data.length === 0 && filteredMonthlyData.length === 0) {
    return <div className="card p-8 text-center text-surface-400">ไม่มีข้อมูลค่าใช้จ่าย</div>;
  }
  const total = data.reduce((s, e) => s + e.total, 0);
  const maxVal = Math.max(...data.map(e => e.total), 1);

  return (
    <div className="space-y-5">
      {/* Month/Year Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="input w-auto">
          <option value={0}>ทุกเดือน</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{THAI_MONTHS[i + 1]}</option>
          ))}
        </select>
        <input type="number" min={2000} max={2100}
          value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          className="input w-24" />
        {(filterMonth > 0 || filterYear) && (
          <button onClick={() => { setFilterMonth(0); setFilterYear(new Date().getFullYear()); }}
            className="btn-secondary btn-sm">
            รีเซ็ต
          </button>
        )}
      </div>

      <div className="card p-6 bg-danger border-0 text-white text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
          </svg>
          <p className="text-sm font-medium opacity-80">รวมค่าใช้จ่ายทั้งหมด</p>
        </div>
        <p className="text-3xl font-bold">฿{fmtDecimal(total)}</p>
      </div>

      {/* Category Summary */}
      <div className="card p-6 space-y-4">
        <h3 className="page-title">ค่าใช้จ่ายตามหมวดหมู่</h3>
        {data.map((e) => {
          const pct = total > 0 ? Math.round((e.total / total) * 100) : 0;
          const barW = maxVal > 0 ? (e.total / maxVal) * 100 : 0;
          return (
            <div key={e.category} className="flex items-center gap-4">
              <span className="w-32 text-sm text-surface-600 shrink-0">{EXPENSE_CAT_LABELS[e.category] || e.category}</span>
              <div className="flex-1 bg-surface-100 rounded-full h-6 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-warning to-danger transition-all flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(barW, 5)}%` }}>
                  <span className="text-[11px] text-white font-medium">฿{fmt(e.total)}</span>
                </div>
              </div>
              <span className="w-12 text-right text-sm font-medium text-surface-700">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Monthly Breakdown */}
      {filteredMonthlyData.length > 0 && (
        <div className="table-container">
          <div className="p-6 border-b border-surface-100">
            <h3 className="page-title flex items-center gap-2">
              <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              ค่าใช้จ่ายรายเดือน
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th className="text-right">สนาม/สวน</th>
                  <th className="text-right">ซ่อมแซม</th>
                  <th className="text-right">ทำความสะอาด</th>
                  <th className="text-right">ไฟส่วนกลาง</th>
                  <th className="text-right">น้ำส่วนกลาง</th>
                  <th className="text-right">ประกัน</th>
                  <th className="text-right">อื่นๆ</th>
                  <th className="text-right bg-surface-100">รวม</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyData.map((row) => (
                  <tr key={`${row.year}-${row.month}`}>
                    <td className="font-medium">{THAI_MONTHS[Number(row.month)]} / {String(row.year).slice(2)}</td>
                    <td className="text-right">{row.lawn_care > 0 ? `฿${fmt(row.lawn_care)}` : '-'}</td>
                    <td className="text-right">{row.repair > 0 ? `฿${fmt(row.repair)}` : '-'}</td>
                    <td className="text-right">{row.housekeeping > 0 ? `฿${fmt(row.housekeeping)}` : '-'}</td>
                    <td className="text-right">{row.common_electricity > 0 ? `฿${fmt(row.common_electricity)}` : '-'}</td>
                    <td className="text-right">{row.common_water > 0 ? `฿${fmt(row.common_water)}` : '-'}</td>
                    <td className="text-right">{row.insurance > 0 ? `฿${fmt(row.insurance)}` : '-'}</td>
                    <td className="text-right">{row.other > 0 ? `฿${fmt(row.other)}` : '-'}</td>
                    <td className="text-right font-bold bg-surface-50">฿{fmt(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-surface-50">
                  <td>รวม</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.lawn_care, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.repair, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.housekeeping, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.common_electricity, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.common_water, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.insurance, 0))}</td>
                  <td className="text-right">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.other, 0))}</td>
                  <td className="text-right text-danger bg-surface-100">฿{fmt(filteredMonthlyData.reduce((s, r) => s + r.total, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Reports Page ───────────────────────────────────────────────
export default function Reports() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [projectedData, setProjectedData] = useState<ProjectedIncomeData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyIncome[]>([]);
  const [debtorsData, setDebtorsData] = useState<Debtor[]>([]);
  const [expensesData, setExpensesData] = useState<Array<{ category: string; total: number }>>([]);
  const [expensesMonthlyData, setExpensesMonthlyData] = useState<import('../services/api').MonthlyExpenseSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const loadTab = async (tab: Tab) => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const r = await dashboardApi.getProjectedIncome();
        setProjectedData(r.data);
      } else if (tab === 'monthly') {
        const now = new Date();
        const endYear = String(now.getFullYear());
        const endMonth = String(now.getMonth() + 1).padStart(2, '0');
        let startMonth = now.getMonth() - 5;
        if (startMonth < 1) startMonth += 12;
        const startYear = String(startMonth > (now.getMonth() + 1) ? now.getFullYear() - 1 : now.getFullYear());
        const r = await dashboardApi.getMonthlyIncome({
          start_month: String(startMonth).padStart(2, '0'),
          start_year: startYear,
          end_month: endMonth,
          end_year: endYear,
        });
        setMonthlyData(Array.isArray(r.data) ? r.data : []);
      } else if (tab === 'debtors') {
        const r = await dashboardApi.getDebtors();
        setDebtorsData(r.data || []);
      } else if (tab === 'expenses') {
        const [summaryRes, monthlyRes] = await Promise.all([
          expensesApi.summary(),
          expensesApi.summaryMonthly(6),
        ]);
        setExpensesData(summaryRes.data || []);
        setExpensesMonthlyData(monthlyRes.data || []);
      }
    } catch (e) {
      toast.addError(`โหลดข้อมูลล้มเหลว: ${(e as Error).message}`);
    }
    setLoading(false);
  };

  const tabs: Array<{ key: Tab; label: string; icon: JSX.Element }> = [
    { key: 'overview', label: 'ภาพรวม', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    )},
    { key: 'monthly', label: 'รายได้รายเดือน', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { key: 'debtors', label: 'ลูกหนี้', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    )},
    { key: 'expenses', label: 'ค่าใช้จ่าย', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    )},
  ];

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-surface-100 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <Overview data={projectedData} loading={loading} />}
      {activeTab === 'monthly' && <RenderMonthly data={monthlyData} loading={loading} />}
      {activeTab === 'debtors' && <RenderDebtors data={debtorsData} loading={loading} />}
      {activeTab === 'expenses' && <RenderExpenses data={expensesData} monthlyData={expensesMonthlyData} loading={loading} />}
    </div>
  );
}

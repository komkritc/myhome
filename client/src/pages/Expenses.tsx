import { useState, useEffect, useMemo } from 'react';
import { expensesApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate, THAI_MONTHS } from '../utils/date';
import type { Expense } from '../types';

const expenseCategories = [
  { value: 'lawn_care', label: 'ดูแลสนาม/สวน' },
  { value: 'repair', label: 'ซ่อมแซม' },
  { value: 'housekeeping', label: 'ทำความสะอาด' },
  { value: 'common_electricity', label: 'ค่าไฟพื้นที่ส่วนกลาง' },
  { value: 'common_water', label: 'ค่าน้ำพื้นที่ส่วนกลาง' },
  { value: 'insurance', label: 'ประกัน' },
  { value: 'other', label: 'อื่นๆ' },
];

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-3 bg-surface-100 rounded w-24 mb-2"></div>
      <div className="h-7 bg-surface-100 rounded w-20"></div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-surface-50">
      <td className="px-4 py-3"><div className="h-4 bg-surface-100 rounded w-20"></div></td>
      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-surface-100 rounded-full w-24"></div></td>
      <td className="px-4 py-3 text-right"><div className="h-4 bg-surface-100 rounded w-16 ml-auto"></div></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-surface-100 rounded w-32"></div></td>
      <td className="px-4 py-3 text-right"><div className="flex gap-2 justify-end"><div className="h-6 w-6 bg-surface-100 rounded"></div><div className="h-6 w-6 bg-surface-100 rounded"></div></div></td>
    </tr>
  );
}

export default function Expenses() {
  const toast = useToast();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<{ category: string; total: number }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  const expenses = useMemo(() => {
    let filtered = allExpenses;
    if (filterMonth > 0) {
      filtered = filtered.filter(e => e.expense_date && Number(e.expense_date.split('-')[1]) === filterMonth);
    }
    if (filterYear) {
      filtered = filtered.filter(e => e.expense_date && Number(e.expense_date.split('-')[0]) === filterYear);
    }
    return filtered;
  }, [allExpenses, filterMonth, filterYear]);

  const [formData, setFormData] = useState({
    category: 'other', amount: '', expense_date: new Date().toISOString().slice(0, 10), description: '',
  });

  useEffect(() => { loadData(); loadSummary(); }, []);

  const loadData = async () => {
    try {
      const r = await expensesApi.list();
      const items = r.data;
      setAllExpenses(Array.isArray(items) ? items : []);
    } catch (e) { toast.addError(`โหลดข้อมูลค่าใช้จ่ายล้มเหลว: ${(e as Error).message}`); }
    finally { setIsLoading(false); }
  };

  const loadSummary = async () => {
    try {
      const r = await expensesApi.summary();
      const items = r.data;
      setSummary(Array.isArray(items) ? items : []);
    } catch (e) { toast.addError(`โหลดสรุปค่าใช้จ่ายล้มเหลว: ${(e as Error).message}`); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.amount || Number(formData.amount) <= 0) { setFormError('กรุณาระบุจำนวนเงินที่ถูกต้อง'); return; }
    try {
      if (editing) {
        await expensesApi.update(editing.id, { ...formData, amount: Number(formData.amount) });
      } else {
        await expensesApi.create({ ...formData, amount: Number(formData.amount) });
      }
      setShowModal(false);
      setEditing(null);
      loadData();
      loadSummary();
    } catch (e) { toast.addError(`บันทึกค่าใช้จ่ายล้มเหลว: ${(e as Error).message}`); }
  };

  const startEdit = (exp: Expense) => {
    setEditing(exp);
    setFormData({ category: exp.category, amount: String(exp.amount), expense_date: exp.expense_date, description: exp.description || '' });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ต้องการลบรายการนี้?')) return;
    try {
      await expensesApi.delete(id);
      loadData();
      loadSummary();
    } catch (e) { toast.addError(`ลบค่าใช้จ่ายล้มเหลว: ${(e as Error).message}`); }
  };

  const openAdd = () => { setEditing(null); setFormData({ category: 'other', amount: '', expense_date: new Date().toISOString().slice(0, 10), description: '' }); setShowModal(true); };

  const catLabel = (v: string) => expenseCategories.find(c => c.value === v)?.label ?? v;
  const totalAll = summary.reduce((s, e) => s + e.total, 0);
  const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="page-title">ค่าใช้จ่าย</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="card p-5">
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">ค่าใช้จ่ายทั้งหมด</p>
              <p className="text-2xl font-bold text-danger">{fmt(totalAll)} ฿</p>
            </div>
            {summary.slice(0, 3).map(s => (
              <div key={s.category} className="card p-5">
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-1">{catLabel(s.category)}</p>
                <p className="text-2xl font-bold text-warning">{fmt(s.total)} ฿</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <button onClick={openAdd} className="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มค่าใช้จ่าย
        </button>

        <div className="flex flex-wrap gap-2 items-center sm:ml-auto">
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
              className="btn-ghost btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              รีเซ็ต
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th className="hidden sm:table-cell">หมวดหมู่</th>
              <th className="text-right">จำนวนเงิน</th>
              <th className="hidden md:table-cell">รายละเอียด</th>
              <th className="text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-surface-400">
                  ยังไม่มีรายการค่าใช้จ่าย
                </td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td className="hidden sm:table-cell">
                    <span className="badge-warning">{catLabel(exp.category)}</span>
                  </td>
                  <td className="text-right font-medium text-danger">
                    {fmt(exp.amount)} ฿
                  </td>
                  <td className="hidden md:table-cell text-surface-500">{exp.description || '—'}</td>
                  <td className="text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => startEdit(exp)} className="btn-ghost btn-sm p-1.5" title="แก้ไข">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="btn-ghost btn-sm p-1.5 text-danger hover:bg-danger-light" title="ลบ">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleSubmit} className="card max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h2 className="text-lg font-semibold text-surface-800">{editing ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่าย'}</h2>
            <div>
              <label className="input-label">หมวดหมู่</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="input">
                {expenseCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">จำนวนเงิน (฿)</label>
              <input type="number" step="0.01" min="0" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="input-label">วันที่</label>
              <input type="date" required value={formData.expense_date} onChange={e => setFormData({ ...formData, expense_date: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="input-label">รายละเอียด</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="input" rows={2} placeholder="รายละเอียดเพิ่มเติม" />
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-sm text-danger">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {formError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 btn-primary">
                {editing ? 'บันทึก' : 'เพิ่ม'}
              </button>
              <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1 btn-secondary">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

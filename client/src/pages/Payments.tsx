import { useState, useEffect, useMemo } from 'react';
import { paymentsApi, invoicesApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate, THAI_MONTHS } from '../utils/date';
import type { Payment, Invoice } from '../types';

interface PaymentWithDetails extends Payment {
  invoice_number?: string;
  total_amount?: number;
  invoice_status?: string;
  room_number?: string;
  first_name?: string;
  last_name?: string;
}

interface InvoiceWithPayments extends Invoice {
  room_number?: string;
  first_name?: string;
  last_name?: string;
  amount_paid?: number;
  remaining_balance?: number;
  amountPaid?: number;
  remaining?: number;
}

const paymentMethods = [
  { value: 'cash', label: 'เงินสด' },
  { value: 'transfer', label: 'โอนเงิน' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function Payments() {
  const toast = useToast();
  const [allPayments, setAllPayments] = useState<PaymentWithDetails[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  const payments = useMemo(() => {
    let filtered = allPayments;
    if (filterMonth > 0) {
      filtered = filtered.filter(p => p.payment_date && Number(p.payment_date.split('-')[1]) === filterMonth);
    }
    if (filterYear) {
      filtered = filtered.filter(p => p.payment_date && Number(p.payment_date.split('-')[0]) === filterYear);
    }
    return filtered;
  }, [allPayments, filterMonth, filterYear]);

  const [newPay, setNewPay] = useState({ invoice_id: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [formError, setFormError] = useState('');
  const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null);
  const [editPay, setEditPay] = useState({ invoice_id: '', amount: '0', payment_method: 'cash', payment_date: '', notes: '' });

  useEffect(() => { loadPayments(); loadInvoices(); }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const r = await paymentsApi.getAll();
      setAllPayments(Array.isArray(r.data) ? r.data : []);
    } catch(e) { toast.addError(`โหลดข้อมูลการชำระเงินล้มเหลว: ${(e as Error).message}`); }
    finally { setLoading(false); }
  };

  const loadInvoices = async () => {
    try {
      const invRes = await invoicesApi.getAll({});
      const rawInvoices = Array.isArray(invRes.data) ? invRes.data : [];
      const unpaidInvoices = rawInvoices
        .filter((inv) => inv.status !== 'paid')
        .map((inv) => ({ ...inv, amountPaid: Number(inv.amount_paid ?? 0), remaining: Number(inv.remaining_balance ?? inv.total_amount) }));
      setInvoices(unpaidInvoices);
    } catch(e) { toast.addError(`โหลดข้อมูลใบแจ้งหนี้ล้มเหลว: ${(e as Error).message}`); }
  };

  const getMethodLabel = (method: string): string =>
    paymentMethods.find(m => m.value === method)?.label ?? 'ไม่ระบุ';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newPay.invoice_id) { setFormError('กรุณาเลือกใบแจ้งหนี้'); return; }
    const amount = parseFloat(newPay.amount);
    if (!amount || amount <= 0) { setFormError('จำนวนเงินต้องมากกว่า 0'); return; }
    if (amount > 999999999) { setFormError('จำนวนเงินไม่ถูกต้อง'); return; }

    const invoice = invoices.find(i => String(i.id) === newPay.invoice_id);
    if (!invoice) { setFormError('ไม่พบใบแจ้งหนี้ที่เลือก'); return; }
    const remaining = Number(invoice.total_amount) - (invoice.amountPaid ?? 0);
    if (amount > remaining + 0.01) { setFormError(`ยอดที่ต้องชำระเหลือ ฿${remaining.toFixed(2)} เท่านั้น`); return; }

    try {
      await paymentsApi.create({
        invoice_id: Number(newPay.invoice_id),
        amount,
        payment_method: newPay.payment_method,
        payment_date: newPay.payment_date,
        notes: newPay.notes || undefined,
      });
      setShowModal(false);
      setNewPay({ invoice_id: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().slice(0, 10), notes: '' });

      await loadPayments();
      await loadInvoices();

      toast.addSuccess('บันทึกการชำระเงินสำเร็จ');
    } catch(e) {
      setFormError((e as Error).message);
    }
  };

  const startEditPayment = (payment: PaymentWithDetails) => {
    setEditingPayment(payment);
    setEditPay({
      invoice_id: String(payment.invoice_id || ''),
      amount: Number(payment.amount).toString(),
      payment_method: payment.payment_method || 'cash',
      payment_date: payment.payment_date || '',
      notes: payment.notes || '',
    });
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm('ต้องการลบรายการชำระเงินนี้?')) return;
    try {
      await paymentsApi.delete(id);
      loadPayments();
    } catch (e) { toast.addError(`ลบการชำระเงินล้มเหลว: ${(e as Error).message}`); }
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      await paymentsApi.update(editingPayment.id!, {
        invoice_id: Number(editPay.invoice_id),
        amount: parseFloat(editPay.amount),
        payment_method: editPay.payment_method,
        payment_date: editPay.payment_date,
        notes: editPay.notes || undefined,
      });
      setEditingPayment(null);
      await loadPayments();
      await loadInvoices();
      toast.addSuccess('แก้ไขการชำระเงินสำเร็จ');
    } catch (err) {
      toast.addError(`แก้ไขล้มเหลว: ${(err as Error).message}`);
    }
  };

  const totalOutstanding = invoices.reduce((s, inv) => s + (inv.remaining || 0), 0);
  const totalPaid = allPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstandingCount = invoices.filter(i => (i.remaining ?? 0) > 0).length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-surface-100 rounded w-48 animate-pulse" />
          <div className="h-9 bg-surface-100 rounded-lg w-44 animate-pulse" />
        </div>
        <div className="flex gap-2 animate-pulse">
          <div className="h-9 bg-surface-100 rounded-lg w-32" />
          <div className="h-9 bg-surface-100 rounded-lg w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 bg-surface-100 rounded w-1/3 mb-3" />
              <div className="h-7 bg-surface-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-100 rounded w-1/4" />
            </div>
          ))}
        </div>
        <div className="table-container animate-pulse">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-surface-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          การชำระเงิน
        </h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          บันทึกการชำระเงิน
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="input w-auto">
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
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            รีเซ็ต
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 border-l-4 border-danger">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">ยอดค้างชำระทั้งหมด</p>
          </div>
          <p className="text-2xl font-bold text-danger">฿{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-surface-400 mt-1">{outstandingCount} ใบ</p>
        </div>
        <div className="card p-5 border-l-4 border-success">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">รวมที่ชำระแล้ว</p>
          </div>
          <p className="text-2xl font-bold text-success">฿{totalPaid.toLocaleString()}</p>
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เลขที่ใบแจ้งหนี้</th>
                <th>ห้อง</th>
                <th>ผู้เช่า</th>
                <th className="text-right">ยอดรวม</th>
                <th className="text-right">จำนวนชำระ</th>
                <th>วิธีการ</th>
                <th className="text-center">สถานะ</th>
                <th className="text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-surface-400">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                      <p className="text-sm">ยังไม่มีข้อมูลการชำระเงิน</p>
                    </div>
                  </td>
                </tr>
              ) : payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.payment_date)}</td>
                  <td className="font-mono text-xs">{p.invoice_number || '-'}</td>
                  <td className="font-medium">{p.room_number || '?'}</td>
                  <td>{p.first_name || ''} {p.last_name || ''}</td>
                  <td className="text-right">฿{Number(p.total_amount).toLocaleString()}</td>
                  <td className="text-right font-semibold text-success">฿{Number(p.amount).toLocaleString()}</td>
                  <td>{getMethodLabel(p.payment_method)}</td>
                  <td className="text-center">
                    {p.invoice_status === 'paid' ? (
                      <span className="badge-success">ชำระแล้ว</span>
                    ) : p.invoice_status === 'partially_paid' ? (
                      <span className="badge-warning">ชำระบางส่วน</span>
                    ) : (
                      <span className="badge-neutral">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEditPayment(p)} title="แก้ไข"
                        className="btn-ghost btn-sm px-1.5 py-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => p.id !== undefined && handleDeletePayment(p.id)} title="ลบ"
                        className="btn-ghost btn-sm px-1.5 py-1 text-danger hover:bg-danger-light">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <form onSubmit={handleSubmit} className="relative card w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-surface-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                บันทึกการชำระเงิน
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost btn-sm px-2 py-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-100 mb-3">
                  <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm text-surface-500">ไม่มีใบแจ้งหนี้ที่สามารถชำระได้</p>
              </div>
            ) : (
              <div>
                <label className="input-label">ใบแจ้งหนี้</label>
                <select required value={newPay.invoice_id} onChange={e => setNewPay(f => ({...f, invoice_id: e.target.value}))} className="input">
                  <option value="">-- เลือกใบแจ้งหนี้ --</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id} disabled={Number(inv.remaining) <= 0}>
                      INV-{String(inv.year).slice(-2)}{String(inv.month).padStart(2,'0')} ห้อง {inv.room_number}
                      {(inv.amountPaid || 0) > 0 ? ` (ชำระแล้ว ฿${Number(inv.amountPaid).toLocaleString()})` : ''}
                    </option>))}
                </select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="input-label">จำนวนเงิน (฿)</label>
                <input type="number" required min="0.01" step="0.01" max="99999999" inputMode="decimal"
                  value={newPay.amount} onChange={e => setNewPay(f => ({...f, amount: e.target.value}))}
                  className="input" />
              </div>
              <div>
                <label className="input-label">วันที่ชำระเงิน</label>
                <input type="date" required value={newPay.payment_date} onChange={e => setNewPay(f => ({...f, payment_date: e.target.value}))}
                  className="input" />
              </div>
            </div>

            <div>
              <label className="input-label">วิธีการชำระเงิน</label>
              <select value={newPay.payment_method} onChange={e => setNewPay(f => ({...f, payment_method: e.target.value}))} className="input">
                {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">หมายเหตุ</label>
              <textarea placeholder="ไม่บังคับ" rows={2} value={newPay.notes} onChange={e => setNewPay(f => ({...f, notes: e.target.value}))} className="input" />
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-sm text-danger bg-danger-light p-3 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {formError}
              </div>
            )}

            {newPay.invoice_id && invoices.length > 0 && (() => {
              const inv = invoices.find(i => String(i.id) === newPay.invoice_id);
              if (!inv) return null;
              const total = Number(inv.total_amount) || 0;
              const paid = inv.amountPaid ?? 0;
              const rem = total - paid;
              return (
                <div className="bg-surface-50 border border-surface-200 rounded-lg p-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-surface-700">ใบแจ้งหนี้: {inv.invoice_number}</p>
                  <div className="flex justify-between text-surface-600">
                    <span>ยอดรวม:</span>
                    <span className="font-medium">฿{total.toLocaleString()}</span>
                  </div>
                  {paid > 0 && (
                    <div className="flex justify-between text-surface-600">
                      <span>ชำระแล้ว:</span>
                      <span className="font-medium text-success">฿{paid.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-surface-600 border-t border-surface-200 pt-1.5">
                    <span>คงเหลือ:</span>
                    <span className="font-bold text-danger">฿{rem.toLocaleString()}</span>
                  </div>
                  {rem <= 0 && (
                    <div className="flex items-center gap-2 text-sm text-warning bg-warning-light p-2 rounded-lg mt-1">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      ใบแจ้งหนี้ที่เลือกชำระเต็มแล้ว
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!newPay.invoice_id || !newPay.amount} className="btn-primary flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                บันทึกการชำระเงิน
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setEditingPayment(null)} />
          <form onSubmit={handleSaveEditPayment} className="relative card w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-surface-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                แก้ไขการชำระเงิน - ห้อง {editingPayment.room_number || '?'}
              </h2>
              <button type="button" onClick={() => setEditingPayment(null)} className="btn-ghost btn-sm px-2 py-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-100 mb-3">
                  <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="text-sm text-surface-500">ไม่มีใบแจ้งหนี้ที่เลือก</p>
              </div>
            ) : (
              <div>
                <label className="input-label">ใบแจ้งหนี้</label>
                <select required value={editPay.invoice_id} onChange={e => setEditPay(f => ({...f, invoice_id: e.target.value}))} className="input">
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      INV-{String(inv.year).slice(-2)}{String(inv.month).padStart(2,'0')} ห้อง {inv.room_number} (฿{Number(inv.total_amount).toLocaleString()})
                    </option>))}
                </select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="input-label">จำนวนเงิน (฿)</label>
                <input type="number" required min="0.01" step="0.01" max="99999999" inputMode="decimal"
                  value={editPay.amount} onChange={e => setEditPay(f => ({...f, amount: e.target.value}))}
                  className="input" />
              </div>
              <div>
                <label className="input-label">วันที่ชำระเงิน</label>
                <input type="date" required value={editPay.payment_date} onChange={e => setEditPay(f => ({...f, payment_date: e.target.value}))}
                  className="input" />
              </div>
            </div>

            <div>
              <label className="input-label">วิธีการชำระเงิน</label>
              <select value={editPay.payment_method} onChange={e => setEditPay(f => ({...f, payment_method: e.target.value}))} className="input">
                {paymentMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="input-label">หมายเหตุ</label>
              <textarea placeholder="ไม่บังคับ" rows={2} value={editPay.notes} onChange={e => setEditPay(f => ({...f, notes: e.target.value}))} className="input" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={!editPay.invoice_id || !editPay.amount} className="btn-primary flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                บันทึกการแก้ไข
              </button>
              <button type="button" onClick={() => setEditingPayment(null)} className="btn-secondary">ยกเลิก</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

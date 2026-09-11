import { useState, useEffect, useRef } from 'react';
import { invoicesApi, roomsApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate, THAI_MONTHS } from '../utils/date';
import html2canvas from 'html2canvas';
import type { Invoice, Room } from '../types';

interface InvoiceCalcResult {
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
}

const statusLabels: Record<string, string> = { pending: 'รอดำเนินการ', sent: 'ส่งแล้ว', paid: 'ชำระแล้ว', unpaid: 'ยังไม่ชำระ', partially_paid: 'ชำระบางส่วน', overdue: 'เกินกำหนด' };

const StatusBadge = ({ status }: { status: string }) => {
  const cls = status === 'paid' ? 'badge-success'
    : status === 'pending' || status === 'sent' ? 'badge-warning'
    : status === 'overdue' || status === 'unpaid' ? 'badge-danger'
    : status === 'partially_paid' ? 'badge-info'
    : 'badge-neutral';
  return <span className={cls}>{statusLabels[status] || status}</span>;
};

const IconInvoice = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const IconPlus = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const IconClose = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const IconDownload = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const IconCamera = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const IconLoader = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const SkeletonRow = () => (
  <tr className="border-b border-surface-50">
    {[120, 60, 100, 90, 80, 100, 80].map((w, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded bg-surface-100 animate-pulse" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

export default function Invoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState<(Invoice & { room_number?: string; first_name?: string; last_name?: string; amount_paid?: number; remaining_balance?: number })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState<number>(0);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ room_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [calcResult, setCalcResult] = useState<InvoiceCalcResult | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const calcRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingModal, setIsExportingModal] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: 0, status: '', due_date: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Bulk create state
  const [bulkLoading, setBulkLoading] = useState(false);

  // Export invoice state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportInv, setExportInv] = useState<(typeof invoices)[0] | null>(null);
  const [exportCalc, setExportCalc] = useState<InvoiceCalcResult | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExportingSingle, setIsExportingSingle] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInvoices();
    loadRooms();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadInvoices();
  }, [filterMonth, filterYear]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterMonth) params.month = String(filterMonth);
      if (filterYear) params.year = String(filterYear);
      const res = await invoicesApi.getAll(params);
      let data = res.data || [];
      if (!filterStatus) {
        data = data.filter(i => i.status !== 'draft');
      } else if (filterStatus === 'draft') {
        data = data.filter(i => i.status === 'draft');
      }
      setInvoices(data);
    } catch(e) { toast.addError(`โหลดข้อมูลใบแจ้งหนี้ล้มเหลว: ${(e as Error).message}`); }
    setLoading(false);
  };

  // Load rooms
  const loadRooms = async () => {
    try { const res = await roomsApi.getAll(); setRooms(res.data || []); }
    catch(e) { toast.addError(`โหลดข้อมูลห้องล้มเหลว: ${(e as Error).message}`); }
  };

  // Reload when filters change
  useEffect(() => {
    loadInvoices();
  }, [filterMonth, filterYear, filterStatus]);

  const calcInvoice = () => {
    if (!createForm.room_id || !createForm.month || !createForm.year) return;
    invoicesApi.calculate({ room_id: Number(createForm.room_id), month: Number(createForm.month), year: Number(createForm.year) })
      .then(r => setCalcResult(r.data || null)).catch(() => {});
  };

  useEffect(() => {
    if (createOpen) {
      setCalcResult(null);
      if (createForm.room_id) {
        calcInvoice();
      }
    }
  }, [createOpen, createForm.room_id]);

  const handleExportCalcPng = async () => {
    if (!calcRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(calcRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `calculation_${createForm.room_id}_${createForm.month}_${createForm.year}.png`;
      link.href = url;
      link.click();
    } catch { toast.addError('ไม่สามารถส่งออกเป็น PNG ได้'); }
    finally { setIsExporting(false); }
  };

  const handleExportModalPng = async () => {
    if (!modalRef.current) return;
    setIsExportingModal(true);
    try {
      const canvas = await html2canvas(modalRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice_${createForm.room_id}_${createForm.month}_${createForm.year}.png`;
      link.href = url;
      link.click();
    } catch { toast.addError('ไม่สามารถส่งออกเป็น PNG ได้'); }
    finally { setIsExportingModal(false); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.room_id || !createForm.month || !createForm.year) {
      toast.addError('กรุณาเลือกห้อง เดือน และปี'); return;
    }
    setSaveLoading(true);
    try {
      await invoicesApi.create({ room_id: Number(createForm.room_id), month: Number(createForm.month), year: Number(createForm.year) });
      setFilterStatus('pending');
      setCreateOpen(false);
      setCalcResult(null);
      loadInvoices();
      toast.addSuccess('สร้างใบแจ้งค่าเช่าสำเร็จ');
    } catch(e) {
      const msg = (e as Error).message;
      if (msg.includes('409') || msg.includes('อยู่แล้ว')) {
        toast.addError('ใบแจ้งหนี้สำหรับห้องนี้ในเดือน/ปีนี้มีอยู่แล้ว');
      } else {
        toast.addError(`สร้างใบแจ้งค่าเช่าไม่สำเร็จ: ${msg}`);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete invoice
  const handleDelete = async (id: number, number: string) => {
    if (!window.confirm(`ลบใบแจ้งหนี้ ${number} ใช่หรือไม่?`)) return;
    try {
      await invoicesApi.destroy(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.addSuccess('ลบใบแจ้งหนี้เรียบร้อย');
    } catch(e) {
      toast.addError(`ลบล้มเหลว: ${(e as Error).message}`);
    }
  };

  // Edit invoice
  const openEdit = (inv: typeof invoices[0]) => {
    setEditForm({ id: inv.id || 0, status: inv.status, due_date: inv.due_date || '' });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await invoicesApi.update(editForm.id, { status: editForm.status, due_date: editForm.due_date });
      setInvoices(prev => prev.map(i => i.id === editForm.id ? { ...i, status: editForm.status as typeof i.status, due_date: editForm.due_date } : i));
      setEditOpen(false);
      toast.addSuccess('แก้ไขใบแจ้งหนี้สำเร็จ');
    } catch(e) {
      toast.addError(`แก้ไขไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setEditLoading(false);
    }
  };

  // Bulk create invoices for all rooms for current month
  const handleBulkCreate = async () => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    if (rooms.length === 0) {
      toast.addError('ไม่พบข้อมูลห้อง'); return;
    }
    setBulkLoading(true);
    let created = 0;
    let failed = 0;
    try {
      // Step 1: Delete existing invoices for current month/year
      const existingRes = await invoicesApi.getAll({
        month: String(curMonth),
        year: String(curYear),
      });
      const existingInvoices = existingRes.data || [];
      if (existingInvoices.length > 0) {
        for (const inv of existingInvoices) {
          if (inv.id == null) continue;
          try {
            await invoicesApi.destroy(inv.id);
          } catch { /* ignore delete errors */ }
        }
      }

      // Step 2: Create new invoices for all rooms
      for (const room of rooms) {
        try {
          await invoicesApi.create({ room_id: room.id, month: curMonth, year: curYear });
          created++;
        } catch {
          failed++;
        }
      }
      setFilterMonth(curMonth);
      setFilterYear(curYear);
      loadInvoices();
      const parts = [];
      if (existingInvoices.length > 0) parts.push(`ลบ ${existingInvoices.length} ฉบับเดิม`);
      if (created > 0) parts.push(`สร้าง ${created} ฉบับ`);
      if (failed > 0) parts.push(`ล้มเหลว ${failed} ฉบับ`);
      toast.addSuccess(`สร้างใบแจ้งค่าเช่าเดือน${THAI_MONTHS[curMonth]}: ${parts.join(', ')}`);
    } catch(e) {
      toast.addError(`สร้างใบแจ้งค่าเช่าล้มเหลว: ${(e as Error).message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleOpenExport = async (inv: typeof invoices[0]) => {
    setExportInv(inv);
    setExportOpen(true);
    setExportLoading(true);
    try {
      const res = await invoicesApi.calculate({ room_id: inv.room_id, month: inv.month, year: inv.year });
      setExportCalc(res.data || null);
    } catch { setExportCalc(null); }
    setExportLoading(false);
  };

  const handleExportSinglePng = async () => {
    if (!exportRef.current || !exportInv) return;
    setIsExportingSingle(true);
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice_${exportInv.room_number}_${exportInv.month}_${exportInv.year}.png`;
      link.href = url;
      link.click();
    } catch { toast.addError('ไม่สามารถส่งออกเป็น PNG ได้'); }
    finally { setIsExportingSingle(false); }
  };

  const getMonthName = (monthNum: number) => THAI_MONTHS[monthNum] || '';

  const filterTabs = [
    { key: '', label: 'แสดงทั้งหมด' },
    ...Object.entries(statusLabels).map(([key, label]) => ({ key, label })),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <IconInvoice />
          ใบแจ้งหนี้
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleBulkCreate}
            disabled={bulkLoading}
            className="btn-primary"
          >
            {bulkLoading ? <IconLoader /> : <IconPlus />}
            สร้างใบแจ้งค่าเช่าเดือนนี้
          </button>
          <button
            onClick={() => { setCreateOpen(true); setCalcResult(null); setCreateForm({ room_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) }); }}
            className="btn-primary"
          >
            <IconPlus />
            สร้างใบแจ้งค่าเช่า
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key === filterStatus ? '' : key)}
              className={`btn-sm rounded-full ${filterStatus === key ? 'bg-brand-600 text-white hover:bg-brand-700' : 'btn-secondary'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="input-label mb-0 whitespace-nowrap">ปี</label>
          <input
            type="number"
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            min={2000}
            max={2100}
            className="input w-24"
          />
          <label className="input-label mb-0 whitespace-nowrap">เดือน</label>
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(Number(e.target.value))}
            className="input w-auto"
          >
            <option value={0}>ทุกเดือน</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{THAI_MONTHS[i + 1]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>ห้อง</th>
              <th>เดือน/ปี</th>
              <th className="text-right">ยอดรวม</th>
              <th className="text-center">สถานะ</th>
              <th>กำหนดชำระ</th>
              <th className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-surface-400">
                  <div className="flex flex-col items-center gap-2">
                    <IconInvoice />
                    <span>ยังไม่มีใบแจ้งหนี้</span>
                  </div>
                </td>
              </tr>
            ) : invoices.map(inv => (
              <tr key={inv.id}>
                <td className="font-mono text-xs">{inv.invoice_number}</td>
                <td className="font-medium">{inv.room_number}</td>
                <td>{getMonthName(inv.month)} / {String(inv.year).slice(2)}</td>
                <td className="text-right font-bold text-surface-800">฿{Number(inv.total_amount).toLocaleString()}</td>
                <td className="text-center">
                  <StatusBadge status={inv.status} />
                </td>
                <td>{formatDate(inv.due_date)}</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(inv)}
                      title="แก้ไขใบแจ้งหนี้"
                      className="btn-ghost btn-sm p-1.5"
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => handleOpenExport(inv)}
                      title="ส่งออกใบแจ้งหนี้ PNG"
                      className="btn-ghost btn-sm p-1.5"
                    >
                      <IconCamera />
                    </button>
                    <button
                      onClick={() => inv.id !== undefined && handleDelete(inv.id, inv.invoice_number)}
                      title="ลบใบแจ้งหนี้"
                      disabled={inv.status === 'paid'}
                      className={`btn-ghost btn-sm p-1.5 ${inv.status === 'paid' ? 'opacity-30 cursor-not-allowed' : 'text-danger hover:bg-danger-light'}`}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div ref={modalRef} className="relative z-10 w-full max-w-md">
            <form onSubmit={handleGenerate} className="card p-6 animate-scale-in">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-surface-800">สร้างใบแจ้งค่าเช่า</h2>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleExportModalPng} disabled={isExportingModal}
                    title="บันทึกรูปแบบ PNG"
                    className="btn-ghost btn-sm p-1.5"
                  >
                    {isExportingModal ? <IconLoader /> : <IconCamera />}
                  </button>
                  <button type="button" onClick={() => setCreateOpen(false)} className="btn-ghost btn-sm p-1.5">
                    <IconClose />
                  </button>
                </div>
              </div>

              {calcResult && (
                <div className="mb-5 rounded-lg border border-success/30 bg-success-light/50">
                  <div ref={calcRef} className="p-4 space-y-1 text-sm">
                    <p className="font-semibold text-surface-800 mb-2">
                      สรุปการคำนวณ: ห้อง {calcResult.room_number}
                      {calcResult.tenant_name && ' - '}{calcResult.tenant_name || ''}
                    </p>
                    <p className="flex justify-between text-surface-600">
                      <span>ค่าเช่า:</span>
                      <span className="font-medium">฿{calcResult.rental_price?.toLocaleString()}</span>
                    </p>
                    {calcResult.electricity_cost > 0 && (
                      <p className="flex justify-between text-surface-600">
                        <span>ค่าไฟ ({calcResult.electric_units} หน่วย × {calcResult.electric_rate}):</span>
                        <span className="font-medium">฿{calcResult.electricity_cost?.toLocaleString()}</span>
                      </p>
                    )}
                    {calcResult.water_cost > 0 && (
                      <p className="flex justify-between text-surface-600">
                        <span>ค่าน้ำ ({calcResult.water_units} หน่วย × {calcResult.water_rate}):</span>
                        <span className="font-medium">฿{calcResult.water_cost?.toLocaleString()}</span>
                      </p>
                    )}
                    <div className="pt-2 border-t border-success/20 mt-2 font-bold flex justify-between text-surface-800">
                      <span>รวม:</span>
                      <span>฿{calcResult.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end px-4 py-2.5 border-t border-success/20">
                    <button type="button" onClick={handleExportCalcPng} disabled={isExporting}
                      className="btn-primary btn-sm"
                    >
                      {isExporting ? <IconLoader /> : <IconDownload />}
                      PNG
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="input-label">ห้อง</label>
                  <select required value={createForm.room_id}
                    onChange={e => setCreateForm(f => ({ ...f, room_id: e.target.value }))}
                    onBlur={() => calcInvoice()}
                    className="input"
                  >
                    <option value="">-- เลือกห้อง --</option>
                    {rooms.map(r => <option key={r.id} value={String(r.id)}>{r.room_number}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">เดือน</label>
                    <select required value={createForm.month}
                      onChange={e => setCreateForm(f => ({ ...f, month: e.target.value }))}
                      className="input"
                    >
                      {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{THAI_MONTHS[i + 1]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">ปี</label>
                    <input type="number" required min={2000} max={2100} step="1" placeholder="ปี"
                      value={createForm.year} onChange={e => setCreateForm(f => ({ ...f, year: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={saveLoading} className="btn-primary flex-1">
                  {saveLoading ? <IconLoader /> : <IconCheck />}
                  {saveLoading ? 'กำลังสร้าง...' : 'สร้างใบแจ้งค่าเช่า'}
                </button>
                <button type="button" onClick={() => { setCreateOpen(false); setCalcResult(null); loadInvoices(); }}
            className="btn-primary"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <form onSubmit={handleSaveEdit} className="relative z-10 w-full max-w-sm card p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-surface-800">แก้ไขใบแจ้งหนี้</h2>
              <button type="button" onClick={() => setEditOpen(false)} className="btn-ghost btn-sm p-1.5">
                <IconClose />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="input-label">สถานะ</label>
                <select required value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="input"
                >
                  <option value="">-- เลือกสถานะ --</option>
                  {['pending', 'sent', 'paid', 'partially_paid', 'unpaid', 'overdue'].map(s => (
                    <option key={s} value={s}>{statusLabels[s] || s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">กำหนดชำระ</label>
                <input type="date" required value={editForm.due_date}
                  onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3 justify-end">
              <button type="submit" disabled={editLoading} className="btn-primary">
                {editLoading ? <IconLoader /> : <IconCheck />}
                {editLoading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Export Invoice Modal */}
      {exportOpen && exportInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={() => { setExportOpen(false); setExportInv(null); setExportCalc(null); }} />
          <div ref={exportRef} className="relative z-10 w-full max-w-md bg-white rounded-card shadow-elevated border border-surface-100 p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-surface-800">ใบแจ้งค่าเช่า</h2>
              <div className="flex items-center gap-1">
                <button type="button" onClick={handleExportSinglePng} disabled={isExportingSingle}
                  title="บันทึกรูปแบบ PNG"
                  className="btn-ghost btn-sm p-1.5"
                >
                  {isExportingSingle ? <IconLoader /> : <IconCamera />}
                </button>
                <button type="button" onClick={() => { setExportOpen(false); setExportInv(null); setExportCalc(null); }} className="btn-ghost btn-sm p-1.5">
                  <IconClose />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-surface-600">
                <span>เลขที่:</span>
                <span className="font-medium">{exportInv.invoice_number}</span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>ห้อง:</span>
                <span className="font-medium">{exportInv.room_number}{exportInv.first_name ? ` (${exportInv.first_name} ${exportInv.last_name || ''})` : ''}</span>
              </div>
              <div className="flex justify-between text-surface-600">
                <span>เดือน/ปี:</span>
                <span className="font-medium">{getMonthName(exportInv.month)} / {exportInv.year}</span>
              </div>
              {exportInv.due_date && (
                <div className="flex justify-between text-surface-600">
                  <span>กำหนดชำระ:</span>
                  <span className="font-medium">{formatDate(exportInv.due_date)}</span>
                </div>
              )}

              {exportLoading ? (
                <div className="py-4 text-center text-surface-400"><IconLoader /> กำลังโหลด...</div>
              ) : exportCalc ? (
                <>
                  <div className="pt-2 border-t border-surface-200 mt-2 space-y-1">
                    <p className="flex justify-between text-surface-600">
                      <span>ค่าเช่า:</span>
                      <span className="font-medium">฿{exportCalc.rental_price?.toLocaleString()}</span>
                    </p>
                    {exportCalc.electricity_cost > 0 && (
                      <p className="flex justify-between text-surface-600">
                        <span>ค่าไฟ ({exportCalc.electric_units} หน่วย × {exportCalc.electric_rate}):</span>
                        <span className="font-medium">฿{exportCalc.electricity_cost?.toLocaleString()}</span>
                      </p>
                    )}
                    {exportCalc.water_cost > 0 && (
                      <p className="flex justify-between text-surface-600">
                        <span>ค่าน้ำ ({exportCalc.water_units} หน่วย × {exportCalc.water_rate}):</span>
                        <span className="font-medium">฿{exportCalc.water_cost?.toLocaleString()}</span>
                      </p>
                    )}
                    {exportCalc.service_charge > 0 && (
                      <p className="flex justify-between text-surface-600">
                        <span>ค่าบริการ:</span>
                        <span className="font-medium">฿{exportCalc.service_charge?.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-surface-200 mt-2 font-bold flex justify-between text-surface-800">
                    <span>รวม:</span>
                    <span>฿{exportCalc.total_amount?.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <p className="text-center text-surface-400 py-4">ไม่พบข้อมูลคำนวณ</p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={handleExportSinglePng} disabled={isExportingSingle} className="btn-primary flex-1">
                {isExportingSingle ? <IconLoader /> : <IconDownload />}
                {isExportingSingle ? 'กำลังส่งออก...' : 'บันทึก PNG'}
              </button>
              <button type="button" onClick={() => { setExportOpen(false); setExportInv(null); setExportCalc(null); }} className="btn-secondary">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

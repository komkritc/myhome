import { useState, useEffect, useRef } from 'react';
import { settingsApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { theme, themes, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dorm_name: '', address: '', phone: '', tax_id: '',
    email: '', currency_symbol: '฿',
    default_electric_rate: '8.0', default_water_rate: '18.0',
    default_service_charge: '100.0', default_security_deposit: '2000', payment_due_day: '7',
  });
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const r = await settingsApi.get();
      if (r.data) {
        setForm({
          dorm_name: r.data.dorm_name || 'หอพักของฉัน',
          address: r.data.address || '',
          phone: r.data.phone || '',
          email: r.data.email || '',
          tax_id: r.data.tax_id || '',
          currency_symbol: r.data.currency_symbol || '฿',
          default_electric_rate: String(r.data.default_electric_rate ?? 8.0),
          default_water_rate: String(r.data.default_water_rate ?? 18.0),
          default_service_charge: String(r.data.default_service_charge ?? 100),
          default_security_deposit: String(r.data.default_security_deposit ?? 2000),
          payment_due_day: String(r.data.payment_due_day ?? 7),
        });
      } else {
        setForm({ dorm_name: 'หอพักของฉัน', address: '', phone: '', tax_id: '', email: '', currency_symbol: '฿',
          default_electric_rate: '8.0', default_water_rate: '18.0', default_service_charge: '100.0',
          default_security_deposit: '2000', payment_due_day: '7' });
      }
    } catch(e) { console.error('Failed to load settings:', e); }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(form);
      alert('บันทึกการตั้งค่าเรียบร้อย');
    } catch(e) { alert((e as Error).message); }
    setSaving(false);
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      await settingsApi.backup();
    } catch(e) { alert((e as Error).message); }
    setBackupLoading(false);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('การกู้คืนจะแทนที่ฐานข้อมูลปัจจุบัน ต้องการดำเนินการต่อหรือไม่?')) {
      e.target.value = '';
      return;
    }
    setRestoreLoading(true);
    setRestoreMsg('');
    try {
      const result = await settingsApi.restore(file);
      setRestoreMsg(`✅ ${result.message} (สำเนา: ${result.backup})`);
    } catch(err) {
      setRestoreMsg(`❌ ${(err as Error).message}`);
    }
    setResetLoading(false);
    e.target.value = '';
  };

  const handleFactoryReset = async () => {
    if (resetPassword !== '12345678') {
      alert('❌ รหัสผ่านไม่ถูกต้อง — กรุณาใส่ password: 12345678');
      return;
    }
    setResetLoading(true);
    try {
      await settingsApi.factoryReset();
      alert('✅ รีเซ็ตฐานข้อมูลสำเร็จ หมดทุกอย่างพร้อมหอใหม่');
      window.location.reload();
    } catch(err) {
      const msg = (err as Error).message;
      alert(`❌ ล้มเหลว: ${msg || 'รหัสผ่านผิด'}`);
    }
    setResetLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="h-8 w-48 bg-surface-200 rounded-lg animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-6 space-y-4">
            <div className="h-5 w-40 bg-surface-200 rounded animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-20 bg-surface-100 rounded animate-pulse" />
                <div className="h-10 w-full bg-surface-100 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-surface-100 rounded animate-pulse" />
                <div className="h-10 w-full bg-surface-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        <h1 className="page-title">ตั้งค่าระบบ</h1>
      </div>

      {/* Property Information */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0H21" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">ข้อมูลอสังหาริมทรัพย์</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="input-label">ชื่อโครงการ / อาคาร</label>
            <input value={form.dorm_name} onChange={e => setForm(s => ({...s, dorm_name: e.target.value}))}
              placeholder="เช่น ตึกพักนักศึกษาร่มเกล้า"
              className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="input-label">ที่อยู่</label>
            <textarea value={form.address} rows={3} onChange={e => setForm(s => ({...s, address: e.target.value}))}
              placeholder="เลขที่ ถนน อำเภอ จังหวัด รหัสไปรษณีย์"
              className="input resize-none" />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">ข้อมูลการติดต่อ</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">อีเมล</label>
            <input type="email" value={form.email} onChange={e => setForm(s => ({...s, email: e.target.value}))}
              placeholder="email@example.com"
              className="input" />
          </div>
          <div>
            <label className="input-label">เบอร์โทรศัพท์</label>
            <input value={form.phone} onChange={e => setForm(s => ({...s, phone: e.target.value}))}
              placeholder="เช่น 08X-XXX-XXXX"
              className="input" />
          </div>
        </div>
      </div>

      {/* Currency Settings */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">สกุลเงิน</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">สัญลักษณ์สกุลเงิน</label>
            <input value={form.currency_symbol} onChange={e => setForm(s => ({...s, currency_symbol: e.target.value}))}
              placeholder="฿"
              className="input" />
          </div>
        </div>
      </div>

      {/* Tax & Payment Settings */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">เลขประจำตัวผู้เสียภาษี & กำหนดชำระ</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="input-label">เลขประจำตัวผู้เสียภาษี</label>
            <input value={form.tax_id} onChange={e => setForm(s => ({...s, tax_id: e.target.value}))}
              placeholder="เช่น 0123456789012"
              className="input" />
          </div>
          <div>
            <label className="input-label">วันกำหนดชำระ (รายเดือน)</label>
            <input type="number" value={form.payment_due_day} onChange={e => setForm(s => ({...s, payment_due_day: e.target.value}))}
              min="1" max="31"
              className="input" />
          </div>
        </div>
      </div>

      {/* Default Rates */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">อัตราเริ่มต้น (สำหรับห้องใหม่)</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="input-label">ค่าไฟต่อหน่วย</label>
            <input type="number" step="0.1" value={form.default_electric_rate} onChange={e => setForm(s => ({...s, default_electric_rate: e.target.value}))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าน้ำต่อหน่วย</label>
            <input type="number" step="0.1" value={form.default_water_rate} onChange={e => setForm(s => ({...s, default_water_rate: e.target.value}))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าบริการรายเดือน</label>
            <input type="number" value={form.default_service_charge} onChange={e => setForm(s => ({...s, default_service_charge: e.target.value}))}
              className="input" />
          </div>
          <div>
            <label className="input-label">เงินประกัน</label>
            <input type="number" value={form.default_security_deposit} onChange={e => setForm(s => ({...s, default_security_deposit: e.target.value}))}
              className="input" />
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">ธีมสี (Color Theme)</h3>
        </div>
        <p className="text-xs text-surface-500">เลือกสีหลักสำหรับแอปพลิเคชัน</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                theme.id === t.id
                  ? 'border-brand-500 shadow-lg scale-105'
                  : 'border-surface-200 hover:border-surface-300 hover:shadow-md'
              }`}
            >
              <div
                className="w-12 h-12 rounded-full shadow-inner mb-2"
                style={{ background: t.preview }}
              />
              <span className="text-xs font-medium text-surface-700 text-center leading-tight">{t.name}</span>
              {theme.id === t.id && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          <h3 className="text-sm font-semibold text-surface-700">สำรอง & กู้คืนฐานข้อมูล</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleBackup} disabled={backupLoading}
            className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {backupLoading ? 'กำลังดาวน์โหลด...' : 'สำรองฐานข้อมูล'}
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={restoreLoading}
            className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            {restoreLoading ? 'กำลังกู้คืน...' : 'กู้คืนฐานข้อมูล'}
          </button>
          <input ref={fileInputRef} type="file" accept=".db" className="hidden" onChange={handleRestore} />
        </div>
        {restoreMsg && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            restoreMsg.startsWith('✅') ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
          }`}>
            {restoreMsg.startsWith('✅') ? (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            )}
            <span>{restoreMsg.replace(/^[✅❌]\s*/, '')}</span>
          </div>
        )}
        <p className="text-xs text-surface-400">ไฟล์จะถูกบันทึกเป็น .db (SQLite) สำหรับสำรอง และอัปโหลด .db เพื่อกู้คืน</p>
      </div>

      {/* Security / Factory Reset */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <h3 className="text-sm font-semibold text-danger">รีเซ็ตระบบ (Factory Reset)</h3>
        </div>

        {!showResetConfirm ? (
          <button type="button" onClick={() => setShowResetConfirm(true)}
            className="btn-danger">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            เริ่มต้นใหม่ทั้งหมด
          </button>
        ) : (
          <div className="space-y-4 p-4 border border-danger/20 bg-danger-light/30 rounded-lg">
            <p className="text-sm text-danger font-medium">
              คำเตือน: การดำเนินการนี้จะลบข้อมูลทั้งหมด (<strong>rooms, tenants, invoices, payments, meters, readings</strong>) และรีเซ็ตระบบเป็นข้อมูลเริ่มต้นสำหรับหอใหม่
            </p>

            <div>
              <label className="input-label text-danger">รหัสผ่านยืนยัน</label>
              <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                placeholder="ใส่ password: 12345678"
                className="input focus:ring-danger/20 focus:border-danger" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowResetConfirm(false)}
                className="btn-secondary">
                ยกเลิก
              </button>
              <button type="button" onClick={handleFactoryReset} disabled={!resetPassword || resetLoading}
                className="btn-danger">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {resetLoading ? 'กำลังรีเซ็ต...' : 'ยืนยันเริ่มใหม่ทั้งหมด'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>
    </form>
  );
}

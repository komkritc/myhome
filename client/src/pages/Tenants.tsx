import { useState, useEffect } from 'react';
import { tenantsApi } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { formatDate } from '../utils/date';

interface TenantCard {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  id_card?: string | null;
  status: string;
  room_number?: string | null;
  floor?: number | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  document_path?: string | null;
}

type Mode = 'create' | 'edit';

export default function Tenants() {
  const toast = useToast();
  const [tenants, setTenants] = useState<TenantCard[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', id_card: '', notes: '', lease_start_date: '', lease_end_date: '' });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [_uploadingDoc, _setUploadingDoc] = useState(false);

  useEffect(() => { loadTenants(); }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await tenantsApi.getAll();
      setTenants((Array.isArray(res.data) ? res.data : []) as TenantCard[]);
    } catch (e) {
      toast.addError(`โหลดข้อมูลผู้เช่าล้มเหลว: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setMode('create');
    setEditId(null);
    setForm({ first_name: '', last_name: '', phone: '', email: '', id_card: '', notes: '', lease_start_date: '', lease_end_date: '' });
    setDocumentFile(null);
    setIsModalOpen(true);
  };

  const openEdit = (t: TenantCard) => {
    setMode('edit');
    setEditId(t.id);
    setForm({
      first_name: t.first_name,
      last_name: t.last_name,
      phone: t.phone || '',
      email: t.email || '',
      id_card: t.id_card || '',
      notes: '',
      lease_start_date: t.lease_start_date || '',
      lease_end_date: t.lease_end_date || '',
    });
    setDocumentFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let tenantId: number;
      if (mode === 'create') {
        const res = await tenantsApi.create({ ...form, status: 'active' });
        tenantId = res.data.id!;
        setTenants(prev => [...prev, res.data as TenantCard]);
        toast.addSuccess('เพิ่มผู้เช่าสำเร็จ');
      } else {
        const res = await tenantsApi.update(editId!, {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone || null,
          email: form.email || null,
          id_card: form.id_card || null,
          notes: form.notes || null,
          lease_start_date: form.lease_start_date || null,
          lease_end_date: form.lease_end_date || null,
        });
        tenantId = editId!;
        setTenants(prev => prev.map(t => t.id === editId ? res.data as TenantCard : t));
        toast.addSuccess('แก้ไขผู้เช่าสำเร็จ');
      }

      // Upload document if selected
      if (documentFile && tenantId) {
        _setUploadingDoc(true);
        try {
          const formData = new FormData();
          formData.append('document', documentFile);
          const uploadRes = await fetch(`/api/tenants/${tenantId}/document`, {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success) {
            setTenants(prev => prev.map(t => t.id === tenantId ? uploadData.data as TenantCard : t));
            toast.addSuccess('อัพโหลดเอกสารสำเร็จ');
          }
        } catch (uploadErr) {
          toast.addError('อัพโหลดเอกสารล้มเหลว');
        } finally {
          _setUploadingDoc(false);
        }
      }

      setIsModalOpen(false);
    } catch (e) {
      toast.addError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ต้องการลบผู้เช่า "${name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    try {
      await tenantsApi.delete(id);
      setTenants(prev => prev.filter(t => t.id !== id));
      toast.addSuccess('ลบผู้เช่าสำเร็จ');
    } catch (e) {
      toast.addError((e as Error).message);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('ต้องการลบเอกสารนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/tenants/${id}/document`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTenants(prev => prev.map(t => t.id === id ? data.data as TenantCard : t));
        toast.addSuccess('ลบเอกสารสำเร็จ');
      }
    } catch (e) {
      toast.addError('ลบเอกสารล้มเหลว');
    }
  };

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`ต้องการระงับผู้เช่า "${name}" ใช่หรือไม่?`)) return;
    try {
      await tenantsApi.update(id, { status: 'inactive' });
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: 'inactive' } : t));
      toast.addSuccess('ระงับผู้เช่าสำเร็จ');
    } catch (e) {
      toast.addError((e as Error).message);
    }
  };

  const handleReactivate = async (id: number, name: string) => {
    if (!confirm(`ต้องการเปิดใช้งานผู้เช่า "${name}" ใช่หรือไม่?`)) return;
    try {
      await tenantsApi.update(id, { status: 'active' });
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: 'active' } : t));
      toast.addSuccess('เปิดใช้งานผู้เช่าสำเร็จ');
    } catch (e) {
      toast.addError((e as Error).message);
    }
  };

  const filtered = tenants.filter(t =>
    !search || `${t.first_name}${t.last_name}${t.phone}${t.id_card}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-50">
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <h1 className="page-title">จัดการผู้เช่า</h1>
        </div>
        <button onClick={openCreate} disabled={saving} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          เพิ่มผู้เช่าใหม่
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, นามสกุล, เบอร์โทร..."
          className="input pl-10"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-4 bg-surface-200 rounded w-32" />
                <div className="h-4 bg-surface-200 rounded w-24" />
                <div className="h-4 bg-surface-200 rounded w-16" />
                <div className="h-4 bg-surface-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="table-container overflow-x-auto">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th className="min-w-[120px]">ชื่อ</th>
                <th className="min-w-[100px]">เบอร์โทร</th>
                <th className="min-w-[120px]">บัตรประชาชน</th>
                <th className="min-w-[80px] text-center">สถานะ</th>
                <th className="min-w-[60px]">ห้องที่</th>
                <th className="min-w-[100px]">วันเริ่มเช่า</th>
                <th className="min-w-[100px]">วันสิ้นสุด</th>
                <th className="min-w-[60px] text-center">เอกสาร</th>
                <th className="text-right"><span className="sr-only">จัดการ</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-surface-400">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span className="text-sm">
                        {search ? 'ไม่พบผู้เช่าที่ตรงกับการค้นหา' : 'ยังไม่มีผู้เช่า · คลิกเพิ่มผู้เช่า'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="font-medium text-surface-800">{t.first_name} {t.last_name}</div>
                  </td>
                  <td>{t.phone || '-'}</td>
                  <td className="text-surface-600">{t.id_card || '-'}</td>
                  <td className="text-center">
                    {t.status === 'active' ? (
                      <span className="badge-success">พร้อมใช้งาน</span>
                    ) : (
                      <span className="badge-neutral">ระงับแล้ว</span>
                    )}
                  </td>
                  <td>{t.room_number || '-'}</td>
                  <td>{formatDate(t.lease_start_date)}</td>
                  <td>{formatDate(t.lease_end_date)}</td>
                  <td className="text-center">
                    {t.document_path ? (
                      <a
                        href={`/api/tenants/${t.id}/document`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:text-brand-700"
                      >
                        <svg className="w-5 h-5 inline" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-surface-300">-</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="btn-ghost btn-sm p-1.5"
                        aria-label="แก้ไข"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </button>
                      {t.status === 'active' ? (
                        <>
                          <button
                            onClick={() => handleDeactivate(t.id, `${t.first_name} ${t.last_name}`)}
                            className="btn-ghost btn-sm p-1.5 text-warning-dark"
                            aria-label="ระงับ"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, `${t.first_name} ${t.last_name}`)}
                            className="btn-ghost btn-sm p-1.5 text-danger"
                            aria-label="ลบ"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReactivate(t.id, `${t.first_name} ${t.last_name}`)}
                            className="btn-ghost btn-sm p-1.5 text-success-dark"
                            aria-label="เปิดใช้งาน"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, `${t.first_name} ${t.last_name}`)}
                            className="btn-ghost btn-sm p-1.5 text-danger"
                            aria-label="ลบถาวร"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? 'เพิ่มผู้เช่าใหม่' : 'แก้ไขผู้เช่า'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="input-label">ชื่อจริง <span className="text-danger">*</span></label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={e => setForm(s => ({ ...s, first_name: e.target.value }))}
                className="input"
                placeholder="ชื่อจริง"
              />
            </div>
            <div>
              <label className="input-label">นามสกุล <span className="text-danger">*</span></label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={e => setForm(s => ({ ...s, last_name: e.target.value }))}
                className="input"
                placeholder="นามสกุล"
              />
            </div>
            <div>
              <label className="input-label">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
                className="input"
                placeholder="เบอร์โทรศัพท์"
              />
            </div>
            <div>
              <label className="input-label">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                className="input"
                placeholder="อีเมล (ไม่บังคับ)"
              />
            </div>
            <div>
              <label className="input-label">บัตรประชาชน</label>
              <input
                type="text"
                value={form.id_card}
                onChange={e => setForm(s => ({ ...s, id_card: e.target.value }))}
                className="input"
                placeholder="เลขบัตรประชาชน 13 หลัก"
                maxLength={13}
              />
            </div>
            <div>
              <label className="input-label">วันเริ่มเช่า</label>
              <input
                type="date"
                value={form.lease_start_date}
                onChange={e => setForm(s => ({ ...s, lease_start_date: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="input-label">วันสิ้นสุดเช่า</label>
              <input
                type="date"
                value={form.lease_end_date}
                onChange={e => setForm(s => ({ ...s, lease_end_date: e.target.value }))}
                className="input"
              />
            </div>
            <div className="sm:col-span-full">
              <label className="input-label">หมายเหตุ</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
                className="input"
                placeholder="หมายเหตุ (ไม่บังคับ)"
              />
            </div>
            <div className="sm:col-span-full">
              <label className="input-label">เอกสาร (สูงสุด 10MB)</label>
              <input
                type="file"
                onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                className="input"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
              />
              {mode === 'edit' && editId && (
                <div className="mt-2 flex items-center gap-2">
                  {(() => {
                    const tenant = tenants.find(t => t.id === editId);
                    if (tenant?.document_path) {
                      return (
                        <>
                          <a
                            href={`/api/tenants/${editId}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-brand-600 hover:underline"
                          >
                            ดูเอกสารปัจจุบัน
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(editId)}
                            className="text-sm text-danger hover:underline"
                          >
                            ลบเอกสาร
                          </button>
                        </>
                      );
                    }
                    return <span className="text-sm text-surface-400">ยังไม่มีเอกสาร</span>;
                  })()}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังบันทึก...
                </>
              ) : mode === 'create' ? 'เพิ่ม' : 'บันทึก'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              ยกเลิก
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

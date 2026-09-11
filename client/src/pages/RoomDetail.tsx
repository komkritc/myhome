import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roomsApi, tenantsApi } from '../services/api';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/date';

interface RoomDetail {
  id: number;
  room_number: string;
  floor: number;
  status: string;
  rental_price: number;
  electric_rate: number;
  water_rate: number;
  service_charge: number;
  security_deposit: number;
  description?: string | null;
  current_tenant_id?: number | null;
  current_tenant_name?: string | null;
}

interface TenantDetail {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  id_card?: string | null;
  status: string;
  room_number?: string | null;
  lease_start_date?: string | null;
  lease_end_date?: string | null;
  document_path?: string | null;
}

const statusColors: Record<string, string> = {
  available: 'badge-success',
  occupied: 'badge-info',
  booked: 'badge-warning',
  maintenance: 'badge-danger',
};
const statusLabels: Record<string, string> = {
  available: 'ว่าง',
  occupied: 'มีผู้เช่า',
  booked: 'จองแล้ว',
  maintenance: 'ปิดปรับปรุง',
};

function getRemainingMonths(endDate: string | null | undefined): string {
  if (!endDate) return '-';
  const end = new Date(endDate);
  const now = new Date();
  if (end <= now) return 'สิ้นสุดแล้ว';
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  const days = end.getDate() - now.getDate();
  if (months < 0) return 'สิ้นสุดแล้ว';
  if (months === 0 && days <= 0) return 'สิ้นสุดแล้ว';
  if (months === 0) return `${days} วัน`;
  if (days < 0) return `${months - 1} เดือน ${30 + days} วัน`;
  return `${months} เดือน ${days} วัน`;
}

const HeroIcon = ({ name, className = 'w-5 h-5' }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    building: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    user: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    currency: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bolt: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    droplet: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-6 7.5-6 12a6 6 0 1012 0c0-4.5-6-12-6-12z" />
      </svg>
    ),
    wrench: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 2.69a1.5 1.5 0 01-1.784-1.784l2.69-5.384a9.034 9.034 0 013.167 3.167L15.17 11.42a3.75 3.75 0 015.303 5.303l-3.375 3.375a3.75 3.75 0 01-5.303-5.303l.675-.675" />
      </svg>
    ),
    shield: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    document: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    arrowLeft: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    ),
    close: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    ),
    plus: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    chart: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    tag: (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const SkeletonLoader = () => (
  <div className="space-y-5 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="h-8 w-32 bg-surface-200 rounded" />
      <div className="h-8 w-20 bg-surface-200 rounded-full" />
    </div>
    <div className="card p-6 space-y-4">
      <div className="h-5 w-40 bg-surface-200 rounded" />
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 bg-surface-200 rounded" />
            <div className="h-4 w-32 bg-surface-200 rounded" />
          </div>
        ))}
      </div>
    </div>
    <div className="card p-6 space-y-4">
      <div className="h-5 w-32 bg-surface-200 rounded" />
      <div className="h-10 w-full bg-surface-200 rounded-lg" />
    </div>
  </div>
);

export default function RoomDetail() {
  const toast = useToast();
  const params = useParams();
  const roomId = Number(params.id) || 0;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [availableTenants, setAvailableTenants] = useState<TenantDetail[]>([]);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);

  useEffect(() => { loadRoom(); }, [roomId]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      let roomData: RoomDetail;
      if (typeof params.id === 'string' && /^[0-9]+$/.test(params.id)) {
        const res = await roomsApi.getOne(Number(params.id));
        roomData = res.data as RoomDetail;
      } else {
        const res = await roomsApi.getOne(params.id!);
        roomData = res.data as RoomDetail;
      }
      setRoom(roomData);
      
      // Load tenant details if tenant exists
      if (roomData.current_tenant_id) {
        try {
          const tenantRes = await tenantsApi.getOne(roomData.current_tenant_id);
          setTenantDetail(tenantRes.data as TenantDetail);
        } catch {
          setTenantDetail(null);
        }
      }
    } catch (e) {
      toast.addError(`โหลดข้อมูลห้องไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = async () => {
    try {
      setAssignModalOpen(true);
      const res = await tenantsApi.getAll();
      const data = Array.isArray(res.data) ? res.data : [];
      setAvailableTenants(data as TenantDetail[]);
    } catch {
      setAvailableTenants([]);
    }
  };

  const handleAssign = async () => {
    if (!roomId || !selectedTenantId) return;
    setSaveLoading(true);
    try {
      await roomsApi.updateStatus(roomId, { status: 'occupied', tenant_id: String(selectedTenantId) });
      const res = await roomsApi.getOne(roomId);
      setRoom(res.data as RoomDetail);
      setAssignModalOpen(false);
      setSelectedTenantId(null);
      toast.addSuccess('มอบหมายผู้เช่าสำเร็จ');
    } catch (e) {
      toast.addError(`มอบหมายผู้เช่าล้มเหลว: ${(e as Error).message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!roomId || !room?.current_tenant_id) return;
    if (!confirm(`ต้องการยกเลิกห้อง "${room.room_number}" ใช่หรือไม่?`)) return;

    setSaveLoading(true);
    try {
      await roomsApi.updateStatus(roomId, { status: 'available', tenant_id: '' });
      const res = await roomsApi.getOne(roomId);
      setRoom({ ...(res.data as RoomDetail), current_tenant_id: null });
      toast.addSuccess('ยกเลิกห้องสำเร็จ');
    } catch (e) {
      toast.addError(`ยกเลิกห้องไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <SkeletonLoader />;

  if (!room) return (
    <div className="card p-8 text-center">
      <div className="flex justify-center mb-4 text-surface-300">
        <HeroIcon name="document" className="w-12 h-12" />
      </div>
      <p className="text-surface-500 mb-4">ไม่พบข้อมูลห้อง</p>
      <Link to="/rooms" className="btn-primary inline-flex">
        <HeroIcon name="arrowLeft" className="w-4 h-4" />
        กลับไปยังหน้าจัดการห้อง
      </Link>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/rooms" className="text-brand-600 hover:text-brand-700 text-sm mb-2 inline-flex items-center gap-1">
            <HeroIcon name="arrowLeft" className="w-4 h-4" />
            กลับไปจัดการห้อง
          </Link>
          <h1 className="page-title text-xl flex items-center gap-2">
            <HeroIcon name="building" className="w-6 h-6 text-brand-600" />
            ห้อง {room.room_number}
          </h1>
        </div>
        <span className={statusColors[room.status] || 'badge-neutral'}>
          {statusLabels[room.status]}
        </span>
      </div>

      {/* Room Info */}
      <div className="card p-6">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {[
            { icon: 'building', label: 'ชั้น', value: `ชั้น ${room.floor}` },
            { icon: 'currency', label: 'ค่าเช่า/เดือน', value: `฿${room.rental_price.toLocaleString()}` },
            { icon: 'bolt', label: 'อัตราค่าไฟฟ้า', value: `฿${room.electric_rate}/หน่วย` },
            { icon: 'droplet', label: 'อัตราค่าน้ำ', value: `฿${room.water_rate}/m³` },
            { icon: 'wrench', label: 'ค่าบริการ', value: `฿${room.service_charge || 100}/เดือน` },
            { icon: 'shield', label: 'เงินมัดจำ', value: `฿${room.security_deposit.toLocaleString()}` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-50 transition-colors">
              <span className="flex items-center gap-2 text-surface-500">
                <HeroIcon name={icon} className="w-4 h-4 text-surface-400" />
                {label}
              </span>
              <span className="font-medium text-surface-800">{value}</span>
            </div>
          ))}
          {room.description && (
            <div className="sm:col-span-full flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-surface-50 transition-colors">
              <HeroIcon name="document" className="w-4 h-4 text-surface-400" />
              <span className="text-surface-500">หมายเหตุ</span>
              <span className="ml-2 font-medium text-surface-800">{room.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Tenant */}
      <div className="card p-6">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <HeroIcon name="user" className="w-5 h-5 text-surface-400" />
          ข้อมูลผู้เช่า
        </h2>
        {room.current_tenant_id && tenantDetail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
                <HeroIcon name="user" className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-surface-800">{tenantDetail.first_name} {tenantDetail.last_name}</p>
                <span className="badge-success text-xs">ผู้เช่าปัจจุบัน</span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-surface-100">
              {tenantDetail.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <HeroIcon name="bolt" className="w-4 h-4 text-surface-400" />
                  <span className="text-surface-500">เบอร์โทร:</span>
                  <span className="font-medium text-surface-700">{tenantDetail.phone}</span>
                </div>
              )}
              {tenantDetail.email && (
                <div className="flex items-center gap-2 text-sm">
                  <HeroIcon name="document" className="w-4 h-4 text-surface-400" />
                  <span className="text-surface-500">อีเมล:</span>
                  <span className="font-medium text-surface-700">{tenantDetail.email}</span>
                </div>
              )}
              {tenantDetail.id_card && (
                <div className="flex items-center gap-2 text-sm">
                  <HeroIcon name="shield" className="w-4 h-4 text-surface-400" />
                  <span className="text-surface-500">บัตรประชาชน:</span>
                  <span className="font-medium text-surface-700">{tenantDetail.id_card}</span>
                </div>
              )}
            </div>
            
            {/* Lease Details */}
            {(tenantDetail.lease_start_date || tenantDetail.lease_end_date) && (
              <div className="pt-3 border-t border-surface-100">
                <h3 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-2">
                  <HeroIcon name="tag" className="w-4 h-4 text-surface-400" />
                  รายละเอียดการเช่า
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {tenantDetail.lease_start_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-surface-500">วันเริ่มเช่า:</span>
                      <span className="font-medium text-surface-700">{formatDate(tenantDetail.lease_start_date)}</span>
                    </div>
                  )}
                  {tenantDetail.lease_end_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-surface-500">วันสิ้นสุด:</span>
                      <span className="font-medium text-surface-700">{formatDate(tenantDetail.lease_end_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-surface-500">ระยะเวลาเช่าคงเหลือ:</span>
                    <span className={`font-medium ${getRemainingMonths(tenantDetail.lease_end_date) === 'สิ้นสุดแล้ว' ? 'text-danger' : 'text-success'}`}>
                      {getRemainingMonths(tenantDetail.lease_end_date)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Document */}
            {tenantDetail.document_path && (
              <div className="pt-3 border-t border-surface-100">
                <h3 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-2">
                  <HeroIcon name="document" className="w-4 h-4 text-surface-400" />
                  เอกสาร
                </h3>
                <a
                  href={`/api/tenants/${tenantDetail.id}/document`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 text-sm"
                >
                  <HeroIcon name="document" className="w-4 h-4" />
                  ดูเอกสาร
                </a>
              </div>
            )}
            <div className="pt-3 border-t border-surface-100">
              <button onClick={handleRelease} disabled={saveLoading} className="btn-danger btn-sm">
                {saveLoading ? 'กำลังดำเนินการ...' : 'ยกเลิกผู้เช่า'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-surface-100 flex items-center justify-center">
              <HeroIcon name="user" className="w-7 h-7 text-surface-300" />
            </div>
            <div>
              <p className="text-surface-500 font-medium">ว่าง — ไม่มีผู้เช่า</p>
              <p className="text-xs text-surface-400">คลิกปุ่มด้านล่างเพื่อมอบหมายผู้เช่า</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {room.status !== 'occupied' && !saveLoading && (
          <button onClick={openAssignModal} className="btn-primary">
            <HeroIcon name="user" className="w-4 h-4" />
            มอบหมายผู้เช่า
          </button>
        )}
        {room.status !== 'maintenance' && (
          <Link to={`/meters?room=${room.room_number}`} className="btn-secondary">
            <HeroIcon name="chart" className="w-4 h-4" />
            บันทึกมิเตอร์
          </Link>
        )}
      </div>

      {/* Assign Tenant Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAssignModalOpen(false)} />
          <div className="relative bg-white rounded-card shadow-elevated w-full max-w-lg p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h2 className="page-title flex items-center gap-2">
                <HeroIcon name="user" className="w-5 h-5 text-brand-600" />
                มอบหมายผู้เช่า → ห้อง {room.room_number}
              </h2>
              <button onClick={() => setAssignModalOpen(false)} className="btn-ghost btn-sm p-1">
                <HeroIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            {availableTenants.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex justify-center mb-3 text-surface-300">
                  <HeroIcon name="user" className="w-12 h-12" />
                </div>
                <p className="text-surface-400">ไม่มีผู้เช่าพร้อมใช้งาน</p>
              </div>
            ) : (
              <div>
                <label className="input-label">เลือกผู้เช่า</label>
                <select value={selectedTenantId || ''} onChange={e => setSelectedTenantId(Number(e.target.value) || null)} className="input">
                  <option value="">-- เลือกผู้เช่า --</option>
                  {availableTenants.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.phone || '-'})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleAssign} disabled={!selectedTenantId || saveLoading} className="btn-primary flex-1">
                <HeroIcon name="check" className="w-4 h-4" />
                {saveLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
              <button onClick={() => setAssignModalOpen(false)} className="btn-secondary">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

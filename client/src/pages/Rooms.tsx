import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Input from '../components/Input';
import { roomsApi, tenantsApi } from '../services/api';
import { useToast } from '../components/Toast';
import type { Tenant } from '../types';

interface RoomWithTenant {
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
}

interface FormState {
  room_number: string;
  floor: string;
  rental_price: string;
  electric_rate: string;
  water_rate: string;
  service_charge: string;
  security_deposit: string;
  description: string;
  status: string;
  selected_tenant_id: string;
  has_tenant: boolean;
  tenant_first_name: string;
  tenant_last_name: string;
  tenant_phone: string;
  tenant_email: string;
  tenant_id_card: string;
}

const statusBadgeClass: Record<string, string> = {
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

const IconBuilding = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 0 0-.75.75v16.5a.75.75 0 0 0 .75.75h15a.75.75 0 0 0 .75-.75V6.487a.75.75 0 0 0-.22-.53L17.28 2.78a.75.75 0 0 0-.53-.22H4.5ZM3.75 3A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21h15A2.25 2.25 0 0 0 21 18.75V5.25A2.25 2.25 0 0 0 18.75 3h-15ZM9 7.5A.75.75 0 0 1 9.75 6.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 7.5Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75ZM6 18a.75.75 0 0 0 .75.75h6.5a.75.75 0 0 0 0-1.5h-6.5A.75.75 0 0 0 6 18Z" clipRule="evenodd" />
  </svg>
);

const IconUser = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
  </svg>
);

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-surface-400">
    <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
  </svg>
);

const IconCurrency = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.305a2.251 2.251 0 0 1-.786-.393c-.394-.313-.546-.681-.546-.964 0-.283.152-.651.546-.964ZM12.75 15.662v-2.305c.289.085.56.216.786.393.394.313.546.681.546.964 0 .283-.152.651-.546.964a2.251 2.251 0 0 1-.786-.393Z" />
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clipRule="evenodd" />
  </svg>
);

const IconPencil = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
  </svg>
);

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.051 15.1 4.5 15.1 6.012v.227a51.87 51.87 0 0 0-4.2 0V6.012c0-1.512.71-2.961 1.727-3.54ZM4.5 9.75a.75.75 0 0 1 .75-.75h14.25a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
  </svg>
);

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const IconUserGroup = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
  </svg>
);

export default function Rooms() {
  const toast = useToast();
const [tenants, setTenants] = useState<Tenant[]>([]);
 const [rooms, setRooms] = useState<RoomWithTenant[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editingRoom, setEditingRoom] = useState<RoomWithTenant | null>(null);
const [editForm, setEditForm] = useState<FormState>({ room_number: '', floor: '1', rental_price: '3500', electric_rate: '8', water_rate: '18', service_charge: '100', security_deposit: '2000', description: '', status: 'available', selected_tenant_id: '', has_tenant: false, tenant_first_name: '', tenant_last_name: '', tenant_phone: '', tenant_email: '', tenant_id_card: '' });
 // Create form state
const [form, setForm] = useState<FormState>({ room_number: '', floor: '1', rental_price: '3500', electric_rate: '8', water_rate: '18', service_charge: '100', security_deposit: '2000', description: '', status: 'available', selected_tenant_id: '', has_tenant: false, tenant_first_name: '', tenant_last_name: '', tenant_phone: '', tenant_email: '', tenant_id_card: '' });

  // Load active tenants for dropdown
useEffect(() => { void (async () => { try { const res = await tenantsApi.getAll(); setTenants(Array.isArray(res.data) ? res.data : []); } catch {} })(); }, []);
  const loadRooms = async () => {
    try {
      setLoading(true);
      const res = await roomsApi.getAll(statusFilter || undefined, undefined, search || undefined);
      const items = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setRooms(items as RoomWithTenant[]);
    } catch (e) {
      toast.addError(`โหลดข้อมูลห้องล้มเหลว: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRooms(); }, [statusFilter, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.room_number.trim()) return;
    try {
      // Build payload — convert numeric fields, add tenant if provided
      const body: Record<string, unknown> = {};
      body.room_number = form.room_number;
      body.floor = +form.floor || 1;
      body.rental_price = parseFloat(form.rental_price) || 0;
      body.electric_rate = parseFloat(form.electric_rate) || 0;
      body.water_rate = parseFloat(form.water_rate) || 0;
      body.service_charge = parseFloat(form.service_charge) || 0;
      body.security_deposit = parseFloat(form.security_deposit) || 0;
      body.description = form.description || '';
      if (form.has_tenant) {
        body.tenant = {
          first_name: form.tenant_first_name,
          last_name: form.tenant_last_name,
          phone: form.tenant_phone,
          email: form.tenant_email,
          id_card: form.tenant_id_card,
        };
      }
      await roomsApi.create(body);
      void loadRooms();
      setForm({ room_number: '', floor: '1', rental_price: '3500', electric_rate: '8', water_rate: '18', service_charge: '100', security_deposit: '2000', description: '', status: 'available', selected_tenant_id: '', has_tenant: false, tenant_first_name: '', tenant_last_name: '', tenant_phone: '', tenant_email: '', tenant_id_card: '' });
      toast.addSuccess('เพิ่มห้องสำเร็จ');
    } catch (e) {
      toast.addError(`เพิ่มห้องไม่สำเร็จ: ${(e as Error).message}`);
    }
  };

  const handleDelete = async (id: number, room_number: string) => {
    if (!confirm(`ต้องการลบห้อง "${room_number}" ใช่หรือไม่?`)) return;
    try {
      await roomsApi.delete(id);
      setRooms(prev => prev.filter(r => r.id !== id));
      toast.addSuccess('ลบห้องสำเร็จ');
    } catch (e) {
      toast.addError(`ลบห้องไม่สำเร็จ: ${(e as Error).message}`);
      setRooms(prev => [...prev]);
    }
  };
  const startEdit = (room: RoomWithTenant) => {
    setEditingRoom(room);
    setEditForm({
      room_number: room.room_number, floor: String(room.floor),
      rental_price: String(room.rental_price), electric_rate: String(room.electric_rate),
      water_rate: String(room.water_rate), service_charge: String(room.service_charge),
      security_deposit: String(room.security_deposit), description: room.description || '',
      status: room.status,
      selected_tenant_id: room.current_tenant_id ? String(room.current_tenant_id) : '',
      has_tenant: false, tenant_first_name: '', tenant_last_name: '',
      tenant_phone: '', tenant_email: '', tenant_id_card: '',
    });
  };
  const handleSaveEdit = async (e: React.FormEvent) => {
    if (!editingRoom || !editForm.room_number.trim()) return;
    e.preventDefault();
    try {
      await roomsApi.update(editingRoom.id, {
        room_number: editForm.room_number, floor: +editForm.floor || 1,
        rental_price: parseFloat(editForm.rental_price) || 0,
        electric_rate: parseFloat(editForm.electric_rate) || 0,
        water_rate: parseFloat(editForm.water_rate) || 0,
        service_charge: parseFloat(editForm.service_charge) || 0,
        security_deposit: parseFloat(editForm.security_deposit) || 0,
        description: editForm.description || '',
        tenant_id: editForm.selected_tenant_id ? parseInt(editForm.selected_tenant_id) : undefined,
      });
      setEditingRoom(null);
      loadRooms();
      toast.addSuccess('แก้ไขห้องสำเร็จ');
    } catch (e) {
      toast.addError(`แก้ไขห้องไม่สำเร็จ: ${(e as Error).message}`);
    }
  };

  const filtered = rooms.filter(room =>
    !search || room.room_number.includes(search) || (room.description?.includes(search))
  );

  const filterButtons: [string, string][] = [
    ['', 'ทั้งหมด'],
    ['available', 'ว่าง'],
    ['occupied', 'มีผู้เช่า'],
    ['booked', 'จองแล้ว'],
    ['maintenance', 'ปิดปรับปรุง'],
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2">
          <IconBuilding />
          จัดการห้องพัก
        </h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <IconPlus />
          เพิ่มห้องใหม่
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconSearch /></span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเลขห้อง..."
              className="input pl-9 w-56" />
          </div>
          {filterButtons.map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`btn-sm rounded-full transition-colors ${
                statusFilter === val
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 bg-surface-200 rounded w-24" />
                <div className="h-5 bg-surface-200 rounded-full w-16" />
              </div>
              <div className="h-4 bg-surface-100 rounded w-32 mb-2" />
              <div className="h-4 bg-surface-100 rounded w-20 mb-4" />
              <div className="flex gap-2">
                <div className="h-8 bg-surface-100 rounded-lg flex-1" />
                <div className="h-8 bg-surface-100 rounded-lg w-10" />
                <div className="h-8 bg-surface-100 rounded-lg w-10" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center p-8">
              <div className="card p-8 text-surface-400">
                {search || statusFilter ? 'ไม่พบข้อมูลที่ตรงกับการค้นหา' : 'ยังไม่มีห้อง · คลิกเพิ่มห้องใหม่'}
              </div>
            </div>
          ) : filtered.map(room => (
            <div key={room.id} className="card-hover p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-surface-800">
                  {room.room_number}{room.description ? ` (${room.description})` : ''}
                </h3>
                {(() => {
                  const badgeClass = statusBadgeClass[room.status] || 'badge-success';
                  return <span className={badgeClass}>{statusLabels[room.status]}</span>;
                })()}
              </div>

              <div className="space-y-1.5 text-sm text-surface-600 mb-4 flex-1">
                {room.current_tenant_id && (
                  <p className="flex items-center gap-1.5">
                    <IconUser />
                    {tenants.find(t => t.id === room.current_tenant_id)?.first_name || ''}{' '}
                    {tenants.find(t => t.id === room.current_tenant_id)?.last_name || ''}
                  </p>
                )}
                <p className="flex items-center gap-1.5">
                  <IconCurrency />
                  ฿{room.rental_price.toLocaleString()}/เดือน
                </p>
                {room.current_tenant_id && (() => {
                  const tenant = tenants.find(t => t.id === room.current_tenant_id);
                  const remaining = getRemainingMonths(tenant?.lease_end_date);
                  if (remaining === '-') return null;
                  return (
                    <p className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
                      </svg>
                      <span className={remaining === 'สิ้นสุดแล้ว' ? 'text-danger' : ''}>
                        ระยะเวลาเช่าคงเหลือ: {remaining}
                      </span>
                    </p>
                  );
                })()}
              </div>

              <div className="flex gap-2 pt-2 border-t border-surface-100">
                <Link to={`/room/${room.id}`}
                  className="btn-ghost btn-sm flex-1 justify-center text-surface-600">
                  ดูรายละเอียด
                </Link>
                <button onClick={() => startEdit(room)} title="แก้ไข"
                  className="btn-ghost btn-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50">
                  <IconPencil />
                </button>
                <button onClick={() => handleDelete(room.id, room.room_number)}
                  className="btn-ghost btn-sm text-danger hover:bg-danger-light"
                  aria-label="ลบห้อง">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && <CreateRoomModal form={form} setForm={setForm} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} />}
      {editingRoom && <EditRoomModal room={editingRoom} form={editForm} setForm={setEditForm} onClose={() => setEditingRoom(null)} onSubmit={handleSaveEdit} tenants={tenants} />}
    </div>
  );
}

function CreateRoomModal({
  onClose, onSubmit, form, setForm,
}: {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative bg-white rounded-card shadow-elevated w-full max-w-md p-6 space-y-4 animate-scale-in">
        <div className="flex justify-between items-center">
          <h2 className="page-title flex items-center gap-2">
            <IconBuilding />
            เพิ่มห้องใหม่
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm p-1">
            <IconClose />
          </button>
        </div>

        <Input label="เลขห้อง *" required placeholder="เช่น 11" value={form.room_number}
          onChange={(e) => setForm(p => ({ ...p, room_number: e.target.value }))} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ชั้น</label>
            <input type="number" value={form.floor} min="1" max="10" placeholder="1"
              onChange={(e) => setForm(p => ({ ...p, floor: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าเช่า (฿/เดือน)</label>
            <input type="number" value={form.rental_price} min="0" step="100" placeholder="3500"
              onChange={(e) => setForm(p => ({ ...p, rental_price: e.target.value }))}
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ค่าไฟ (฿/หน่วย)</label>
            <input type="number" value={form.electric_rate} min="0" step="0.5" placeholder="8"
              onChange={(e) => setForm(p => ({ ...p, electric_rate: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าน้ำ (฿/หน่วย)</label>
            <input type="number" value={form.water_rate} min="0" step="1" placeholder="18"
              onChange={(e) => setForm(p => ({ ...p, water_rate: e.target.value }))}
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ค่าบริการ (฿/เดือน)</label>
            <input type="number" value={form.service_charge} min="0" step="50" placeholder="100"
              onChange={(e) => setForm(p => ({ ...p, service_charge: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">เงินประกัน (฿)</label>
            <input type="number" value={form.security_deposit} min="0" step="1" placeholder="2000"
              onChange={(e) => setForm(p => ({ ...p, security_deposit: e.target.value }))}
              className="input" />
          </div>
        </div>

        <button type="button" onClick={() => setForm(p => ({ ...p, has_tenant: !p.has_tenant }))}
          className={`btn-sm rounded-lg flex items-center gap-2 transition-colors ${
            form.has_tenant ? 'bg-brand-50 text-brand-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
          }`}>
          {form.has_tenant ? <IconUser /> : <IconUserGroup />}
          {form.has_tenant ? 'แก้ไขข้อมูลผู้เช่า' : 'เพิ่มข้อมูลผู้เช่า'}
        </button>

        {form.has_tenant && (<>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Input label="ชื่อจริง" placeholder="สมชาย" value={form.tenant_first_name}
              onChange={(e) => setForm(p => ({ ...p, tenant_first_name: e.target.value }))} />
            <Input label="นามสกุล" placeholder="ใจดี" value={form.tenant_last_name}
              onChange={(e) => setForm(p => ({ ...p, tenant_last_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="เบอร์โทรศัพท์ *" required placeholder="0812345678" value={form.tenant_phone}
              onChange={(e) => setForm(p => ({ ...p, tenant_phone: e.target.value }))} />
            <Input label="อีเมล" type="email" placeholder="email@example.com" value={form.tenant_email}
              onChange={(e) => setForm(p => ({ ...p, tenant_email: e.target.value }))} />
          </div>
          <Input label="เลขบัตรประชาชน" placeholder="1234567890123" value={form.tenant_id_card}
            onChange={(e) => setForm(p => ({ ...p, tenant_id_card: e.target.value }))} />
        </>)}

        <div>
          <label className="input-label">หมายเหตุ (ไม่บังคับ)</label>
          <input type="text" value={form.description} placeholder="รายละเอียดเพิ่มเติม"
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            className="input" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            <IconCheck />
            บันทึกห้อง
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
        </div>
      </form>
    </div>
  );
}

function EditRoomModal({
  room, form, setForm, onClose, onSubmit, tenants,
}: {
  room: RoomWithTenant;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  tenants: Tenant[];
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative bg-white rounded-card shadow-elevated w-full max-w-md p-6 space-y-4 animate-scale-in">
        <div className="flex justify-between items-center">
          <h2 className="page-title flex items-center gap-2">
            <IconBuilding />
            แก้ไขห้อง {room.room_number}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm p-1">
            <IconClose />
          </button>
        </div>

        <Input label="เลขห้อง *" required placeholder="เช่น 11" value={form.room_number}
          onChange={(e) => setForm(p => ({ ...p, room_number: e.target.value }))} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ชั้น</label>
            <input type="number" value={form.floor} min="1" max="10" placeholder="1"
              onChange={(e) => setForm(p => ({ ...p, floor: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าเช่า (฿/เดือน)</label>
            <input type="number" value={form.rental_price} min="0" step="100" placeholder="3500"
              onChange={(e) => setForm(p => ({ ...p, rental_price: e.target.value }))}
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ค่าไฟ (฿/หน่วย)</label>
            <input type="number" value={form.electric_rate} min="0" step="0.5" placeholder="8"
              onChange={(e) => setForm(p => ({ ...p, electric_rate: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">ค่าน้ำ (฿/หน่วย)</label>
            <input type="number" value={form.water_rate} min="0" step="1" placeholder="18"
              onChange={(e) => setForm(p => ({ ...p, water_rate: e.target.value }))}
              className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">ค่าบริการ (฿/เดือน)</label>
            <input type="number" value={form.service_charge} min="0" step="50" placeholder="100"
              onChange={(e) => setForm(p => ({ ...p, service_charge: e.target.value }))}
              className="input" />
          </div>
          <div>
            <label className="input-label">เงินประกัน (฿)</label>
            <input type="number" value={form.security_deposit} min="0" step="1" placeholder="2000"
              onChange={(e) => setForm(p => ({ ...p, security_deposit: e.target.value }))}
              className="input" />
          </div>
        </div>

        <div>
          <label className="input-label">สถานะห้อง</label>
          <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
            className="input">
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">ผู้เช่า</label>
          <select value={form.selected_tenant_id} onChange={(e) => setForm(p => ({ ...p, selected_tenant_id: e.target.value }))}
            className="input">
            <option value="">-- ไม่มีผู้เช่า --</option>
            {tenants.map(t => (
              <option key={t.id} value={String(t.id)}>{t.first_name} {t.last_name || ''} - {t.phone}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">หมายเหตุ (ไม่บังคับ)</label>
          <input type="text" value={form.description} placeholder="รายละเอียดเพิ่มเติม"
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            className="input" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary flex-1">
            <IconCheck />
            บันทึกการแก้ไข
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
        </div>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { metersApi, roomsApi, deviceMetersApi, meterReadingsApi, settingsApi } from '../services/api';
import { useToast } from '../components/Toast';
import { THAI_MONTHS } from '../utils/date';
import type { Room, MeterReading } from '../types';
import type { DeviceMeter, MeterReadingEntry } from '../services/api';

type Tab = 'readings' | 'devices';

function round1(n: number) { return Math.round(n * 10) / 10; }

interface EditingReading {
  electric_before: number;
  water_before: number;
  electric_current: number;
  water_current: number;
  notes: string;
}

interface ReadingWithRoom {
  id: number;
  room_id: number;
  month: number;
  year: number;
  electric_before: number;
  water_before: number;
  electric_current: number;
  water_current: number;
  notes?: string | null;
  room_number: string;
}

const IconBolt = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
  </svg>
);

const IconChartBar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z" clipRule="evenodd" />
  </svg>
);

const IconWrench = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12 6.75a5.25 5.25 0 0 1 6.775-5.025.75.75 0 0 1 .313 1.248l-3.32 3.319c.063.475.276.934.641 1.299.365.365.824.578 1.3.641l3.318-3.319a.75.75 0 0 1 1.248.313 5.25 5.25 0 0 1-5.472 6.756c-1.018-.087-1.87.1-2.309.634L7.344 21.3A3.298 3.298 0 1 1 2.7 16.657l8.932-8.932c.533-.44.72-1.291.634-2.309A5.342 5.342 0 0 1 12 6.75ZM4.115 15.18l4.4 4.4a3.301 3.301 0 0 0 4.4 4.4l4.4-4.4a3.301 3.301 0 0 0-4.4-4.4l-4.4 4.4Z" clipRule="evenodd" />
  </svg>
);

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
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

const IconEye = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path fillRule="evenodd" d="M1.323 11.447C2.968 7.684 5.868 5.25 9.75 5.25c3.882 0 6.782 2.434 8.427 6.197a.75.75 0 0 1-.577 1.103 11.54 11.54 0 0 0-1.682-.427 4.5 4.5 0 0 0-5.162 1.44A4.5 4.5 0 0 0 10.5 15a4.5 4.5 0 0 0-4.043-2.475 11.54 11.54 0 0 0-1.682.427.75.75 0 0 1-.578-1.103ZM9.75 6.75a3.75 3.75 0 0 0-3.462 2.252A10.517 10.517 0 0 1 5.727 10.5a10.02 10.02 0 0 0 .672 1.964.75.75 0 0 1-.368 1.046 10.5 10.5 0 0 0 3.383-.495.75.75 0 0 1 .368-.867 8.25 8.25 0 0 0 2.324-3.935A10.507 10.507 0 0 0 11.25 6.75c-.814 0-1.607.118-2.36.34a.75.75 0 0 1-.368-.867 10.507 10.507 0 0 0 1.228-2.595Z" clipRule="evenodd" />
  </svg>
);

const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
  </svg>
);

const IconXMark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const IconArrowPath = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm5.146.472a.75.75 0 0 1-.444.832l-1.903 1.903h3.183a.75.75 0 0 1 0 1.5H2.984a.75.75 0 0 1-.75-.75V4.356a.75.75 0 0 1 1.5 0v3.18l1.9-1.9a9 9 0 0 1 10.97-1.168.75.75 0 0 1 .444.832Z" clipRule="evenodd" />
  </svg>
);

const IconDocumentDuplicate = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375ZM6 12a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V12Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 15a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V15Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 18a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V18Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
  </svg>
);

const IconRadio = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M19.449 8.75l-3.941-4.118a.75.75 0 0 0-1.06-.008L9.551 8.75H4.56a.75.75 0 0 0-.53 1.28l7.89 8.217a.75.75 0 0 0 1.076-.006l7.892-8.217a.75.75 0 0 0-.53-1.28h-4.9Z" clipRule="evenodd" />
  </svg>
);

const IconWrenchScrewdriver = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12.516 3.3a.75.75 0 0 1 .474-.67 7.5 7.5 0 1 1 5.182 13.496.75.75 0 0 1-.97.34 6.001 6.001 0 1 0-4.686-12.166Zm-1.26 1.26a.75.75 0 0 1 .94-.276l3.75 2.25a.75.75 0 0 1 0 1.272l-3.75 2.25a.75.75 0 1 1-.764-1.292L13.44 12l-2.948-1.756a.75.75 0 0 1-.276-.94Z" clipRule="evenodd" />
  </svg>
);

const IconSignal = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M3.75 3a.75.75 0 0 1 .75.75c0 6.627 5.373 12 12 12a.75.75 0 0 1 0 1.5C9.37 17.25 3.75 11.63 3.75 3Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M6.75 8.25a.75.75 0 0 1 .75.75c0 4.97 4.03 9 9 9a.75.75 0 0 1 0 1.5c-5.799 0-10.5-4.701-10.5-10.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M9.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" clipRule="evenodd" />
  </svg>
);

const IconSearch = () => (
  <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

export default function Meters() {
  const [tab, setTab] = useState<Tab>('readings');
  const [refreshKey, setRefreshKey] = useState(0);
  const [_searchParams, _setSearchParams] = useSearchParams();

  const month = Number(_searchParams.get('month')) || new Date().getMonth() + 1;
  const year = Number(_searchParams.get('year')) || new Date().getFullYear();
  const filterRoomId = _searchParams.get('room') || '';

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === 'readings') {
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title flex items-center gap-2"><IconBolt /> มิเตอร์</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-surface-200">
        <button onClick={() => handleTabChange('readings')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${tab === 'readings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
          <IconChartBar /> บันทึกมิเตอร์
        </button>
        <button onClick={() => handleTabChange('devices')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${tab === 'devices' ? 'border-brand-600 text-brand-600' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
          <IconWrench /> อุปกรณ์มิเตอร์
        </button>
      </div>

      {tab === 'readings' && <ReadingsTab key={`${month}-${year}-${filterRoomId}-${refreshKey}`} month={month} year={year} filterRoomId={filterRoomId} />}
      {tab === 'devices' && <DevicesTab onReadingSent={() => setRefreshKey(k => k + 1)} />}
    </div>
  );
}

// ==================== READINGS TAB ====================
function ReadingsTab({ month, year, filterRoomId }: { month: number; year: number; filterRoomId: string }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [readings, setReadings] = useState<ReadingWithRoom[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditingReading | null>(null);

  const updateFilter = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    setSearchParams(next, { replace: true });
  };

  const loadReadings = async () => {
    setLoading(true);
    try {
      const [roomsRes, metersRes, prevRes] = await Promise.all([
        roomsApi.getAll(),
        metersApi.getAll(month, year, filterRoomId ? Number(filterRoomId) : undefined),
        metersApi.getAll(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year),
      ]);

      const allRooms = Array.isArray(roomsRes.data) ? roomsRes.data : [];
      setRooms(allRooms);
      const monthlyReadings = (metersRes.data || []) as Array<MeterReading & { room_number?: string }>;
      const prevReadings = (prevRes.data || []) as Array<MeterReading & { room_number?: string }>;

      const aggregated: ReadingWithRoom[] = [];

      for (const room of allRooms) {
        if (filterRoomId && room.id !== Number(filterRoomId)) continue;
        if (room.id === undefined) continue;

        const existing = monthlyReadings.find(m => m.room_id === room.id);
        const prev = prevReadings.find(m => m.room_id === room.id);

        if (existing) {
          aggregated.push({
            id: existing.id ?? room.id,
            room_id: room.id,
            month,
            year,
            electric_before: existing.electric_before,
            electric_current: existing.electric_current,
            water_before: existing.water_before,
            water_current: existing.water_current,
            room_number: existing.room_number ?? room.room_number,
            notes: existing.notes || '',
          });
        } else {
          aggregated.push({
            id: 0,
            room_id: room.id,
            month,
            year,
            electric_before: prev?.electric_current ?? 0,
            electric_current: 0,
            water_before: prev?.water_current ?? 0,
            water_current: 0,
            room_number: room.room_number,
            notes: '',
          });
        }
      }

      setReadings(aggregated);
    } catch(e) { toast.addError(`โหลดข้อมูลมิเตอร์ล้มเหลว: ${(e as Error).message}`); }
    setLoading(false);
  };

  useEffect(() => { loadReadings(); }, [month, year, filterRoomId]);

  const startEdit = (r: ReadingWithRoom) => {
    setEditingId(r.id);
    setEditDraft({ electric_before: r.electric_before, water_before: r.water_before, electric_current: r.electric_current, water_current: r.water_current, notes: r.notes || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const saveEdit = async (r: ReadingWithRoom) => {
    if (!editDraft) return;
    try {
      await metersApi.createOrUpdate({
        id: r.id, month: r.month, year: r.year, room_id: r.room_id,
        electric_before: editDraft.electric_before, water_before: editDraft.water_before,
        electric_current: editDraft.electric_current, water_current: editDraft.water_current,
        notes: editDraft.notes,
      });
      setEditingId(null); setEditDraft(null);
      loadReadings();
      toast.addSuccess('บันทึกการแก้ไขแล้ว');
    } catch(e) { toast.addError(`แก้ไขล้มเหลว: ${(e as Error).message}`); }
  };

  const monthsThai = THAI_MONTHS;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="page-title">บันทึกมิเตอร์ (รายเดือน)</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {monthsThai.slice(1).map((m, i) => (
          <button key={i} onClick={() => updateFilter({ month: String(i + 1) })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${month === i + 1 ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
            {m}
          </button>))}
        <span className="text-surface-400 text-sm">พ.ศ.</span>
        <input type="number" value={year} min={2000} max={2100} onChange={e => updateFilter({ year: e.target.value })}
          className="input w-20 text-center font-semibold" />

        <select value={filterRoomId} onChange={e => updateFilter({ room: e.target.value })}
          className="input ml-auto w-auto min-w-[140px]">
          <option value="">-- ห้องทั้งหมด --</option>
          {rooms.map((r) => <option key={r.id} value={String(r.id)}>{r.room_number}</option>)}
        </select>
      </div>

      {/* Readings Table */}
      <div className="table-container">
        <table className="table min-w-[700px]">
          <thead>
            <tr>
              <th>ห้อง</th>
              <th>เดือน/ปี</th>
              <th className="text-right">ค่าไฟฟ้า (ก่อน-ปัจจุบัน)</th>
              <th className="text-right">หน่วยที่ใช้</th>
              <th className="text-right">ค่าน้ำ (ก่อน-ปัจจุบัน)</th>
              <th className="text-right">หน่วยที่ใช้</th>
              <th>หมายเหตุ</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td><div className="h-4 bg-surface-100 rounded w-16 animate-pulse" /></td>
                    <td><div className="h-4 bg-surface-100 rounded w-24 animate-pulse" /></td>
                    <td className="text-right"><div className="h-4 bg-surface-100 rounded w-32 ml-auto animate-pulse" /></td>
                    <td className="text-right"><div className="h-4 bg-surface-100 rounded w-16 ml-auto animate-pulse" /></td>
                    <td className="text-right"><div className="h-4 bg-surface-100 rounded w-32 ml-auto animate-pulse" /></td>
                    <td className="text-right"><div className="h-4 bg-surface-100 rounded w-16 ml-auto animate-pulse" /></td>
                    <td><div className="h-4 bg-surface-100 rounded w-20 animate-pulse" /></td>
                    <td className="text-center"><div className="h-6 bg-surface-100 rounded w-6 mx-auto animate-pulse" /></td>
                  </tr>
                ))}
              </>
            ) : readings.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-surface-400">ไม่พบข้อมูลในเดือนนี้</td></tr>
            ) : readings.map((r: ReadingWithRoom) => {
              const elecUnits = Math.max(0, r.electric_current - (r.electric_before || 0));
              const waterUnits = Math.max(0, r.water_current - (r.water_before || 0));
              const isEditing = editingId === r.id;

              if (isEditing && editDraft) {
                return (
                  <tr key={r.id} className="bg-brand-50/50">
                    <td className="font-medium">{r.room_number}</td>
                    <td className="text-surface-500">{monthsThai[r.month]} {String(r.year).slice(2)}</td>
                    <td className="text-right">
                      <div className="flex gap-1 items-center justify-end">
                        <input type="number" value={editDraft.electric_before}
                          onChange={(e) => setEditDraft({ ...editDraft, electric_before: parseFloat(e.target.value) || 0 })}
                          className="input !w-20 !py-1 !text-xs text-right" placeholder="ก่อน" step="0.1" />
                        <span className="text-surface-300">-</span>
                        <input type="number" value={editDraft.electric_current}
                          onChange={(e) => setEditDraft({ ...editDraft, electric_current: parseFloat(e.target.value) || 0 })}
                          className="input !w-20 !py-1 !text-xs text-right" placeholder="ปัจจุบัน" step="0.1" />
                      </div>
                    </td>
                    <td className="text-right font-bold text-brand-600">
                      {round1(Math.max(0, editDraft.electric_current - editDraft.electric_before)).toLocaleString()}
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1 items-center justify-end">
                        <input type="number" value={editDraft.water_before}
                          onChange={(e) => setEditDraft({ ...editDraft, water_before: parseFloat(e.target.value) || 0 })}
                          className="input !w-20 !py-1 !text-xs text-right" placeholder="ก่อน" step="0.1" />
                        <span className="text-surface-300">-</span>
                        <input type="number" value={editDraft.water_current}
                          onChange={(e) => setEditDraft({ ...editDraft, water_current: parseFloat(e.target.value) || 0 })}
                          className="input !w-20 !py-1 !text-xs text-right" placeholder="ปัจจุบัน" step="0.1" />
                      </div>
                    </td>
                    <td className="text-right font-bold text-cyan-600">
                      {round1(Math.max(0, editDraft.water_current - editDraft.water_before)).toLocaleString()}
                    </td>
                    <td>
                      <input type="text" value={editDraft.notes}
                        onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                        placeholder="หมายเหตุ" className="input !py-1 !text-xs" />
                    </td>
                    <td className="text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => saveEdit(r)} className="btn-primary btn-sm !px-2.5"><IconCheck /> บันทึก</button>
                        <button onClick={cancelEdit} className="btn-secondary btn-sm !px-2.5"><IconXMark /> ยกเลิก</button>
                      </div>
                    </td>
                  </tr>);
              }

              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.room_number}</td>
                  <td className="text-surface-500">{monthsThai[r.month]} {String(r.year).slice(2)}</td>
                  <td className="text-right">{round1(r.electric_before)} / {round1(r.electric_current)}</td>
                  <td className="text-right font-bold text-brand-600">{round1(elecUnits).toLocaleString()}</td>
                  <td className="text-right">{round1(r.water_before)} / {round1(r.water_current)}</td>
                  <td className="text-right font-bold text-cyan-600">{round1(waterUnits).toLocaleString()}</td>
                  <td className="text-surface-400 text-xs max-w-[120px] truncate">{r.notes || '-'}</td>
                  <td className="text-center">
                    <button onClick={() => startEdit(r)} title="แก้ไข"
                      className="btn-ghost btn-sm !p-1.5"><IconPencil /></button>
                  </td>
                </tr>);})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== DEVICES TAB ====================
function DevicesTab({ onReadingSent }: { onReadingSent: () => void }) {
  const toast = useToast();
  const [devices, setDevices] = useState<DeviceMeter[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ room_id: '', meter_type: 'electricity', device_id: '' });
  const [selectedDevice, setSelectedDevice] = useState<DeviceMeter | null>(null);
  const [globalApiKey, setGlobalApiKey] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => { loadDevices(); loadRooms(); loadApiKey(); }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const r = await deviceMetersApi.getAll();
      setDevices(r.data || []);
    } catch(e) { toast.addError(`โหลดข้อมูลมิเตอร์ล้มเหลว: ${(e as Error).message}`); }
    setLoading(false);
  };

  const loadRooms = async () => {
    try {
      const r = await roomsApi.getAll();
      setRooms(Array.isArray(r.data) ? r.data : []);
    } catch(e) { toast.addError(`โหลดข้อมูลห้องล้มเหลว: ${(e as Error).message}`); }
  };

  const loadApiKey = async () => {
    try {
      const res = await settingsApi.getApiKey();
      setGlobalApiKey(res.data.api_key);
    } catch {
      generateApiKey();
    }
  };

  const generateApiKey = async () => {
    try {
      const res = await settingsApi.generateApiKey();
      setGlobalApiKey(res.data.api_key);
      toast.addSuccess('สร้าง API Key ใหม่แล้ว');
    } catch(e) {
      toast.addError(`สร้าง API Key ไม่สำเร็จ: ${(e as Error).message}`);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.room_id || !form.device_id) {
      toast.addError('กรุณาเลือกห้องและกรอก Device ID'); return;
    }
    try {
      await deviceMetersApi.create({
        room_id: Number(form.room_id),
        meter_type: form.meter_type,
        device_id: form.device_id,
        api_key: globalApiKey,
      });
      setFormOpen(false);
      setForm({ room_id: '', meter_type: 'electricity', device_id: '' });
      loadDevices();
      toast.addSuccess('เพิ่มมิเตอร์สำเร็จ');
    } catch(e) {
      toast.addError(`เพิ่มมิเตอร์ไม่สำเร็จ: ${(e as Error).message}`);
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (!confirm('ต้องการลบมิเตอร์นี้?')) return;
    try {
      await deviceMetersApi.delete(id);
      loadDevices();
      toast.addSuccess('ลบมิเตอร์สำเร็จ');
    } catch(e) {
      toast.addError(`ลบมิเตอร์ไม่สำเร็จ: ${(e as Error).message}`);
    }
  };

  const getStatusBadge = (device: DeviceMeter) => {
    if (!device.last_seen_at) return <span className="badge-neutral"><IconSignal /> ยังไม่เชื่อมต่อ</span>;
    const lastSeen = new Date(device.last_seen_at).getTime();
    const isOnline = Date.now() - lastSeen < 5 * 60 * 1000;
    return isOnline
      ? <span className="badge-success"><IconSignal /> Online</span>
      : <span className="badge-danger"><IconSignal /> Offline</span>;
  };

  const filteredDevices = devices.filter(d =>
    !search || 
    (d.room_number && d.room_number.includes(search)) ||
    (d.device_id && d.device_id.toLowerCase().includes(search.toLowerCase())) ||
    (d.meter_type && (d.meter_type === 'electricity' ? 'ไฟฟ้า' : 'น้ำ').includes(search))
  );

  const totalPages = Math.ceil(filteredDevices.length / perPage);
  const paginatedDevices = filteredDevices.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="page-title flex items-center gap-2"><IconWrench /> อุปกรณ์มิเตอร์ที่ลงทะเบียน</h2>
        <button onClick={() => setFormOpen(true)}
          className="btn-primary">
          <IconPlus /> เพิ่มมิเตอร์
        </button>
      </div>

      {/* Global API Key */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-surface-500"><path fillRule="evenodd" d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39.132.783.194 1.174a2.388 2.388 0 0 1-.922 3.006c-.28.192-.619.346-.99.45l-.462.136a.75.75 0 0 0-.58.835l.219.913a.75.75 0 0 0 .927.375l.383-.126a.75.75 0 0 1 .755.12l1.59 1.28a.75.75 0 0 0 1.024.063l.67-.557A8.721 8.721 0 0 0 22.5 14.25a6.75 6.75 0 0 0-6.75-6.75ZM12 9.75a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" clipRule="evenodd" /></svg>
            API Key สำหรับทุกอุปกรณ์
          </h3>
          <button onClick={generateApiKey}
            className="btn-secondary btn-sm">
            <IconArrowPath /> สร้างใหม่
          </button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-800 text-success-light p-2.5 rounded-lg text-xs font-mono overflow-x-auto">{globalApiKey || '...'}</code>
          <button onClick={() => { navigator.clipboard.writeText(globalApiKey); toast.addSuccess('คัดลอก API Key แล้ว'); }}
            className="btn-primary btn-sm whitespace-nowrap">
            <IconDocumentDuplicate /> คัดลอก
          </button>
        </div>
        <p className="text-xs text-surface-400 mt-2">ใช้ API Key เดียวกันสำหรับทุกอุปกรณ์มิเตอร์</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconSearch />
        </div>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="ค้นหาห้อง, Device ID, ประเภท..."
          className="input pl-9"
        />
      </div>

      {/* Device Table */}
      <div className="table-container">
        <table className="table min-w-[700px]">
          <thead>
            <tr>
              <th>ห้อง</th>
              <th>ประเภท</th>
              <th>Device ID</th>
              <th>หน่วย</th>
              <th className="text-center">สถานะ</th>
              <th className="text-right">ค่าล่าสุด</th>
              <th>เชื่อมต่อครั้งล่าสุด</th>
              <th className="text-center"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td><div className="h-4 bg-surface-100 rounded w-16 animate-pulse" /></td>
                    <td><div className="h-5 bg-surface-100 rounded-full w-16 animate-pulse" /></td>
                    <td><div className="h-4 bg-surface-100 rounded w-20 animate-pulse" /></td>
                    <td><div className="h-4 bg-surface-100 rounded w-12 animate-pulse" /></td>
                    <td className="text-center"><div className="h-5 bg-surface-100 rounded-full w-16 mx-auto animate-pulse" /></td>
                    <td className="text-right"><div className="h-4 bg-surface-100 rounded w-20 ml-auto animate-pulse" /></td>
                    <td><div className="h-4 bg-surface-100 rounded w-28 animate-pulse" /></td>
                    <td className="text-center"><div className="h-6 bg-surface-100 rounded w-14 mx-auto animate-pulse" /></td>
                  </tr>
                ))}
              </>
            ) : devices.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-surface-400">ยังไม่มีมิเตอร์ที่ลงทะเบียน</td></tr>
            ) : filteredDevices.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-surface-400">ไม่พบมิเตอร์ที่ตรงกับการค้นหา</td></tr>
            ) : paginatedDevices.map((d) => (
              <tr key={d.id}>
                <td className="font-medium">{d.room_number || '-'}</td>
                <td>
                  <span className={`badge ${d.meter_type === 'electricity' ? 'badge-warning' : 'badge-info'}`}>
                    {d.meter_type === 'electricity' ? <IconBolt /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97 2.197.315 4.467.47 6.652.47 2.185 0 4.455-.155 6.652-.47 1.978-.29 3.348-2.024 3.348-3.97V6.741c0-1.946-1.37-3.68-3.348-3.97A56.782 56.782 0 0 0 12 2.25ZM6.268 16.34c1.978-.29 3.348-2.024 3.348-3.97V9.07c-3.119.185-6.08.614-8.232 1.131-.657.159-1.142.723-1.142 1.403v4.116c0 .83.485 1.572 1.265 1.844a9.56 9.56 0 0 0 2.012.42Zm11.469-4.975c0-1.946 1.37-3.68 3.348-3.97a56.782 56.782 0 0 1 2.284.521c1.978.29 3.348 2.024 3.348 3.97v4.018c0 .83-.485 1.572-1.265 1.844a9.56 9.56 0 0 1-2.012.42c-2.035 0-4.067-.155-6.063-.454-.493-.076-.894-.413-.894-.915v-4.013Z" clipRule="evenodd" /></svg>}
                    {' '}{d.meter_type === 'electricity' ? 'ไฟฟ้า' : 'น้ำ'}
                  </span>
                </td>
                <td className="font-mono text-xs text-surface-500">{d.device_id}</td>
                <td className="text-surface-500">{d.unit}</td>
                <td className="text-center">{getStatusBadge(d)}</td>
                <td className="text-right font-bold text-surface-800">
                  {d.last_reading !== null && d.last_reading !== undefined ? round1(d.last_reading).toLocaleString() : '-'}
                </td>
                <td className="text-surface-400 text-xs">
                  {d.last_reading_time ? new Date(d.last_reading_time).toLocaleString('th-TH') : '-'}
                </td>
                <td className="text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => setSelectedDevice(d)} title="ดูรายละเอียด"
                      className="btn-ghost btn-sm !p-1.5"><IconEye /></button>
                    <button onClick={() => handleDeleteDevice(d.id)} title="ลบ"
                      className="btn-ghost btn-sm !p-1.5 text-danger hover:bg-danger-light"><IconTrash /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-surface-500">
            แสดง {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredDevices.length)} จาก {filteredDevices.length} รายการ
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="btn-ghost btn-sm cursor-default">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary btn-sm disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {/* API Info Box */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
          <IconRadio /> API สำหรับส่งค่ามิเตอร์
        </h3>
        <div className="text-sm text-surface-600 space-y-2">
          <p><strong>POST</strong> <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs font-mono">/api/meter-readings/{'{device_id}'}</code></p>
          <pre className="bg-surface-800 text-success-light p-3 rounded-card text-xs overflow-x-auto font-mono">{`{
  "reading": 1234.56,
  "timestamp": "2026-09-09T00:00:00+07:00",
  "api_key": "${globalApiKey || 'your-api-key'}"
}`}</pre>
          <p className="text-surface-400 text-xs">ตัวอย่าง: ESP32, ESP8266, Raspberry Pi หรือ Modbus Gateway</p>
        </div>
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <DeviceDetailModal device={selectedDevice} onClose={() => setSelectedDevice(null)} onReadingSent={onReadingSent} />
      )}

      {/* New Device Modal */}
      {formOpen && (
        <NewDeviceModal rooms={rooms} form={form} setForm={setForm}
          onClose={() => setFormOpen(false)} onSubmit={handleCreateDevice} />
      )}
    </div>
  );
}

function NewDeviceModal({
  rooms, form, setForm, onClose, onSubmit,
}: {
  rooms: Room[];
  form: { room_id: string; meter_type: string; device_id: string };
  setForm: React.Dispatch<React.SetStateAction<{ room_id: string; meter_type: string; device_id: string }>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative bg-white rounded-card shadow-elevated border border-surface-100 w-full max-w-lg p-6 space-y-5 animate-scale-in">
        <div className="flex justify-between items-center">
          <h2 className="page-title flex items-center gap-2"><IconPlus /> เพิ่มมิเตอร์ใหม่</h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm !p-1.5"><IconXMark /></button>
        </div>

        <div>
          <label className="input-label">ห้อง *</label>
          <select required value={form.room_id} onChange={e => setForm(f => ({...f, room_id: e.target.value}))}
            className="input">
            <option value="">-- เลือกห้อง --</option>
            {rooms.map(r => <option key={r.id} value={String(r.id)}>ห้อง {r.room_number}</option>)}
          </select>
        </div>

        <div>
          <label className="input-label">ประเภทมิเตอร์ *</label>
          <select required value={form.meter_type} onChange={e => setForm(f => ({...f, meter_type: e.target.value}))}
            className="input">
            <option value="electricity"><IconBolt /> ไฟฟ้า</option>
            <option value="water"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 inline"><path fillRule="evenodd" d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97 2.197.315 4.467.47 6.652.47 2.185 0 4.455-.155 6.652-.47 1.978-.29 3.348-2.024 3.348-3.97V6.741c0-1.946-1.37-3.68-3.348-3.97A56.782 56.782 0 0 0 12 2.25ZM6.268 16.34c1.978-.29 3.348-2.024 3.348-3.97V9.07c-3.119.185-6.08.614-8.232 1.131-.657.159-1.142.723-1.142 1.403v4.116c0 .83.485 1.572 1.265 1.844a9.56 9.56 0 0 0 2.012.42Zm11.469-4.975c0-1.946 1.37-3.68 3.348-3.97a56.782 56.782 0 0 1 2.284.521c1.978.29 3.348 2.024 3.348 3.97v4.018c0 .83-.485 1.572-1.265 1.844a9.56 9.56 0 0 1-2.012.42c-2.035 0-4.067-.155-6.063-.454-.493-.076-.894-.413-.894-.915v-4.013Z" clipRule="evenodd" /></svg> น้ำ</option>
          </select>
        </div>

        <div>
          <label className="input-label">Device ID *</label>
          <input type="text" required value={form.device_id} placeholder="เช่น ELEC-R01"
            onChange={e => setForm(f => ({...f, device_id: e.target.value}))}
            className="input font-mono" />
          <p className="text-xs text-surface-400 mt-1">ID ที่ไม่ซ้ำกันสำหรับอุปกรณ์นี้</p>
        </div>

        <button type="submit" className="btn-primary w-full">
          <IconCheck /> ลงทะเบียนมิเตอร์
        </button>
      </form>
    </div>
  );
}

function DeviceDetailModal({ device, onClose, onReadingSent }: { device: DeviceMeter; onClose: () => void; onReadingSent: () => void }) {
  const toast = useToast();
  const [readings, setReadings] = useState<MeterReadingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReading, setNewReading] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { loadReadings(); }, [device.id]);

  const loadReadings = async () => {
    setLoading(true);
    try {
      const r = await meterReadingsApi.getByRoom(device.room_id, { meter_type: device.meter_type, limit: 10 });
      setReadings(r.data || []);
    } catch(e) { toast.addError(`โหลดประวัติล้มเหลว: ${(e as Error).message}`); }
    setLoading(false);
  };

  const handleSendReading = async () => {
    const val = parseFloat(newReading);
    if (isNaN(val) || val < 0) {
      toast.addError('กรุณากรอกค่ามิเตอร์ที่ถูกต้อง'); return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/meter-readings/${device.device_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading: val, api_key: device.api_key }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.addError(`ส่งค่าไม่สำเร็จ: ${data.error}`);
        setSending(false);
        return;
      }
      setNewReading('');
      loadReadings();
      onReadingSent();
      toast.addSuccess('ส่งค่ามิเตอร์สำเร็จ');
    } catch(e) {
      toast.addError(`ส่งค่าไม่สำเร็จ: ${(e as Error).message}`);
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-card shadow-elevated border border-surface-100 w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="flex justify-between items-center mb-5">
          <h2 className="page-title flex items-center gap-2">
            {device.meter_type === 'electricity' ? <IconBolt /> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 2.25c-2.429 0-4.817.178-7.152.521C2.87 3.061 1.5 4.795 1.5 6.741v6.018c0 1.946 1.37 3.68 3.348 3.97 2.197.315 4.467.47 6.652.47 2.185 0 4.455-.155 6.652-.47 1.978-.29 3.348-2.024 3.348-3.97V6.741c0-1.946-1.37-3.68-3.348-3.97A56.782 56.782 0 0 0 12 2.25ZM6.268 16.34c1.978-.29 3.348-2.024 3.348-3.97V9.07c-3.119.185-6.08.614-8.232 1.131-.657.159-1.142.723-1.142 1.403v4.116c0 .83.485 1.572 1.265 1.844a9.56 9.56 0 0 0 2.012.42Zm11.469-4.975c0-1.946 1.37-3.68 3.348-3.97a56.782 56.782 0 0 1 2.284.521c1.978.29 3.348 2.024 3.348 3.97v4.018c0 .83-.485 1.572-1.265 1.844a9.56 9.56 0 0 1-2.012.42c-2.035 0-4.067-.155-6.063-.454-.493-.076-.894-.413-.894-.915v-4.013Z" clipRule="evenodd" /></svg>}
            มิเตอร์ {device.device_id}
          </h2>
          <button onClick={onClose} className="btn-ghost btn-sm !p-1.5"><IconXMark /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-surface-50 p-3 rounded-card">
            <div className="input-label">ห้อง</div>
            <div className="font-bold text-lg text-surface-800">{device.room_number}</div>
          </div>
          <div className="bg-surface-50 p-3 rounded-card">
            <div className="input-label">ประเภท</div>
            <div className="font-bold text-lg text-surface-800">{device.meter_type === 'electricity' ? 'ไฟฟ้า' : 'น้ำ'} ({device.unit})</div>
          </div>
          <div className="bg-surface-50 p-3 rounded-card">
            <div className="input-label">ค่าล่าสุด</div>
            <div className="font-bold text-lg text-surface-800">{device.last_reading ? round1(device.last_reading).toLocaleString() : '-'}</div>
          </div>
          <div className="bg-surface-50 p-3 rounded-card">
            <div className="input-label">Last Seen</div>
            <div className="font-bold text-sm text-surface-800">{device.last_reading_time ? new Date(device.last_reading_time).toLocaleString('th-TH') : '-'}</div>
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-2 flex items-center gap-2">
            <IconRadio /> API Configuration
          </h3>
          <div className="bg-surface-800 text-success-light p-3 rounded-card text-xs font-mono overflow-x-auto">
            POST http://localhost:3000/api/meter-readings/{device.device_id}
          </div>
          <div className="bg-surface-800 text-success-light/80 p-2.5 rounded-card text-xs font-mono mt-1.5 overflow-x-auto">
            API Key: {device.api_key ? device.api_key.slice(0, 8) + '...' : '(none)'}
          </div>
        </div>

        <div className="mb-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-2 flex items-center gap-2">
            <IconWrenchScrewdriver /> ส่งค่ามิเตอร์
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={newReading}
              onChange={(e) => setNewReading(e.target.value)}
              placeholder="กรอกค่ามิเตอร์"
              className="input flex-1"
            />
            <button
              onClick={handleSendReading}
              disabled={sending}
              className="btn-primary"
            >
              {sending ? 'กำลังส่ง...' : <><IconCheck /> ส่งค่า</>}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
            <IconChartBar /> ประวัติค่ามิเตอร์ (10 ล่าสุด)
          </h3>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between p-2">
                  <div className="h-4 bg-surface-100 rounded w-36 animate-pulse" />
                  <div className="h-4 bg-surface-100 rounded w-20 animate-pulse" />
                </div>
              ))}
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center text-surface-400 py-6">ยังไม่มีประวัติ</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>วันเวลา</th>
                    <th className="text-right">ค่ามิเตอร์</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td className="text-surface-500">{new Date(r.reading_time).toLocaleString('th-TH')}</td>
                      <td className="text-right font-bold text-surface-800">{round1(r.reading).toLocaleString()} {r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

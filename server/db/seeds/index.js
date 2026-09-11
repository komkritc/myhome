// Initial seed data for 10 rooms
export function getSeedRooms() {
  const roomTypes = [
    { number: '01', floor: 1, price: 3500, electricRate: 8.0, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '02', floor: 1, price: 3800, electricRate: 8.0, waterRate: 20.0, service: 100, deposit: 2500 },
    { number: '03', floor: 1, price: 3500, electricRate: 7.5, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '04', floor: 1, price: 4000, electricRate: 8.0, waterRate: 18.0, service: 150, deposit: 2500 },
    { number: '05', floor: 2, price: 3600, electricRate: 7.5, waterRate: 19.0, service: 100, deposit: 2000 },
    { number: '06', floor: 2, price: 4200, electricRate: 8.0, waterRate: 20.0, service: 150, deposit: 3000 },
    { number: '07', floor: 2, price: 3500, electricRate: 8.0, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '08', floor: 2, price: 3800, electricRate: 7.0, waterRate: 18.0, service: 100, deposit: 2000 },
    { number: '09', floor: 3, price: 4500, electricRate: 8.5, waterRate: 22.0, service: 200, deposit: 3000 },
    { number: '10', floor: 3, price: 3500, electricRate: 7.5, waterRate: 18.0, service: 100, deposit: 2000 },
  ];

  return roomTypes.map((room, index) => ({
    room_number: room.number,
    floor: room.floor,
    status: index < 7 ? 'occupied' : 'available',
    rental_price: room.price,
    electric_rate: room.electricRate,
    water_rate: room.waterRate,
    service_charge: room.service,
    security_deposit: room.deposit,
    description: `ห้องมาตรฐาน ${index < 7 ? '(มีผู้เช่า)' : '(ว่าง)'}`,
    current_tenant_id: index < 7 ? null : null, // will be set after tenant creation
  }));
}

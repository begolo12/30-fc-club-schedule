export type VenueType = 'futsal' | 'mini-soccer';

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  address: string;
  price: string;
  priceWeekday: string;
  priceWeekend: string;
  facilities: string[];
  coordinates: [number, number]; // [latitude, longitude]
  images: string[];
  distance?: number; // Calculated distance from reference point
  rating: number;
  phone: string;
  whatsapp?: string;
  openHours: string;
}

// Cirebon center coordinates roughly: -6.7320, 108.5523
export const venues: Venue[] = [
  {
    id: 'umc-mini-soccer',
    name: 'Mini Soccer UMC',
    type: 'mini-soccer',
    address: 'Jl. Watubelah, Cirebon (Universitas Muhammadiyah Cirebon)',
    price: 'Rp 250.000 - Rp 450.000',
    priceWeekday: 'Rp 250.000/jam',
    priceWeekend: 'Rp 450.000/jam',
    facilities: ['Rumput Sintetis Pro', 'Parkir Kampus', 'Tribun', 'Kantin'],
    coordinates: [-6.7125, 108.4985],
    images: ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop'],
    rating: 5.0,
    phone: '',
    whatsapp: '',
    openHours: '06.00 - 22.00 WIB'
  },
  {
    id: 'cirebon-sport-centre',
    name: 'Cirebon Sport Centre',
    type: 'mini-soccer',
    address: 'Jl. Utama, Kec. Talun, Cirebon',
    price: 'Rp 300.000 - Rp 500.000',
    priceWeekday: 'Rp 300.000/jam',
    priceWeekend: 'Rp 500.000/jam',
    facilities: ['Lapangan Indoor/Outdoor', 'Kantin', 'Parkir Luas', 'Mushola'],
    coordinates: [-6.7558, 108.5192],
    images: ['https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=600&auto=format&fit=crop'],
    rating: 4.4,
    phone: '0813-2467-8370',
    whatsapp: '6281324678370',
    openHours: '06.00 - 00.00 WIB'
  },
  {
    id: 'diklat-cirebon-united',
    name: 'Diklat Sepak Bola Cirebon United',
    type: 'mini-soccer',
    address: 'Jl. Pramuka, Surapandan, Cirebon',
    price: 'Rp 150.000 - Rp 300.000',
    priceWeekday: 'Rp 150.000/jam',
    priceWeekend: 'Rp 300.000/jam',
    facilities: ['Lapangan Latihan', 'Mess Pemain', 'Toilet', 'Kantin'],
    coordinates: [-6.7485, 108.5322],
    images: ['https://images.unsplash.com/photo-1518605368461-1e1252281cb5?q=80&w=600&auto=format&fit=crop'],
    rating: 4.0,
    phone: '',
    whatsapp: '',
    openHours: '07.00 - 21.00 WIB'
  },
  {
    id: 'minisoccer-luwung',
    name: 'MINISOCCER LUWUNG (FF27)',
    type: 'mini-soccer',
    address: 'Luwung, Kec. Mundu, Cirebon',
    price: 'Rp 200.000 - Rp 350.000',
    priceWeekday: 'Rp 200.000/jam',
    priceWeekend: 'Rp 350.000/jam',
    facilities: ['Rumput Baru', 'Penerangan Malam', 'Parkir', 'Toilet'],
    coordinates: [-6.7622, 108.5855],
    images: ['https://images.unsplash.com/photo-1529900845347-16474135e6ba?q=80&w=600&auto=format&fit=crop'],
    rating: 4.7,
    phone: '0881-0222-63922',
    whatsapp: '62881022263922',
    openHours: '06.00 - 00.00 WIB'
  },
  {
    id: 'munirah-soccer',
    name: 'Lapangan Mini Soccer Munirah',
    type: 'mini-soccer',
    address: 'Jl. Raya Sunyaragi, Cirebon',
    price: 'Rp 250.000 - Rp 400.000',
    priceWeekday: 'Rp 250.000/jam',
    priceWeekend: 'Rp 400.000/jam',
    facilities: ['Sintetis Premium', 'Cafe', 'Mushola', 'Parkir'],
    coordinates: [-6.7388, 108.5455],
    images: ['https://images.unsplash.com/photo-1551280857-2b9bbe5240f5?q=80&w=600&auto=format&fit=crop'],
    rating: 4.5,
    phone: '0895-1878-6832',
    whatsapp: '6289518786832',
    openHours: 'Buka 24 Jam'
  },
  {
    id: 'hikmah-soccer',
    name: 'Hikmah Mini Soccer',
    type: 'mini-soccer',
    address: 'Kec. Talun, Cirebon',
    price: 'Rp 180.000 - Rp 300.000',
    priceWeekday: 'Rp 180.000/jam',
    priceWeekend: 'Rp 300.000/jam',
    facilities: ['Ekonomis', 'Parkir Motor', 'Toilet'],
    coordinates: [-6.7610, 108.5255],
    images: ['https://images.unsplash.com/photo-1600250395378-96262bde778b?q=80&w=600&auto=format&fit=crop'],
    rating: 4.4,
    phone: '',
    whatsapp: '',
    openHours: '07.00 - 22.00 WIB'
  },
  {
    id: 'gelora-sport-centre',
    name: 'Gelora Sport Centre',
    type: 'mini-soccer',
    address: 'Jl. Tuparev, Kec. Kedawung, Cirebon',
    price: 'Rp 350.000 - Rp 600.000',
    priceWeekday: 'Rp 350.000/jam',
    priceWeekend: 'Rp 600.000/jam',
    facilities: ['Standar FIFA', 'Tribun Megah', 'Cafe', 'Locker Room'],
    coordinates: [-6.7198, 108.5412],
    images: ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop'],
    rating: 4.8,
    phone: '0838-7599-6738',
    whatsapp: '6283875996738',
    openHours: '06.00 - 00.00 WIB'
  },
  {
    id: '1',
    name: 'Apita Futsal Arena',
    type: 'futsal',
    address: 'Jl. Tuparev No.323, Kedawung, Kec. Kedawung, Kota Cirebon',
    price: 'Rp 80.000 - Rp 120.000',
    priceWeekday: 'Rp 80.000/jam',
    priceWeekend: 'Rp 120.000/jam',
    facilities: ['Parkir Luas', 'Kantin', 'Mushola', 'Toilet', 'Locker'],
    coordinates: [-6.7169, 108.5375],
    images: ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop'],
    rating: 4.5,
    phone: '0231-1234567',
    whatsapp: '6281234567890',
    openHours: '08.00 - 23.00 WIB'
  },
  {
    id: '3',
    name: 'Cirebon Mini Soccer (CMS)',
    type: 'mini-soccer',
    address: 'Jl. Perjuangan, Majasem, Kec. Kejaksan, Kota Cirebon',
    price: 'Rp 200.000 - Rp 300.000',
    priceWeekday: 'Rp 200.000/jam',
    priceWeekend: 'Rp 300.000/jam',
    facilities: ['Rumput Sintetis Premium', 'Lampu Terang', 'Tribun', 'Cafe', 'Mushola', 'Shower'],
    coordinates: [-6.7445, 108.5358],
    images: ['https://images.unsplash.com/photo-1518605368461-1e1252281cb5?q=80&w=600&auto=format&fit=crop'],
    rating: 4.8,
    phone: '0231-3456789',
    whatsapp: '6281234567892',
    openHours: '06.00 - 23.00 WIB'
  }
];

// Helper to calculate distance using Haversine formula (in km)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

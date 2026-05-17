import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map as MapIcon, SlidersHorizontal, MapPin, Search, X, Filter } from 'lucide-react';
import { venues, VenueType, calculateDistance } from '../../data/venues';
import VenueCard from './VenueCard';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for selected venue
const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Center of Cirebon
const CIREBON_CENTER: [number, number] = [-6.7320, 108.5523];
const MAX_RADIUS = 10; // km

// Component to handle map center changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function Map() {
  const [activeFilter, setActiveFilter] = useState<VenueType | 'all'>('all');
  const [maxDistance, setMaxDistance] = useState<number>(10); // Default 10km (show all)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(CIREBON_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [showFilters, setShowFilters] = useState(false);
  
  // Calculate distances and filter venues
  const processedVenues = useMemo(() => {
    return venues
      .map(v => ({
        ...v,
        distance: calculateDistance(CIREBON_CENTER[0], CIREBON_CENTER[1], v.coordinates[0], v.coordinates[1])
      }))
      .filter(v => {
        // Filter by distance
        if (v.distance > maxDistance) return false;
        
        // Filter by type
        if (activeFilter !== 'all' && v.type !== activeFilter) return false;
        
        // Filter by search query
        if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !v.address.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [activeFilter, maxDistance, searchQuery]);

  // Handle venue selection
  const handleVenueClick = (venue: any) => {
    setSelectedVenue(venue.id);
    setMapCenter(venue.coordinates);
    setMapZoom(16);
    
    // Scroll to top on mobile to see map
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-400/10 rounded-xl flex items-center justify-center border border-lime-400/20">
            <MapIcon className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Cari Lapangan</h1>
            <p className="text-sm text-zinc-400 hidden sm:block">Futsal & Mini Soccer di Cirebon</p>
          </div>
        </div>
        
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-all"
        >
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold">Filter</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[600px]">
        {/* Sidebar Controls & List */}
        <div className={`lg:col-span-1 flex flex-col gap-4 order-2 lg:order-1 h-full ${showFilters ? 'block' : 'hidden lg:flex'}`}>
          {/* Filters */}
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-4">
            {/* Mobile Close Button */}
            <div className="lg:hidden flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Filter & Pencarian</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                placeholder="Cari nama atau lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-lime-400 text-zinc-950 shadow-lg' 
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setActiveFilter('futsal')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeFilter === 'futsal' 
                    ? 'bg-blue-400 text-zinc-950 shadow-lg' 
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Futsal
              </button>
              <button
                onClick={() => setActiveFilter('mini-soccer')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeFilter === 'mini-soccer' 
                    ? 'bg-lime-400 text-zinc-950 shadow-lg' 
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Mini Soccer
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400 font-medium flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Radius Maksimal
                </span>
                <span className="font-bold text-lime-400">{maxDistance} km</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={MAX_RADIUS} 
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-lime-400 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                <span>1 km</span>
                <span>{MAX_RADIUS} km</span>
              </div>
            </div>

            {/* Apply button for mobile */}
            <button
              onClick={() => setShowFilters(false)}
              className="lg:hidden w-full py-3 bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold rounded-xl transition-all"
            >
              Terapkan Filter
            </button>
          </div>
          
          {/* List of venues */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] lg:max-h-full scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1 flex justify-between items-center sticky top-0 bg-zinc-950 py-2 z-10">
              <span>Hasil Pencarian</span>
              <span className="bg-lime-400/10 text-lime-400 px-2 py-1 rounded-md border border-lime-400/20">
                {processedVenues.length} Tempat
              </span>
            </div>
            
            {processedVenues.length > 0 ? (
              processedVenues.map((venue) => (
                <VenueCard 
                  key={venue.id} 
                  venue={venue} 
                  isActive={selectedVenue === venue.id}
                  onClick={() => handleVenueClick(venue)}
                />
              ))
            ) : (
              <div className="text-center py-10 text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
                <MapPin className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Tidak ada tempat ditemukan</p>
                <p className="text-xs mt-1">Coba perbesar radius atau ubah filter</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Map */}
        <div className="lg:col-span-2 h-[450px] lg:h-full min-h-[500px] rounded-2xl overflow-hidden border-2 border-zinc-800 order-1 lg:order-2 relative z-0 shadow-2xl">
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            className="z-0"
          >
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            {/* Center Reference point (Cirebon) */}
            <Marker position={CIREBON_CENTER}>
              <Popup className="custom-popup">
                <div className="font-bold text-center text-sm">📍 Pusat Kota Cirebon</div>
              </Popup>
            </Marker>
            
            {/* Venues */}
            {processedVenues.map((venue) => (
              <Marker 
                key={venue.id} 
                position={venue.coordinates}
                icon={selectedVenue === venue.id ? selectedIcon : new L.Icon.Default()}
                eventHandlers={{
                  click: () => handleVenueClick(venue),
                }}
              >
                <Popup className="custom-popup" maxWidth={250}>
                  <div className="min-w-[220px]">
                    <img 
                      src={venue.images[0]} 
                      alt={venue.name} 
                      className="w-full h-24 object-cover rounded-lg mb-2"
                    />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${venue.coordinates[0]},${venue.coordinates[1]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-sm m-0 text-zinc-900 mb-1 hover:text-lime-600 transition-colors inline-flex items-center gap-1"
                    >
                      {venue.name}
                      <span className="text-[10px] font-bold uppercase tracking-wider">Maps</span>
                    </a>
                    <p className="text-[10px] text-zinc-500 mt-1 mb-2 m-0 uppercase font-bold tracking-wider">
                      {venue.type.replace('-', ' ')}
                    </p>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-200">
                      <span className="text-xs font-bold text-zinc-700">📍 {venue.distance?.toFixed(1)} km</span>
                      <span className="text-xs font-bold bg-lime-400 text-zinc-900 px-2 py-1 rounded">
                        {venue.priceWeekday.split('/')[0]}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

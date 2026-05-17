import React from 'react';
import { MapPin, Star, Navigation2, Phone, Clock, ExternalLink } from 'lucide-react';
import { Venue } from '../../data/venues';

interface VenueCardProps {
  venue: Venue;
  onClick?: () => void;
  isActive?: boolean;
  key?: React.Key;
}

export default function VenueCard({ venue, onClick, isActive }: VenueCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${venue.coordinates[0]},${venue.coordinates[1]}`;

  const handleGoogleMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (venue.whatsapp) {
      const message = encodeURIComponent(`Halo, saya ingin booking lapangan di ${venue.name}`);
      window.open(`https://wa.me/${venue.whatsapp}?text=${message}`, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${venue.phone}`;
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all cursor-pointer shadow-lg hover:shadow-xl
        ${isActive ? 'border-lime-400 ring-2 ring-lime-400/50 scale-[1.01]' : 'border-zinc-800 hover:border-zinc-700'}
      `}
    >
      <div className="relative h-40 w-full">
        <img 
          src={venue.images[0]} 
          alt={venue.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg
            ${venue.type === 'mini-soccer' ? 'bg-lime-400 text-zinc-950' : 'bg-blue-400 text-zinc-950'}
          `}>
            {venue.type.replace('-', ' ')}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-zinc-950/80 backdrop-blur-sm px-2 py-1 rounded-full">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-zinc-100">{venue.rating}</span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleGoogleMaps}
          className="text-left group self-start"
          title="Buka lokasi di Google Maps"
        >
          <h3 className="text-base font-bold text-zinc-100 mb-1 group-hover:text-lime-400 transition-colors">
            {venue.name}
          </h3>
          <div className="flex items-start gap-1.5 text-zinc-400 text-xs group-hover:text-lime-300 transition-colors">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="line-clamp-1">{venue.address}</p>
          </div>
        </button>
        
        <div className="flex items-center justify-between gap-3 py-2 border-y border-zinc-800">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Weekday</span>
            <span className="text-sm font-bold text-lime-400">{venue.priceWeekday}</span>
          </div>
          <div className="w-px h-8 bg-zinc-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Weekend</span>
            <span className="text-sm font-bold text-amber-400">{venue.priceWeekend}</span>
          </div>
          {venue.distance !== undefined && (
            <>
              <div className="w-px h-8 bg-zinc-800"></div>
              <div className="flex items-center gap-1.5 text-lime-400">
                <Navigation2 className="w-4 h-4" />
                <span className="text-sm font-bold">{venue.distance.toFixed(1)} km</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{venue.openHours}</span>
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleGoogleMaps}
            className="flex-1 flex items-center justify-center gap-2 bg-lime-400 hover:bg-lime-500 text-zinc-950 font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Google Maps</span>
          </button>
          
          {venue.whatsapp ? (
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">WA</span>
            </button>
          ) : (
            <button
              onClick={handleCall}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs py-2.5 px-3 rounded-xl transition-all"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

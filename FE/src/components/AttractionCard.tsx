import { MapIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import type { Attraction } from '../api/attractionsApi';

interface AttractionCardProps {
    attraction: Attraction;
    className?: string;
}

export function AttractionCard({ attraction, className = '' }: AttractionCardProps) {
    return (
        <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-900/10 transition-all border border-slate-100 flex flex-col h-full ${className}`}>
            <div className="h-56 bg-slate-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                <img
                    src={attraction.imageUrl || `https://images.unsplash.com/photo-1596395819057-cbcf85b85a3e?auto=format&fit=crop&q=80&w=800`}
                    alt={attraction.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute bottom-4 left-4 z-20">
                    <h3 className="text-xl font-bold text-white">{attraction.name}</h3>
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-indigo-600 mb-4 px-3 py-1.5 bg-indigo-50 rounded-full w-fit text-sm font-semibold">
                    <MapIcon className="w-4 h-4" />
                    <span>{attraction.distanceKm ? `${attraction.distanceKm.toFixed(1)} km away` : 'Nearby'}</span>
                </div>

                <p className="text-slate-600 mb-6 flex-1 text-sm leading-relaxed">
                    {attraction.description || 'A must-visit cultural hotspot known for its stunning architecture and history.'}
                </p>

                <a
                    href={attraction.latitude && attraction.longitude && !isNaN(Number(attraction.latitude)) ? `https://www.google.com/maps/search/?api=1&query=${attraction.latitude},${attraction.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(attraction.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-semibold transition-colors mt-auto"
                >
                    View on Map <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            </div>
        </div>
    );
}

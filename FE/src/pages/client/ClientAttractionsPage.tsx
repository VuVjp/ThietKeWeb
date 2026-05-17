import { useEffect, useState, useMemo } from 'react';
import { attractionsApi, type Attraction } from '../../api/attractionsApi';
import { Spin } from 'antd';
import { MapIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { AttractionCard } from '../../components/AttractionCard';
import { queryIncludes } from '../../utils/table';

export function ClientAttractionsPage() {
    const [attractions, setAttractions] = useState<Attraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchAttractions = async () => {
            try {
                const data = await attractionsApi.getAll();
                setAttractions(data.filter((a: Attraction) => a.isActive));
            } catch (error) {
                toast.error('Failed to load attractions');
            } finally {
                setLoading(false);
            }
        };
        fetchAttractions();
    }, []);

    const filteredAttractions = useMemo(() => {
        if (!search.trim()) return attractions;
        return attractions.filter(a => 
            queryIncludes(a.name, search) || 
            queryIncludes(a.description || '', search)
        );
    }, [attractions, search]);

    return (
        <div className="w-full bg-slate-50 min-h-screen">
            {/* Header Banner */}
            <div className="bg-indigo-950 py-16 text-center text-white px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=2000')] opacity-20 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-950" />
                <div className="relative mt-[70px] z-10 max-w-2xl mx-auto mt-[48px]">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Local Attractions</h1>
                    <p className="text-indigo-200">
                        Explore the vibrant culture, breathtaking nature, and iconic landmarks lying just moments away from your doorstep.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl shadow-indigo-900/10 p-2 border border-indigo-50">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search attractions by name or description..."
                            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" />
                    </div>
                ) : filteredAttractions.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p className="text-xl">{search ? `No attractions found matching "${search}"` : 'No attractions added yet.'}</p>
                        {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {attractions.map((attraction) => (
                            <div key={attraction.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-900/10 transition-all border border-slate-100 flex flex-col h-full">
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

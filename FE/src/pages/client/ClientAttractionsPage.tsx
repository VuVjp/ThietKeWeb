import { useEffect, useState } from 'react';
import { attractionsApi, type Attraction } from '../../api/attractionsApi';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { AttractionCard } from '../../components/AttractionCard';

export function ClientAttractionsPage() {
    const [attractions, setAttractions] = useState<Attraction[]>([]);
    const [loading, setLoading] = useState(true);

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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Spin size="large" />
                    </div>
                ) : attractions.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        <p className="text-xl">No attractions added yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {attractions.map((attraction) => (
                            <AttractionCard key={attraction.id} attraction={attraction} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

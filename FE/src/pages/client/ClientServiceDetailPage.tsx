import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    CheckCircleIcon,
    SparklesIcon,
    CurrencyDollarIcon,
    ClockIcon,
    TagIcon
} from '@heroicons/react/24/outline';
import { servicesApi } from '../../api/servicesApi';
import { useAppAuth } from '../../auth/useAppAuth';
import type { Service } from '../../types/models';

export function ClientServiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAppAuth();

    const [service, setService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchService = async () => {
            if (!id) return;
            try {
                const data = await servicesApi.getById(Number(id));
                setService(data);
            } catch (error) {
                console.error('Failed to load service details', error);
                toast.error('Could not fetch service details.');
                navigate('/services');
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [id, navigate]);

    const parseFeatures = (featuresStr?: string) => {
        if (!featuresStr) return [];
        return featuresStr.split(/[;,]/).map(f => f.trim()).filter(f => f !== '');
    };

    const handleBookClick = () => {
        if (!isAuthenticated) {
            toast.error('Please login to book services');
            navigate('/login', { state: { from: `/services/book?serviceId=${id}` } });
            return;
        }

        navigate(`/services/book?serviceId=${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium tracking-widest text-xs uppercase">Loading Service Detail...</p>
                </div>
            </div>
        );
    }

    if (!service) return null;

    const features = parseFeatures(service.features);
    const heroImage = service.imageUrl || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1740&auto=format&fit=crop";

    return (
        <div className="w-full bg-slate-50 min-h-screen pb-24 font-sans">
            {/* HERO SECTION */}
            <div className="relative h-[100vh] sm:h-[90vh] md:h-[80vh] lg:h-[80vh] xl:h-[85vh] w-full bg-slate-900 overflow-hidden">
                <img
                    src={heroImage}
                    alt={service.name}
                    className="w-full h-full object-cover opacity-60 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

                <div className="absolute inset-0 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 flex flex-col justify-end pb-20">

                    {/* <Link to="/services" className="text-white/70 hover:text-white flex items-center gap-2 font-bold uppercase tracking-[0.2em] text-[10px] mb-8 w-max transition-all group">
                        <ArrowLeftIcon className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" /> Back to Services
                    </Link> */}

                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                        <div className="max-w-3xl">
                            <span className="text-cyan-400 font-black tracking-[0.3em] uppercase text-xs mb-4 block">{service.categoryName || 'Luxury Amenity'}</span>
                            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">
                                {service.name}
                            </h1>
                            <p className="text-slate-300 text-lg md:text-xl leading-relaxed font-medium">
                                {service.description || 'An exquisite service designed to elevate your stay to new heights of luxury and comfort.'}
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-3xl flex-shrink-0 lg:w-96 shadow-2xl">
                            <div className="flex items-center gap-2 mb-6">
                                <CurrencyDollarIcon className="w-5 h-5 text-cyan-400" />
                                <span className="text-slate-300 text-xs font-bold uppercase tracking-widest">Premium Offering</span>
                            </div>
                            <div className="flex items-baseline gap-2 mb-8">
                                <span className="text-5xl font-black text-white">${service.price.toLocaleString()}</span>
                                <span className="text-lg text-slate-400 font-medium">/ {service.unit}</span>
                            </div>
                            <button
                                onClick={() => void handleBookClick()}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-5 px-8 rounded-2xl font-black uppercase tracking-[0.15em] text-sm transition-all shadow-xl shadow-cyan-600/30 hover:scale-[1.02] active:scale-95"
                            >
                                Book This Service
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT SECTION */}
            <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 mt-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* LEFT COLUMN: DESCRIPTION & FEATURES */}
                    <div className="lg:col-span-8 space-y-20">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-cyan-200 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <ClockIcon className="w-7 h-7" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">Availability</h4>
                                <p className="text-xs text-slate-500 font-medium">24/7 Room Service</p>
                            </div>
                            <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-cyan-200 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <SparklesIcon className="w-7 h-7" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">Quality</h4>
                                <p className="text-xs text-slate-500 font-medium">Premium Materials</p>
                            </div>
                            <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-cyan-200 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <TagIcon className="w-7 h-7" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">Best Price</h4>
                                <p className="text-xs text-slate-500 font-medium">Guaranteed Value</p>
                            </div>
                        </div>

                        <section>
                            <h3 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
                                <span className="w-12 h-1 bg-cyan-600 rounded-full"></span>
                                Service Experience
                            </h3>
                            <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed font-medium">
                                <p className="mb-6">
                                    {service.description || 'Our dedicated team is committed to providing you with an exceptional experience. Every detail of this service has been meticulously crafted to meet the highest standards of hospitality.'}
                                </p>
                                <p>
                                    Whether you are looking for relaxation, indulgence, or practical assistance during your stay, our {service.name} is the perfect choice for the discerning guest. We use only the finest ingredients and equipment to ensure your complete satisfaction.
                                </p>
                            </div>
                        </section>

                        {features.length > 0 && (
                            <section>
                                <h3 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-4">
                                    <span className="w-12 h-1 bg-cyan-600 rounded-full"></span>
                                    Key Highlights
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-4 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mt-0.5">
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-slate-700 font-bold">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* RIGHT COLUMN: BOOKING SUMMARY & INFO */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 space-y-8">
                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <h4 className="text-xl font-bold mb-8">Service Details</h4>
                                <ul className="space-y-6">
                                    <li className="flex justify-between items-center border-b border-white/10 pb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Category</span>
                                        <span className="font-bold">{service.categoryName || 'General'}</span>
                                    </li>
                                    <li className="flex justify-between items-center border-b border-white/10 pb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Unit Price</span>
                                        <span className="font-bold text-cyan-400">${service.price.toLocaleString()}</span>
                                    </li>
                                    <li className="flex justify-between items-center border-b border-white/10 pb-4">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Pricing Unit</span>
                                        <span className="font-bold">Per {service.unit}</span>
                                    </li>
                                    <li className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Status</span>
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="font-bold text-emerald-400">Available Now</span>
                                        </span>
                                    </li>
                                </ul>
                                <div className="mt-10 pt-10 border-t border-white/10">
                                    <p className="text-slate-400 text-xs leading-relaxed text-center italic">
                                        * Note: Services are charged directly to your room invoice and can be settled upon checkout.
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 bg-cyan-50 rounded-[2rem] border border-cyan-100 flex items-center gap-6 group">
                                <div className="w-16 h-16 rounded-2xl bg-white text-cyan-600 flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                                    <SparklesIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h5 className="font-black text-slate-900 leading-tight">Member Benefits</h5>
                                    <p className="text-xs text-slate-600 font-medium">Earn points with every service booking.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}

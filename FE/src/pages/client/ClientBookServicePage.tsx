import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    SparklesIcon,
    CheckCircleIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    ShoppingBagIcon,
    ArrowRightIcon,
    ChevronLeftIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import { servicesApi } from '../../api/servicesApi';
import { receptionApi } from '../../api/receptionApi';
import { orderServicesApi } from '../../api/orderServicesApi';
import { useAppAuth } from '../../auth/useAppAuth';
import type { Service, ServiceCategory, ActiveRoom } from '../../types/models';
import { Pagination } from '../../components/Pagination';
import { Select } from '../../components/Select';

interface SelectedServiceItem {
    service: Service;
    quantity: number;
}

export function ClientBookServicePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isAuthenticated, isAuthReady } = useAppAuth();
    const serviceIdParam = searchParams.get('serviceId');

    // Data State
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [myActiveRooms, setMyActiveRooms] = useState<ActiveRoom[]>([]);
    const [selectedRoomDetailIds, setSelectedRoomDetailIds] = useState<number[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);

    // UI Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);

    // Pagination/Category filter state
    const [suggestedPage, setSuggestedPage] = useState(1);
    const [otherPage, setOtherPage] = useState(1);
    const [roomsPage, setRoomsPage] = useState(1);
    const [selectedOtherCategoryId, setSelectedOtherCategoryId] = useState<number | ''>('');

    // Responsive page size: desktop => 8, mobile/narrow => 4
    const getInitialRoomsPerPage = () => (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 8 : 4);
    const [roomsPerPage, setRoomsPerPage] = useState<number>(getInitialRoomsPerPage);

    useEffect(() => {
        const onResize = () => {
            const newSize = window.innerWidth >= 1024 ? 8 : 4;
            setRoomsPerPage(prev => (prev === newSize ? prev : newSize));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Reset paging when page size changes to avoid out-of-range pages
    useEffect(() => {
        setRoomsPage(1);
        setSuggestedPage(1);
        setOtherPage(1);
    }, [roomsPerPage]);

    // Redirect to login if unauthenticated
    useEffect(() => {
        // Wait until auth is resolved before deciding to redirect
        if (isAuthReady && !isAuthenticated) {
            toast.error('Please login to book services');
            navigate('/login', { state: { from: `/services/book${serviceIdParam ? `?serviceId=${serviceIdParam}` : ''}` } });
        }
    }, [isAuthenticated, isAuthReady, navigate, serviceIdParam]);

    // Initial Load
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // Fetch active check-ins
                const rooms = await receptionApi.getMyActiveRooms();
                setMyActiveRooms(rooms);
                // Auto-select all rooms if there's only one
                if (rooms.length === 1) {
                    setSelectedRoomDetailIds([rooms[0].bookingDetailId]);
                }

                // Fetch Categories
                const cats = await servicesApi.getCategories();
                const activeCats = cats.filter(c => c.isActive);
                setCategories(activeCats);

                // Fetch all active services
                const res = await servicesApi.getPaged({
                    page: 1,
                    pageSize: 200,
                    isActive: true
                });
                const servicesData = res.items;
                setAllServices(servicesData);

                // Pre-select service from URL param
                if (serviceIdParam) {
                    const primaryService = servicesData.find(s => s.id === Number(serviceIdParam));
                    if (primaryService) {
                        setSelectedServices([{ service: primaryService, quantity: 1 }]);

                        // Default the "other" selector to another category if available
                        const otherCat = activeCats.find(c => c.id !== primaryService.categoryId);
                        if (otherCat) {
                            setSelectedOtherCategoryId(otherCat.id);
                        } else {
                            setSelectedOtherCategoryId('');
                        }
                    }
                } else if (activeCats.length > 0) {
                    setSelectedOtherCategoryId(activeCats[0].id);
                }
            } catch (error) {
                console.error('Failed to load booking details:', error);
                toast.error('Could not initialize service booking. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            void fetchInitialData();
        }
    }, [isAuthenticated, serviceIdParam]);

    // Active primary service (first selected service)
    const primaryService = useMemo(() => {
        if (selectedServices.length > 0) {
            return selectedServices[0].service;
        }
        return null;
    }, [selectedServices]);

    // Suggested services (same category, excluding selected ones)
    const suggestedServices = useMemo(() => {
        if (!primaryService) return [];
        return allServices.filter(s =>
            s.categoryId === primaryService.categoryId &&
            s.id !== primaryService.id
        );
    }, [allServices, primaryService]);

    // Other services (based on dropdown category filter, excluding selected ones)
    const otherServices = useMemo(() => {
        if (!selectedOtherCategoryId) return [];
        return allServices.filter(s => s.categoryId === Number(selectedOtherCategoryId));
    }, [allServices, selectedOtherCategoryId]);

    // Sorted active rooms and Selected Rooms details
    const sortedActiveRooms = useMemo(() => {
        return [...myActiveRooms].sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
    }, [myActiveRooms]);

    const selectedRooms = useMemo(() => {
        return sortedActiveRooms.filter(r => selectedRoomDetailIds.includes(r.bookingDetailId));
    }, [sortedActiveRooms, selectedRoomDetailIds]);

    // Toggle a room in/out of the multi-selection
    const handleRoomToggle = (bookingDetailId: number) => {
        setSelectedRoomDetailIds(prev =>
            prev.includes(bookingDetailId)
                ? prev.filter(id => id !== bookingDetailId)
                : [...prev, bookingDetailId]
        );
    };

    // Selected service IDs helper
    const selectedServiceIds = useMemo(() => {
        return selectedServices.map(x => x.service.id);
    }, [selectedServices]);

    // Paged suggested services
    const pagedSuggested = useMemo(() => {
        const startIndex = (suggestedPage - 1) * roomsPerPage;
        return suggestedServices.slice(startIndex, startIndex + roomsPerPage);
    }, [suggestedServices, suggestedPage]);

    // Paged other services
    const pagedOther = useMemo(() => {
        const startIndex = (otherPage - 1) * roomsPerPage;
        return otherServices.slice(startIndex, startIndex + roomsPerPage);
    }, [otherServices, otherPage]);

    // Paged active rooms (from sorted list)
    const pagedActiveRooms = useMemo(() => {
        const startIndex = (roomsPage - 1) * roomsPerPage;
        return sortedActiveRooms.slice(startIndex, startIndex + roomsPerPage);
    }, [sortedActiveRooms, roomsPage]);

    // Reset pagination on category change
    useEffect(() => {
        setOtherPage(1);
    }, [selectedOtherCategoryId]);

    // Reset pagination on primary service change
    useEffect(() => {
        setSuggestedPage(1);
    }, [primaryService]);

    // Reset rooms pagination when the available rooms list changes
    useEffect(() => {
        setRoomsPage(1);
    }, [myActiveRooms]);

    // Add / Toggle service selection
    const handleServiceToggle = (service: Service) => {
        setSelectedServices(prev => {
            const existing = prev.find(item => item.service.id === service.id);
            if (existing) {
                // If it is the only service, don't allow removal (at least 1 service is required)
                if (prev.length === 1) {
                    toast.error("You must have at least one service selected.");
                    return prev;
                }
                return prev.filter(item => item.service.id !== service.id);
            } else {
                return [...prev, { service, quantity: 1 }];
            }
        });
    };

    const handleQuantityChange = (serviceId: number, delta: number) => {
        setSelectedServices(prev => prev.map(item => {
            if (item.service.id === serviceId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleRemoveService = (serviceId: number) => {
        if (selectedServices.length === 1) {
            toast.error("You must have at least one service selected.");
            return;
        }
        setSelectedServices(prev => prev.filter(item => item.service.id !== serviceId));
    };

    // Calculate totals
    const subtotal = useMemo(() => {
        return selectedServices.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
    }, [selectedServices]);

    const serviceCharge = useMemo(() => {
        return Math.round(subtotal * 0.05); // 5% service charge
    }, [subtotal]);

    const vat = useMemo(() => {
        return Math.round(subtotal * 0.10); // 10% VAT
    }, [subtotal]);

    const grandTotal = subtotal * selectedRooms.length;

    // Confirm multi-item order booking for ALL selected rooms
    const handleConfirmBooking = async () => {
        if (selectedRoomDetailIds.length === 0) {
            toast.error('Please select at least one room to deliver services.');
            return;
        }
        if (selectedServices.length === 0) {
            toast.error('Please select at least one service.');
            return;
        }

        setIsBooking(true);
        try {
            // Create one order per selected room, each with the same service items
            for (const roomDetailId of selectedRoomDetailIds) {
                // 1. Create a client service order for this room
                const orderResult = await orderServicesApi.createClient({
                    bookingDetailId: roomDetailId
                });

                // 2. Add each service item to that order
                for (const item of selectedServices) {
                    await orderServicesApi.addItemClient(orderResult.id, {
                        serviceId: item.service.id,
                        quantity: item.quantity
                    });
                }
            }

            const roomNums = selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ');
            toast.success(`Successfully booked ${selectedServices.length} service(s) for ${roomNums}!`);
            navigate('/services');
        } catch (error: any) {
            console.error('Multi-service booking failed:', error);
            toast.error(error.response?.data?.message || 'Failed to place service order.');
        } finally {
            setIsBooking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold">Setting up your custom booking portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#f4f7f6] min-h-screen pb-24 font-sans text-slate-800">
            {/* Minimal Header Spacer */}
            <div className="pt-[100px] pb-10 bg-slate-900 border-b-4 border-cyan-500">
                <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
                    <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 uppercase tracking-tighter">Order Services</h1>
                    <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Elevate Your Stay Experience</p>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 mt-12">
                {/* Header Back Button */}
                <div className="mb-8 flex items-center justify-between">
                    <Link to="/services" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold">
                        <ChevronLeftIcon className="w-5 h-5" /> Back to Services
                    </Link>
                    <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-3 py-1 font-bold shadow-sm">
                        Step 2: Service Selection
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column - Room & Service Selector */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* 1. Pick Active Room */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                                    <HomeIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900">1. Select Delivery Rooms</h2>
                                    <p className="text-xs text-slate-500">Pick one or more checked-in rooms — the same services will be ordered for each.</p>
                                </div>
                            </div>

                            {myActiveRooms.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {pagedActiveRooms.map((room) => {
                                            const isSelected = selectedRoomDetailIds.includes(room.bookingDetailId);
                                            return (
                                                <div
                                                    key={room.bookingDetailId}
                                                    onClick={() => handleRoomToggle(room.bookingDetailId)}
                                                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all flex items-center justify-between ${isSelected
                                                        ? 'border-cyan-500 bg-cyan-50/50 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/25'
                                                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <div>
                                                        <span className={`block text-[10px] font-extrabold uppercase tracking-widest ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`}>
                                                            Active Room
                                                        </span>
                                                        <span className="text-2xl font-black text-slate-800">
                                                            Room {room.roomNumber}
                                                        </span>
                                                        <span className="block text-xs text-slate-500 mt-0.5">
                                                            Guest: {room.guestName}
                                                        </span>
                                                    </div>
                                                    {/* Checkbox indicator */}
                                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 bg-white'
                                                        }`}>
                                                        {isSelected && (
                                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {myActiveRooms.length > roomsPerPage && (
                                        <div className="mt-4 flex justify-end">
                                            <Pagination
                                                page={roomsPage}
                                                pageSize={roomsPerPage}
                                                total={myActiveRooms.length}
                                                onPageChange={setRoomsPage}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                                    <SparklesIcon className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-bounce" />
                                    <h4 className="font-bold text-amber-800 text-base">No Active Check-ins Found</h4>
                                    <p className="text-xs text-amber-700 max-w-md mx-auto mt-1">
                                        You can only order services to rooms you are currently checked into. Please contact reception if you believe this is an error.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2. Selected Services and Quantities */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                                    <ShoppingBagIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900">2. Service Basket</h2>
                                    <p className="text-xs text-slate-500">Configure quantities for all your selected luxury experiences.</p>
                                </div>
                            </div>

                            {selectedServices.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {selectedServices.map(({ service, quantity }) => (
                                        <div key={service.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                                    {service.imageUrl ? (
                                                        <img src={service.imageUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <SparklesIcon className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{service.name}</h4>
                                                    <p className="text-xs font-bold text-cyan-600 mt-0.5">
                                                        ${service.price.toLocaleString()} / {service.unit}
                                                    </p>
                                                    <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5">
                                                        {service.categoryName || 'Amenity'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                {/* Price calculation */}
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-xs text-slate-400 block">Subtotal</span>
                                                    <span className="font-bold text-slate-800 text-sm">${(service.price * quantity).toLocaleString()}</span>
                                                </div>

                                                {/* Quantity selectors */}
                                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-1.5">
                                                    <button
                                                        onClick={() => handleQuantityChange(service.id, -1)}
                                                        className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <MinusIcon className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold text-slate-800">{quantity}</span>
                                                    <button
                                                        onClick={() => handleQuantityChange(service.id, 1)}
                                                        className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {/* Delete button */}
                                                <button
                                                    onClick={() => handleRemoveService(service.id)}
                                                    className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all hover:border-rose-100"
                                                    title="Remove service"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
                                    <ShoppingBagIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm font-semibold">Your service basket is currently empty.</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Please click on any service below to add it.</p>
                                </div>
                            )}
                        </div>

                        {/* 3. Recommended: Same Category */}
                        {primaryService && suggestedServices.length > 0 && (
                            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                                    Recommended: {primaryService.categoryName}
                                </h3>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[120px] content-start">
                                    {pagedSuggested.map((service) => {
                                        const isSelected = selectedServiceIds.includes(service.id);
                                        return (
                                            <div
                                                key={service.id}
                                                onClick={() => handleServiceToggle(service)}
                                                className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all group flex flex-col justify-between h-full ${isSelected
                                                    ? 'border-cyan-500 bg-cyan-50/30 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/10'
                                                    : 'border-slate-100 bg-slate-50/50 hover:border-cyan-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div>
                                                    <div className="h-24 rounded-xl overflow-hidden mb-2.5 bg-slate-100 relative">
                                                        {service.imageUrl ? (
                                                            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                                                                <SparklesIcon className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                            ${service.price} / {service.unit}
                                                        </div>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-cyan-600 transition-colors">
                                                        {service.name}
                                                    </h4>
                                                </div>

                                                <div className="mt-2.5 flex items-center justify-between">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                        {service.categoryName || 'Amenity'}
                                                    </span>
                                                    {isSelected ? (
                                                        <CheckCircleIcon className="w-4 h-4 text-cyan-500" />
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border border-slate-200 bg-white group-hover:border-cyan-400" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {suggestedServices.length > roomsPerPage && (
                                    <div className="mt-4 flex justify-end">
                                        <Pagination
                                            page={suggestedPage}
                                            pageSize={roomsPerPage}
                                            total={suggestedServices.length}
                                            onPageChange={setSuggestedPage}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. Other Available Services Section with Dropdown Selection */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                                    Other Available Services
                                </h3>

                                <div className="w-full sm:w-64">
                                    <Select
                                        value={selectedOtherCategoryId}
                                        onChange={(e) => setSelectedOtherCategoryId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full text-xs h-[38px] rounded-xl"
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories
                                            .filter(cat => cat.id !== primaryService?.categoryId)
                                            .map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))
                                        }
                                    </Select>
                                </div>
                            </div>

                            {selectedOtherCategoryId ? (
                                <>
                                    {otherServices.length > 0 ? (
                                        <>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[120px] content-start">
                                                {pagedOther.map((service) => {
                                                    const isSelected = selectedServiceIds.includes(service.id);
                                                    return (
                                                        <div
                                                            key={service.id}
                                                            onClick={() => handleServiceToggle(service)}
                                                            className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all group flex flex-col justify-between h-full ${isSelected
                                                                ? 'border-cyan-500 bg-cyan-50/30 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/10'
                                                                : 'border-slate-100 bg-slate-50/50 hover:border-cyan-200 hover:bg-slate-50'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="h-24 rounded-xl overflow-hidden mb-2.5 bg-slate-100 relative">
                                                                    {service.imageUrl ? (
                                                                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                                                                            <SparklesIcon className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                        ${service.price} / {service.unit}
                                                                    </div>
                                                                </div>
                                                                <h4 className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-cyan-600 transition-colors">
                                                                    {service.name}
                                                                </h4>
                                                            </div>

                                                            <div className="mt-2.5 flex items-center justify-between">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                                                    {service.categoryName || 'Amenity'}
                                                                </span>
                                                                {isSelected ? (
                                                                    <CheckCircleIcon className="w-4 h-4 text-cyan-500" />
                                                                ) : (
                                                                    <div className="w-4 h-4 rounded-full border border-slate-200 bg-white group-hover:border-cyan-400" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {otherServices.length > roomsPerPage && (
                                                <div className="mt-4 flex justify-end">
                                                    <Pagination
                                                        page={otherPage}
                                                        pageSize={roomsPerPage}
                                                        total={otherServices.length}
                                                        onPageChange={setOtherPage}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400 text-xs">
                                            No active services found in this category.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                                    Please select a category above to view more premium services.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Order Summary Sidebar Card */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Order Summary</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Deliverable details and price invoice breakdown.</p>
                            </div>

                            {/* Target Delivery Rooms */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
                                    Delivery Rooms ({selectedRooms.length} selected)
                                </span>
                                {selectedRooms.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {selectedRooms.map(room => (
                                            <div key={room.bookingDetailId} className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0" />
                                                <span className="font-extrabold text-slate-800 text-xs">
                                                    Room {room.roomNumber}
                                                </span>
                                                <span className="text-[10px] text-slate-400">— {room.guestName}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">No rooms selected. Choose rooms in step 1.</span>
                                )}
                            </div>

                            {/* Service Order Itemsized breakdown */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                                    Order Items
                                </span>

                                {selectedServices.length > 0 ? (
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                        {selectedServices.map(({ service, quantity }) => (
                                            <div key={service.id} className="flex justify-between items-start text-xs">
                                                <div className="pr-4">
                                                    <span className="font-bold text-slate-800">{service.name}</span>
                                                    <span className="block text-slate-400 text-[10px]">
                                                        Qty: {quantity} &times; ${service.price}
                                                    </span>
                                                </div>
                                                <span className="font-extrabold text-slate-800">${(service.price * quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic block py-2">No services selected in basket.</span>
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* Fee breakdown */}
                            <div className="space-y-2.5 text-xs text-slate-600">
                                <div className="flex justify-between">
                                    <span>Services Subtotal</span>
                                    <span className="font-bold text-slate-800">${subtotal.toLocaleString()}</span>
                                </div>
                                {/* <div className="flex justify-between">
                                    <span>Service Charge (5%)</span>
                                    <span>${serviceCharge.toLocaleString()}</span>
                                </div> */}
                                <div className="flex justify-between">
                                    <span></span>
                                    <span> X </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Selected Rooms: </span>
                                    <span>{selectedRooms.length}</span>
                                </div>

                                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                                    <span>Grand Total</span>
                                    <span className="text-cyan-700">${grandTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => void handleConfirmBooking()}
                                disabled={isBooking || selectedRoomDetailIds.length === 0 || selectedServices.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-cyan-100 disabled:opacity-50 disabled:shadow-none"
                            >
                                {isBooking
                                    ? 'Placing Order...'
                                    : `Confirm Order${selectedRooms.length > 1 ? ` for ${selectedRooms.length} Rooms` : ''}`
                                } <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

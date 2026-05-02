import { useQuery } from '@tanstack/react-query';
import {
    BanknotesIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    HomeIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../../api/dashboardApi';
import type { DashboardOverview, DashboardPendingService, DashboardRecentBooking, DashboardRoomTask, ManagerDashboard } from '../../api/dashboardApi';
import { toApiError } from '../../api/httpClient';
import toast from 'react-hot-toast';
import { useAppAuth } from '../../auth/useAppAuth';
import { Badge } from '../../components/Badge';

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: { value: string; positive: boolean };
    icon: React.ComponentType<{ className: string }>;
    color: 'blue' | 'cyan' | 'emerald' | 'rose' | 'amber';
}

function MetricCard({ title, value, subValue, trend, icon: Icon, color }: MetricCardProps) {
    const gradients = {
        blue: 'from-blue-500/10 to-indigo-500/5 border-blue-100',
        cyan: 'from-cyan-500/10 to-blue-500/5 border-cyan-100',
        emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-100',
        rose: 'from-rose-500/10 to-pink-500/5 border-rose-100',
        amber: 'from-amber-500/10 to-orange-500/5 border-amber-100',
    };
    const iconColors = {
        blue: 'text-blue-600 bg-blue-50',
        cyan: 'text-cyan-600 bg-cyan-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        rose: 'text-rose-600 bg-rose-50',
        amber: 'text-amber-600 bg-amber-50',
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${gradients[color]}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
                    <div className="mt-1 flex items-center gap-2">
                        {trend && (
                            <span className={`text-xs font-bold ${trend.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {trend.positive ? '↑' : '↓'} {trend.value}
                            </span>
                        )}
                        <span className="text-xs text-slate-500 italic">{subValue}</span>
                    </div>
                </div>
                <div className={`rounded-xl p-3 shadow-sm bg-white ${iconColors[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5 h-24 w-24">
                <Icon className="h-full w-full" />
            </div>
        </div>
    );
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAppAuth();
    const role = (user?.role ?? '').toLowerCase();
    const isHousekeeper = role === 'housekeeping';
    const isAccountant = role === 'accountant';
    const isReceptionist = role === 'receptionist';
    const rangeDays = 7;

    const {
        data: stats,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['dashboard-role', role],
        queryFn: () => dashboardApi.getRoleDashboard(rangeDays),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const emptyOverview = {
        totalRevenue: 0,
        bookingCount: 0,
        occupancyRate: 0,
        auditLogTotal: 0,
        occupancy: { total: 0, occupied: 0, maintenance: 0, available: 0 },
        revenueChartData: [],
        statusChartData: [],
        recentBookings: [],
        criticalAlerts: [],
        pendingServices: [],
    };

    const overview: DashboardOverview = stats?.manager?.overview ?? stats?.overview ?? emptyOverview;
    const managerExtras: ManagerDashboard = stats?.manager ?? {
        overview: emptyOverview,
        pendingCleaningRequests: 0,
        pendingServiceOrders: 0,
        totalLossPenalty: 0,
        pendingArticles: 0,
        pendingCleaningRooms: [],
        inspectingRooms: [],
    };
    const housekeeper = stats?.housekeeper ?? {
        cleanedToday: 0,
        cleanedInRange: 0,
        cleaningRequests: 0,
        inspectionRequests: 0,
    };
    const accountant = stats?.accountant ?? {
        totalRevenue: 0,
        totalLossPenalty: 0,
        netProfit: 0,
        revenueChartData: [],
        topInvoices: [],
    };
    const receptionist = stats?.receptionist ?? {
        publishedArticles: 0,
        pendingArticles: 0,
        pendingServiceOrders: 0,
        completedServiceOrdersToday: 0,
        serviceQueue: [],
    };
    const pendingCleaningRooms: DashboardRoomTask[] = managerExtras.pendingCleaningRooms ?? [];
    const inspectingRooms: DashboardRoomTask[] = managerExtras.inspectingRooms ?? [];
    const pendingServices: DashboardPendingService[] = overview.pendingServices ?? [];
    const recentBookings: DashboardRecentBooking[] = overview.recentBookings ?? [];

    const occupancy = overview.occupancy ?? { total: 0, occupied: 0, maintenance: 0, available: 0 };
    const revenueChartData = overview.revenueChartData ?? [];
    const statusChartData = overview.statusChartData ?? [];
    const criticalAlerts = overview.criticalAlerts ?? [];

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                            <div className="mt-3 h-9 w-32 animate-pulse rounded-xl bg-slate-200" />
                            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center p-12 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-rose-500 opacity-20" />
                <h3 className="mt-4 text-xl font-bold text-slate-900">Failed to load dashboard data</h3>
                <p className="mt-2 text-slate-500">Please check that the backend server is running and try again.</p>
                <p className="mt-1 text-xs text-slate-400">{toApiError(error).message}</p>
                <button
                    onClick={() => { void refetch(); }}
                    className="mt-6 rounded-xl bg-cyan-700 px-6 py-2.5 font-bold text-white shadow-lg hover:bg-cyan-800"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    if (isHousekeeper) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Housekeeping Dashboard</h2>
                    <p className="text-slate-500">Daily cleaning activity and room requests.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Cleaned Today"
                        value={housekeeper.cleanedToday}
                        subValue="Rooms completed"
                        icon={HomeIcon}
                        color="emerald"
                    />
                    <MetricCard
                        title={`Cleaned (${rangeDays} days)`}
                        value={housekeeper.cleanedInRange}
                        subValue="Rooms completed"
                        icon={ClipboardDocumentListIcon}
                        color="cyan"
                    />
                    <MetricCard
                        title="Cleaning Requests"
                        value={housekeeper.cleaningRequests}
                        subValue="Pending"
                        icon={ClockIcon}
                        color="amber"
                    />
                    <MetricCard
                        title="Inspection Requests"
                        value={housekeeper.inspectionRequests}
                        subValue="New requests"
                        icon={ExclamationTriangleIcon}
                        color="rose"
                    />
                    <MetricCard
                        title="Inspecting Count"
                        value={housekeeper.inspectingCount}
                        subValue="Currently inspecting"
                        icon={ClockIcon}
                        color="blue"
                    />
                </div>
            </div>
        );
    }

    if (isAccountant) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Finance Dashboard</h2>
                    <p className="text-slate-500">Revenue, penalties, and invoice highlights.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricCard
                        title="Total Revenue"
                        value={`$${accountant.totalRevenue.toLocaleString()}`}
                        subValue="All successful payments"
                        icon={BanknotesIcon}
                        color="cyan"
                    />
                    <MetricCard
                        title="Loss & Damage"
                        value={`$${accountant.totalLossPenalty.toLocaleString()}`}
                        subValue="Total penalties"
                        icon={ExclamationTriangleIcon}
                        color="rose"
                    />
                    <MetricCard
                        title="Net Profit"
                        value={`$${accountant.netProfit.toLocaleString()}`}
                        subValue="Revenue minus penalties"
                        icon={ArrowPathIcon}
                        color="emerald"
                    />
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-cyan-50 p-2">
                                <BanknotesIcon className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Revenue Trend</h3>
                                <p className="text-xs text-slate-500">Last {rangeDays} days</p>
                            </div>
                        </div>
                        <div className="mt-8 h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={accountant.revenueChartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900">Top Invoices</h3>
                        <div className="mt-6 space-y-4">
                            {accountant.topInvoices.length === 0 && <p className="text-sm text-slate-500">No completed invoices found.</p>}
                            {accountant.topInvoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{invoice.invoiceCode || `#${invoice.id}`}</p>
                                        <p className="text-xs text-slate-500">{invoice.completedAt ? new Date(invoice.completedAt).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600">${invoice.finalTotal.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isReceptionist) {
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Reception Dashboard</h2>
                    <p className="text-slate-500">Articles and service queue overview.</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Published Articles"
                        value={receptionist.publishedArticles}
                        subValue="Active posts"
                        icon={ClipboardDocumentListIcon}
                        color="blue"
                    />
                    <MetricCard
                        title="Pending Articles"
                        value={receptionist.pendingArticles}
                        subValue="Awaiting publish"
                        icon={ExclamationTriangleIcon}
                        color="amber"
                    />
                    <MetricCard
                        title="Service Queue"
                        value={receptionist.pendingServiceOrders}
                        subValue="Pending orders"
                        icon={ClockIcon}
                        color="rose"
                    />
                    <MetricCard
                        title="Services Completed"
                        value={receptionist.completedServiceOrdersToday}
                        subValue="Today"
                        icon={ArrowPathIcon}
                        color="emerald"
                    />
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Service Queue</h3>
                    <p className="text-sm text-slate-500 mb-4">Pending orders requiring attention.</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium rounded-tl-lg">Order ID</th>
                                    <th className="px-4 py-3 font-medium">Room</th>
                                    <th className="px-4 py-3 font-medium">Guest</th>
                                    <th className="px-4 py-3 font-medium">Order Date</th>
                                    <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {receptionist.serviceQueue.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">#{order.id}</td>
                                        <td className="px-4 py-3 text-slate-700">Room {order.roomNumber}</td>
                                        <td className="px-4 py-3 text-slate-700">{order.guestName}</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(order.orderDate).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                type="button"
                                                onClick={() => navigate(`/admin/reception/order-services/${order.id}`)}
                                                className="text-cyan-600 hover:text-cyan-800 font-semibold"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {receptionist.serviceQueue.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                            No pending service orders in the queue.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Executive Overview</h2>
                    <p className="text-slate-500">Real-time performance metrics and operational monitoring.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            toast.loading('Syncing latest data...', { duration: 1000 });
                            void refetch();
                        }}
                        className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md active:scale-95"
                    >
                        <ArrowPathIcon className={`h-5 w-5 text-slate-400 group-hover:text-cyan-600 ${isLoading ? 'animate-spin text-cyan-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                    title="Total Revenue"
                    value={`$${(overview.totalRevenue || 0).toLocaleString()}`}
                    subValue="All active invoices"
                    trend={{ value: '12.5%', positive: true }}
                    icon={BanknotesIcon}
                    color="cyan"
                />
                <MetricCard
                    title="Loss & Damage"
                    value={`$${(managerExtras.totalLossPenalty || 0).toLocaleString()}`}
                    subValue="Total penalties"
                    icon={ExclamationTriangleIcon}
                    color="rose"
                />
                <MetricCard
                    title="Net Profit"
                    value={`$${(overview.netProfit || managerExtras.netProfit || 0).toLocaleString()}`}
                    subValue="Revenue minus penalties"
                    icon={BanknotesIcon}
                    color="emerald"
                />
                
                <MetricCard
                    title="Total Bookings"
                    value={overview.bookingCount || 0}
                    subValue="Confirmed stays"
                    trend={{ value: '5.2%', positive: true }}
                    icon={CalendarDaysIcon}
                    color="blue"
                />
                <MetricCard
                    title="Occupancy Rate"
                    value={`${overview.occupancyRate || 0}%`}
                    subValue={`${occupancy.occupied} of ${occupancy.total} rooms`}
                    trend={{ value: '2.1%', positive: false }}
                    icon={HomeIcon}
                    color="emerald"
                />
                <MetricCard
                    title="Staff Actions"
                    value={overview.auditLogTotal || 0}
                    subValue="Audit logs"
                    icon={ClipboardDocumentListIcon}
                    color="amber"
                />

                <MetricCard
                    title="Cleaning Requests"
                    value={managerExtras.pendingCleaningRequests || 0}
                    subValue="Awaiting"
                    icon={ClockIcon}
                    color="amber"
                />
                <MetricCard
                    title="Inspecting Count"
                    value={overview.inspectingCount || managerExtras.inspectingCount || 0}
                    subValue="Rooms to check"
                    icon={ClipboardDocumentListIcon}
                    color="rose"
                />
                <MetricCard
                    title="Service Queue"
                    value={managerExtras.pendingServiceOrders || 0}
                    subValue="Pending orders"
                    icon={ArrowPathIcon}
                    color="cyan"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Rooms to Clean</h3>
                            <p className="text-xs text-slate-500">Click to open cleaning board</p>
                        </div>
                        <Badge value={`${pendingCleaningRooms.length} Pending`} />
                    </div>
                    <div className="mt-6 space-y-3">
                        {pendingCleaningRooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => navigate(`/admin/cleaning?roomId=${room.id}&tab=cleaning`)}
                                className="flex w-full items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Room {room.roomNumber}</p>
                                    <p className="text-xs text-slate-500">Cleaning requested</p>
                                </div>
                                <Badge value={room.cleaningStatus || room.status || 'Pending'} />
                            </button>
                        ))}
                        {pendingCleaningRooms.length === 0 && (
                            <p className="py-6 text-center text-sm text-slate-400">No rooms waiting for cleaning.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Rooms Inspecting</h3>
                            <p className="text-xs text-slate-500">Click to open inspection board</p>
                        </div>
                        <Badge value={`${inspectingRooms.length} Inspecting`} />
                    </div>
                    <div className="mt-6 space-y-3">
                        {inspectingRooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => navigate(`/admin/cleaning?roomId=${room.id}&tab=inspecting`)}
                                className="flex w-full items-center justify-between rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Room {room.roomNumber}</p>
                                    <p className="text-xs text-slate-500">Waiting for inspection</p>
                                </div>
                                <Badge value={room.cleaningStatus || room.status || 'Inspecting'} />
                            </button>
                        ))}
                        {inspectingRooms.length === 0 && (
                            <p className="py-6 text-center text-sm text-slate-400">No rooms currently inspecting.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Service Queue</h3>
                            <p className="text-xs text-slate-500">Click to open order details</p>
                        </div>
                        <Badge value={`${pendingServices.length} Pending`} />
                    </div>
                    <div className="mt-6 space-y-3">
                        {pendingServices.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => navigate(`/admin/reception/order-services/${order.id}`)}
                                className="flex w-full items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Room {order.roomNumber}</p>
                                    <p className="text-xs text-slate-500">{order.guestName}</p>
                                </div>
                                <Badge value="Pending" />
                            </button>
                        ))}
                        {pendingServices.length === 0 && (
                            <p className="py-6 text-center text-sm text-slate-400">No pending service orders.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-cyan-50 p-2">
                                <BanknotesIcon className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Revenue Evolution</h3>
                                <p className="text-xs text-slate-500">Daily financial performance trend</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2">
                            <HomeIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Room Status</h3>
                            <p className="text-xs text-slate-500">Real-time inventory split</p>
                        </div>
                    </div>
                    <div className="mt-6 flex h-[250px] items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    {statusChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
                    <div className="mt-6 space-y-3">
                        {recentBookings.map((booking) => (
                            <div key={booking.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{booking.guestName}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {new Date(booking.checkInDate).toLocaleDateString()} - {new Date(booking.checkOutDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Badge value={booking.status} />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                    <span>Booking #{booking.id}</span>
                                    <span className="font-semibold text-slate-900">${booking.totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Critical Alerts</h3>
                    <div className="mt-6 space-y-3">
                        {criticalAlerts.map((alert) => (
                            <div key={alert.id} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                                <p className="text-sm font-semibold text-rose-900">{alert.itemName}</p>
                                <p className="text-xs text-rose-700">${alert.penalty.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BanknotesIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    HomeIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
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
import type { DashboardOverview, DashboardPendingService, DashboardRecentBooking, DashboardRoomTask, ManagerDashboard, DashboardMetricComparison } from '../../api/dashboardApi';
import { toApiError } from '../../api/httpClient';
import toast from 'react-hot-toast';
import { useAppAuth } from '../../auth/useAppAuth';
import { Badge } from '../../components/Badge';

interface MetricCardProps {
    title: string;
    value: string | number;
    subValue?: string;
    comparison?: DashboardMetricComparison;
    icon: React.ComponentType<{ className: string }>;
    color: 'blue' | 'cyan' | 'emerald' | 'rose' | 'amber';
}

function MetricCard({ title, value, subValue, comparison, icon: Icon, color }: MetricCardProps) {
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

    const isPositive = comparison?.directionMeaning === 'positive';
    const isNegative = comparison?.directionMeaning === 'negative';
    const trendIcon = comparison?.trend === 'up' ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />;

    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${gradients[color]}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    <h3 className="mt-2 text-3xl font-bold text-slate-900 truncate">{value}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {comparison && comparison.growthRate !== 0 && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${isPositive ? 'bg-emerald-50 text-emerald-600' :
                                isNegative ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'
                                }`}>
                                {trendIcon}
                                {Math.abs(comparison.growthRate)}%
                            </span>
                        )}
                        <span className="text-xs text-slate-500 italic truncate">{subValue}</span>
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

    const [rangeDays, setRangeDays] = useState(7);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const {
        data: stats,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['dashboard-role', role, rangeDays],
        queryFn: () => dashboardApi.getRoleDashboard(rangeDays, false),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const tid = toast.loading('Syncing latest data from database...');
        try {
            // First, call the POST refresh to update snapshots in BE
            await dashboardApi.forceRefresh();
            // Then, refetch the current range
            await refetch();
            toast.success('Dashboard refreshed successfully', { id: tid });
        } catch (err) {
            console.error('Refresh error:', err);
            toast.error('Failed to refresh dashboard', { id: tid });
        } finally {
            setIsRefreshing(false);
        }
    };

    // Default structures for new API format
    const emptyOverview: DashboardOverview = {
        meta: { schemaVersion: 1, dashboardCode: '', roleName: '', periodType: '', periodKey: '', periodStart: '', periodEnd: '', status: '', generatedAt: '' },
        summary: { totalRevenue: 0, bookingCount: 0, netProfit: 0, auditLogTotal: 0, comparison: { base: { comparisonType: '', currentPeriodKey: '', previousPeriodKey: '' }, metrics: {} } },
        widgets: { revenueChart: [], roomStatusChart: [], recentBookings: [], pendingServices: [] },
        breakdown: { occupancy: { total: 0, occupied: 0, maintenance: 0, available: 0 }, inspectingCount: 0 },
        alerts: [],
        events: [],
    };

    const overview: DashboardOverview = stats?.overview ?? emptyOverview;
    const managerExtras: ManagerDashboard = stats?.manager ?? {
        pendingCleaningRequests: 0,
        pendingServiceOrders: 0,
        totalLossPenalty: 0,
        netProfit: 0,
        pendingArticles: 0,
        inspectingCount: 0,
        pendingCleaningRooms: [],
        inspectingRooms: [],
    };

    const housekeeper = stats?.housekeeper ?? { cleanedToday: 0, cleanedInRange: 0, cleaningRequests: 0, inspectionRequests: 0, inspectingCount: 0 };
    const accountant = stats?.accountant ?? { totalRevenue: 0, totalLossPenalty: 0, netProfit: 0, revenueChartData: [], topInvoices: [] };
    const receptionist = stats?.receptionist ?? { publishedArticles: 0, pendingArticles: 0, pendingServiceOrders: 0, completedServiceOrdersToday: 0, serviceQueue: [] };

    const occupancy = overview.breakdown.occupancy;
    const revenueChartData = overview.widgets.revenueChart;
    const roomStatusChart = overview.widgets.roomStatusChart;
    const recentBookings = overview.widgets.recentBookings;
    const pendingServices = overview.widgets.pendingServices;
    const comparison = overview.summary.comparison;

    if (isLoading && !isRefreshing) {
        return (
            <div className="space-y-8 p-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                <div className="rounded-full bg-rose-50 p-6">
                    <ExclamationTriangleIcon className="h-16 w-16 text-rose-500 opacity-80" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">Failed to load dashboard data</h3>
                <p className="mt-2 text-slate-500 max-w-md">Please check that the backend server is running and try again.</p>
                <p className="mt-1 text-xs text-slate-400 font-mono">{toApiError(error).message}</p>
                <button
                    onClick={() => { void refetch(); }}
                    className="mt-8 rounded-xl bg-cyan-700 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-cyan-800 hover:shadow-cyan-900/20 active:scale-95"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    const periodOptions = [
        { label: 'Today', value: 1 },
        { label: 'Week', value: 7 },
        { label: 'Month', value: 30 },
        { label: 'Year', value: 365 },
        { label: 'All Time', value: 0 },
    ];

    const Header = () => (
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
            <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {isHousekeeper ? 'Housekeeping Dashboard' : isAccountant ? 'Finance Dashboard' : isReceptionist ? 'Reception Dashboard' : 'Executive Overview'}
                </h2>
                <p className="text-slate-500 mt-1">
                    {isHousekeeper ? 'Daily cleaning activity and room requests.' : isAccountant ? 'Revenue, penalties, and invoice highlights.' : isReceptionist ? 'Articles and service queue overview.' : 'Real-time performance metrics and operational monitoring.'}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-xl bg-slate-100 p-1 shadow-inner">
                    {periodOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setRangeDays(opt.value)}
                            className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${rangeDays === opt.value ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 disabled:opacity-50"
                >
                    <ArrowPathIcon className={`h-5 w-5 text-slate-400 group-hover:text-cyan-600 ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>
        </div>
    );

    if (isHousekeeper) {
        return (
            <div className="p-6 space-y-8">
                <Header />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    <MetricCard title="Cleaned Today" value={housekeeper.cleanedToday} subValue="Rooms completed" icon={HomeIcon} color="emerald" />
                    <MetricCard title={`Cleaned (${rangeDays === 0 ? 'All' : rangeDays + 'd'})`} value={housekeeper.cleanedInRange} subValue="Rooms in period" icon={ClipboardDocumentListIcon} color="cyan" />
                    <MetricCard title="Cleaning Requests" value={housekeeper.pendingCleaningRooms?.length || 0} subValue="Pending now" icon={ClockIcon} color="amber" />
                    <MetricCard title="Inspection Needed" value={housekeeper.inspectionRequests} subValue="Awaiting check" icon={ExclamationTriangleIcon} color="rose" />
                    <MetricCard title="Currently Inspecting" value={housekeeper.inspectingCount} subValue="In progress" icon={ClockIcon} color="blue" />
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Pending Cleaning Rooms</h3>
                            <button onClick={() => navigate('/admin/cleaning')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                        </div>
                        <div className="space-y-3">
                            {housekeeper.pendingCleaningRooms?.map((room) => (
                                <div key={room.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/rooms/${room.id}`)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</p>
                                        </div>
                                        <Badge value="Cleaning" color="rose" />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span>Status: {room.status}</span>
                                    </div>
                                </div>
                            ))}
                            {(!housekeeper.pendingCleaningRooms || housekeeper.pendingCleaningRooms.length === 0) && <p className="py-8 text-center text-sm text-slate-400">No rooms need cleaning.</p>}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Rooms Being Inspected</h3>
                            <button onClick={() => navigate('/admin/cleaning')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                        </div>
                        <div className="space-y-3">
                            {housekeeper.inspectingRooms?.map((room) => (
                                <div key={room.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/rooms/${room.id}`)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</p>
                                        </div>
                                        <Badge value="Inspecting" color="blue" />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span>Status: {room.status}</span>
                                    </div>
                                </div>
                            ))}
                            {(!housekeeper.inspectingRooms || housekeeper.inspectingRooms.length === 0) && <p className="py-8 text-center text-sm text-slate-400">No rooms currently under inspection.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isAccountant) {
        return (
            <div className="p-6 space-y-8">
                <Header />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricCard title="Total Revenue" value={`$${accountant.totalRevenue.toLocaleString()}`} subValue="Total earned" icon={BanknotesIcon} color="cyan" />
                    <MetricCard title="Loss & Damage" value={`$${accountant.totalLossPenalty.toLocaleString()}`} subValue="Total penalties" icon={ExclamationTriangleIcon} color="rose" />
                    <MetricCard title="Net Profit" value={`$${accountant.netProfit.toLocaleString()}`} subValue="Profit realized" icon={ArrowPathIcon} color="emerald" />
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-cyan-50 p-2">
                                    <BanknotesIcon className="h-5 w-5 text-cyan-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Revenue Evolution</h3>
                                    <p className="text-xs text-slate-500">Daily performance trend</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={accountant.revenueChartData}>
                                    <defs>
                                        <linearGradient id="colorRevenueAccountant" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#0891b2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueAccountant)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Top Invoices</h3>
                            <button onClick={() => navigate('/admin/invoices')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                        </div>
                        <div className="space-y-3">
                            {accountant.topInvoices?.map((invoice) => (
                                <div key={invoice.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/invoices/${invoice.id}`)}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{invoice.invoiceCode}</p>
                                        </div>
                                        <span className="font-semibold text-emerald-600">${invoice.finalTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span>Completed: {invoice.completedAt ? new Date(invoice.completedAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                            {(!accountant.topInvoices || accountant.topInvoices.length === 0) && <p className="py-8 text-center text-sm text-slate-400">No invoices available.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isReceptionist) {
        return (
            <div className="p-6 space-y-8">
                <Header />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Pending Orders" value={receptionist.pendingServiceOrders} subValue="Awaiting fulfillment" icon={ClockIcon} color="amber" />
                    <MetricCard title="Completed Today" value={receptionist.completedServiceOrdersToday} subValue="Orders fulfilled" icon={ClipboardDocumentListIcon} color="emerald" />
                    <MetricCard title="Pending Articles" value={receptionist.pendingArticles} subValue="Needs review" icon={ExclamationTriangleIcon} color="rose" />
                    <MetricCard title="Published Articles" value={receptionist.publishedArticles} subValue="Active posts" icon={HomeIcon} color="blue" />
                </div>
                
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Service Queue (Pending Orders)</h3>
                        <button onClick={() => navigate('/admin/reception/order-services')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium rounded-tl-lg">Order ID</th>
                                    <th className="px-4 py-3 font-medium">Room</th>
                                    <th className="px-4 py-3 font-medium">Guest</th>
                                    <th className="px-4 py-3 font-medium">Order Time</th>
                                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {receptionist.serviceQueue.map((order) => (
                                    <tr key={order.id} className="transition-colors hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/reception/order-services/${order.id}`)}>
                                        <td className="px-4 py-3 font-semibold text-slate-900">#{order.id}</td>
                                        <td className="px-4 py-3">Room {order.roomNumber}</td>
                                        <td className="px-4 py-3">{order.guestName}</td>
                                        <td className="px-4 py-3">{new Date(order.orderDate).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Badge value="Pending" />
                                        </td>
                                    </tr>
                                ))}
                                {receptionist.serviceQueue.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No pending orders at the moment.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Rooms to Clean</h3>
                        <div className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">Real-time</div>
                    </div>
                    <div className="space-y-3">
                        {receptionist.pendingCleaningRooms?.map((room) => (
                            <div key={room.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/rooms/${room.id}`)}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</p>
                                        <p className="mt-1 text-xs text-slate-500">{room.status} • {room.cleaningStatus}</p>
                                    </div>
                                    <Badge value="To Clean" color="amber" />
                                </div>
                            </div>
                        ))}
                        {(!receptionist.pendingCleaningRooms || receptionist.pendingCleaningRooms.length === 0) && <p className="py-8 text-center text-sm text-slate-400">All rooms are clean.</p>}
                    </div>
                </div>
            </div>
        );
    }

    // Default Executive Dashboard
    return (
        <div className="p-6 space-y-8">
            <Header />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Revenue"
                    value={`$${(overview.summary.totalRevenue || 0).toLocaleString()}`}
                    subValue="All successful payments"
                    comparison={comparison.metrics.revenue}
                    icon={BanknotesIcon}
                    color="cyan"
                />
                <MetricCard
                    title="Net Profit"
                    value={`$${(overview.summary.netProfit || 0).toLocaleString()}`}
                    subValue="Revenue minus penalties"
                    comparison={comparison.metrics.netProfit}
                    icon={BanknotesIcon}
                    color="emerald"
                />
                <MetricCard
                    title="Total Bookings"
                    value={overview.summary.bookingCount || 0}
                    subValue="Confirmed stays"
                    comparison={comparison.metrics.bookings}
                    icon={CalendarDaysIcon}
                    color="blue"
                />
                <MetricCard
                    title="Rooms to Clean"
                    value={overview.breakdown.pendingCleaningRooms?.length || 0}
                    subValue="Awaiting cleaning"
                    //comparison={comparison.metrics.cleaningRequests}
                    icon={HomeIcon}
                    color="amber"
                />

                <MetricCard
                    title="Service Orders"
                    value={overview.summary.serviceOrdersCount || 0}
                    subValue="Period total"
                    comparison={comparison.metrics.serviceOrders}
                    icon={ArrowPathIcon}
                    color="amber"
                />
                <MetricCard
                    title="Active Articles"
                    value={overview.summary.articlesCount || 0}
                    subValue="Published posts"
                    comparison={comparison.metrics.articles}
                    icon={ClipboardDocumentListIcon}
                    color="blue"
                />
                <MetricCard
                    title="Occupancy Rate"
                    value={`${occupancy.total === 0 ? 0 : Math.round((occupancy.occupied / occupancy.total) * 100)}%`}
                    subValue={`${occupancy.occupied} of ${occupancy.total} rooms`}
                    icon={HomeIcon}
                    color="emerald"
                />
                <MetricCard
                    title="Damage Reports"
                    value={comparison.metrics.damageReports?.current || 0}
                    subValue="New issues reported"
                    comparison={comparison.metrics.damageReports}
                    icon={ExclamationTriangleIcon}
                    color="rose"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-cyan-50 p-2">
                                <BanknotesIcon className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Revenue Evolution</h3>
                                <p className="text-xs text-slate-500">Daily performance trend for selected period</p>
                            </div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
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
                    <div className="flex items-center gap-3 mb-8">
                        <div className="rounded-lg bg-indigo-50 p-2">
                            <HomeIcon className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Room Status</h3>
                            <p className="text-xs text-slate-500">Real-time inventory split</p>
                        </div>
                    </div>
                    <div className="flex h-[250px] items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={roomStatusChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                    {roomStatusChart.map((entry, index) => (
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

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
                        <button onClick={() => navigate('/admin/reception/bookings')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                    </div>
                    <div className="space-y-3">
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
                        {recentBookings.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No recent bookings found.</p>}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Pending Orders</h3>
                        <button onClick={() => navigate('/admin/reception/order-services')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                    </div>
                    <div className="space-y-3">
                        {pendingServices.map((order) => (
                            <div key={order.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/reception/order-services/${order.id}`)}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Room {order.roomNumber}</p>
                                        <p className="mt-1 text-xs text-slate-500">{order.guestName}</p>
                                    </div>
                                    <Badge value="Pending" color="amber" />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                    <span>Order #{order.id}</span>
                                    <span>{new Date(order.orderDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        {pendingServices.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No pending orders.</p>}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Rooms to Clean</h3>
                        <div className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-600">Real-time</div>
                    </div>
                    <div className="space-y-3">
                        {overview.breakdown.pendingCleaningRooms?.map((room) => (
                            <div key={room.id} className="rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/admin/rooms/${room.id}`)}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Room {room.roomNumber}</p>
                                        <p className="mt-1 text-xs text-slate-500">{room.status} • {room.cleaningStatus}</p>
                                    </div>
                                    <Badge value="To Clean" color="amber" />
                                </div>
                            </div>
                        ))}
                        {(!overview.breakdown.pendingCleaningRooms || overview.breakdown.pendingCleaningRooms.length === 0) && <p className="py-8 text-center text-sm text-slate-400">All rooms are clean.</p>}
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Recent Events</h3>
                        <button onClick={() => navigate('/admin/audit-log')} className="text-xs font-bold text-cyan-600 hover:text-cyan-700">View All</button>
                    </div>
                    <div className="space-y-3">
                        {overview.events.map((ev) => (
                            <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-slate-50 bg-slate-50/50 p-3">
                                <div className="mt-1 h-2 w-2 rounded-full bg-cyan-500" />
                                <div>
                                    <p className="text-sm text-slate-900">{ev.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(ev.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                        {overview.events.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No recent events tracked.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

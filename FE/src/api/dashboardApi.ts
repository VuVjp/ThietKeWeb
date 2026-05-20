import { httpClient } from './httpClient';

export interface DashboardRevenuePoint {
    name: string;
    revenue: number;
    bookings: number;
}

export interface DashboardRoomStatusPoint {
    name: string;
    value: number;
    color: string;
}

export interface DashboardRecentBooking {
    id: number;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    status: string;
}

export interface DashboardCriticalAlert {
    id: string | number;
    itemName: string;
    room: string;
    penalty: number;
    description: string;
}

export interface DashboardPendingService {
    id: number;
    roomNumber: string;
    guestName: string;
    orderDate: string;
}

export interface DashboardRoomTask {
    id: number;
    roomNumber: string;
    status: string;
    cleaningStatus: string;
    cleaningRequested: boolean;
}

export interface DashboardEvent {
    id: number;
    type: string;
    message: string;
    timestamp: string;
    severity: string;
}

export interface DashboardMetricComparison {
    current: number;
    previous: number;
    difference: number;
    growthRate: number;
    trend: 'up' | 'down' | 'flat';
    directionMeaning: 'positive' | 'negative' | 'neutral';
}

export interface DashboardComparison {
    base: {
        comparisonType: string;
        currentPeriodKey: string;
        previousPeriodKey: string;
    };
    metrics: {
        revenue?: DashboardMetricComparison;
        bookings?: DashboardMetricComparison;
        netProfit?: DashboardMetricComparison;
        damageReports?: DashboardMetricComparison;
        lowStockItems?: DashboardMetricComparison;
        cleaningRequests?: DashboardMetricComparison;
        articles?: DashboardMetricComparison;
        serviceOrders?: DashboardMetricComparison;
        completedServiceOrders?: DashboardMetricComparison;
        serviceRevenue?: DashboardMetricComparison;
    };
}

export interface DashboardOverview {
    meta: {
        schemaVersion: number;
        dashboardCode: string;
        roleName: string;
        periodType: string;
        periodKey: string;
        periodStart: string;
        periodEnd: string;
        status: string;
        generatedAt: string;
    };
    summary: {
        totalRevenue: number;
        bookingCount: number;
        netProfit: number;
        auditLogTotal: number;
        articlesCount: number;
        serviceOrdersCount: number;
        completedServiceOrdersCount: number;
        serviceRevenue: number;
        comparison: DashboardComparison;
    };
    widgets: {
        revenueChart: DashboardRevenuePoint[];
        roomStatusChart: DashboardRoomStatusPoint[];
        recentBookings: DashboardRecentBooking[];
        pendingServices: DashboardPendingService[];
    };
    breakdown: {
        occupancy: {
            total: number;
            occupied: number;
            maintenance: number;
            available: number;
        };
        inspectingCount: number;
        pendingCleaningRooms: DashboardRoomTask[];
        inspectingRooms: DashboardRoomTask[];
    };
    alerts: DashboardCriticalAlert[];
    events: DashboardEvent[];
}

export interface HousekeeperDashboard {
    cleanedToday: number;
    cleanedInRange: number;
    cleaningRequests: number;
    inspectionRequests: number;
    inspectingCount: number;
    pendingCleaningRooms: DashboardRoomTask[];
    inspectingRooms: DashboardRoomTask[];
}

export interface DashboardTopInvoice {
    id: number;
    invoiceCode: string;
    finalTotal: number;
    completedAt: string | null;
}

export interface AccountantDashboard {
    totalRevenue: number;
    totalLossPenalty: number;
    serviceRevenue: number;
    netProfit: number;
    revenueChartData: DashboardRevenuePoint[];
    topInvoices: DashboardTopInvoice[];
}

export interface ReceptionistDashboard {
    publishedArticles: number;
    pendingArticles: number;
    pendingServiceOrders: number;
    completedServiceOrders: number;
    serviceQueue: DashboardPendingService[];
    pendingCleaningRooms: DashboardRoomTask[];
    inspectingRooms: DashboardRoomTask[];
}

export interface ManagerDashboard {
    pendingCleaningRequests: number;
    pendingServiceOrders: number;
    completedServiceOrders: number;
    totalLossPenalty: number;
    serviceRevenue: number;
    netProfit: number;
    pendingArticles: number;
    publishedArticles: number;
    inspectingCount: number;
    pendingCleaningRooms: DashboardRoomTask[];
    inspectingRooms: DashboardRoomTask[];
}

export interface RoleDashboard {
    role: string;
    overview?: DashboardOverview;
    housekeeper?: HousekeeperDashboard;
    accountant?: AccountantDashboard;
    receptionist?: ReceptionistDashboard;
    manager?: ManagerDashboard;
}

function pick<T = unknown>(source: Record<string, unknown>, camel: string, pascal: string): T | undefined {
    return (source[camel] as T | undefined) ?? (source[pascal] as T | undefined);
}

const emptyOverview: DashboardOverview = {
    meta: { schemaVersion: 1, dashboardCode: '', roleName: '', periodType: '', periodKey: '', periodStart: '', periodEnd: '', status: '', generatedAt: '' },
    summary: { totalRevenue: 0, bookingCount: 0, netProfit: 0, auditLogTotal: 0, articlesCount: 0, serviceOrdersCount: 0, completedServiceOrdersCount: 0, serviceRevenue: 0, comparison: { base: { comparisonType: '', currentPeriodKey: '', previousPeriodKey: '' }, metrics: {} } },
    widgets: { revenueChart: [], roomStatusChart: [], recentBookings: [], pendingServices: [] },
    breakdown: { occupancy: { total: 0, occupied: 0, maintenance: 0, available: 0 }, inspectingCount: 0, pendingCleaningRooms: [], inspectingRooms: [] },
    alerts: [],
    events: [],
};

function normalizeDashboardOverview(raw: unknown): DashboardOverview {
    if (!raw || typeof raw !== 'object') return emptyOverview;
    const src = raw as Record<string, unknown>;

    const metaRaw = pick<Record<string, unknown>>(src, 'meta', 'Meta') ?? {};
    const summaryRaw = pick<Record<string, unknown>>(src, 'summary', 'Summary') ?? {};
    const widgetsRaw = pick<Record<string, unknown>>(src, 'widgets', 'Widgets') ?? {};
    const breakdownRaw = pick<Record<string, unknown>>(src, 'breakdown', 'Breakdown') ?? {};
    
    const comparisonRaw = pick<Record<string, unknown>>(summaryRaw, 'comparison', 'Comparison') ?? {};
    const compBaseRaw = pick<Record<string, unknown>>(comparisonRaw, 'base', 'Base') ?? {};
    const compMetricsRaw = pick<Record<string, unknown>>(comparisonRaw, 'metrics', 'Metrics') ?? {};

    const normalizeMetric = (mRaw: any): DashboardMetricComparison | undefined => {
        if (!mRaw) return undefined;
        return {
            current: Number(pick(mRaw, 'current', 'Current') ?? 0),
            previous: Number(pick(mRaw, 'previous', 'Previous') ?? 0),
            difference: Number(pick(mRaw, 'difference', 'Difference') ?? 0),
            growthRate: Number(pick(mRaw, 'growthRate', 'GrowthRate') ?? 0),
            trend: (pick<string>(mRaw, 'trend', 'Trend') ?? 'flat') as any,
            directionMeaning: (pick<string>(mRaw, 'directionMeaning', 'DirectionMeaning') ?? 'neutral') as any,
        };
    };

    const occupancyRaw = pick<Record<string, unknown>>(breakdownRaw, 'occupancy', 'Occupancy') ?? {};
    const revenueRaw = pick<unknown[]>(widgetsRaw, 'revenueChart', 'RevenueChart') ?? [];
    const statusRaw = pick<unknown[]>(widgetsRaw, 'roomStatusChart', 'RoomStatusChart') ?? [];
    const bookingsRaw = pick<unknown[]>(widgetsRaw, 'recentBookings', 'RecentBookings') ?? [];
    const pendingRaw = pick<unknown[]>(widgetsRaw, 'pendingServices', 'PendingServices') ?? [];
    const alertsRaw = pick<unknown[]>(src, 'alerts', 'Alerts') ?? [];
    const eventsRaw = pick<unknown[]>(src, 'events', 'Events') ?? [];

    return {
        meta: {
            schemaVersion: Number(pick(metaRaw, 'schemaVersion', 'SchemaVersion') ?? 1),
            dashboardCode: String(pick(metaRaw, 'dashboardCode', 'DashboardCode') ?? ''),
            roleName: String(pick(metaRaw, 'roleName', 'RoleName') ?? ''),
            periodType: String(pick(metaRaw, 'periodType', 'PeriodType') ?? ''),
            periodKey: String(pick(metaRaw, 'periodKey', 'PeriodKey') ?? ''),
            periodStart: String(pick(metaRaw, 'periodStart', 'PeriodStart') ?? ''),
            periodEnd: String(pick(metaRaw, 'periodEnd', 'PeriodEnd') ?? ''),
            status: String(pick(metaRaw, 'status', 'Status') ?? ''),
            generatedAt: String(pick(metaRaw, 'generatedAt', 'GeneratedAt') ?? ''),
        },
        summary: {
            totalRevenue: Number(pick(summaryRaw, 'totalRevenue', 'TotalRevenue') ?? 0),
            bookingCount: Number(pick(summaryRaw, 'bookingCount', 'BookingCount') ?? 0),
            netProfit: Number(pick(summaryRaw, 'netProfit', 'NetProfit') ?? 0),
            auditLogTotal: Number(pick(summaryRaw, 'auditLogTotal', 'AuditLogTotal') ?? 0),
            articlesCount: Number(pick(summaryRaw, 'articlesCount', 'ArticlesCount') ?? 0),
            serviceOrdersCount: Number(pick(summaryRaw, 'serviceOrdersCount', 'ServiceOrdersCount') ?? 0),
            completedServiceOrdersCount: Number(pick(summaryRaw, 'completedServiceOrdersCount', 'CompletedServiceOrdersCount') ?? 0),
            serviceRevenue: Number(pick(summaryRaw, 'serviceRevenue', 'ServiceRevenue') ?? 0),
            comparison: {
                base: {
                    comparisonType: String(pick(compBaseRaw, 'comparisonType', 'ComparisonType') ?? ''),
                    currentPeriodKey: String(pick(compBaseRaw, 'currentPeriodKey', 'CurrentPeriodKey') ?? ''),
                    previousPeriodKey: String(pick(compBaseRaw, 'previousPeriodKey', 'PreviousPeriodKey') ?? ''),
                },
                metrics: {
                    revenue: normalizeMetric(pick(compMetricsRaw, 'revenue', 'Revenue')),
                    bookings: normalizeMetric(pick(compMetricsRaw, 'bookings', 'Bookings')),
                    netProfit: normalizeMetric(pick(compMetricsRaw, 'netProfit', 'NetProfit')),
                    damageReports: normalizeMetric(pick(compMetricsRaw, 'damageReports', 'DamageReports')),
                    lowStockItems: normalizeMetric(pick(compMetricsRaw, 'lowStockItems', 'LowStockItems')),
                    cleaningRequests: normalizeMetric(pick(compMetricsRaw, 'cleaningRequests', 'CleaningRequests')),
                    articles: normalizeMetric(pick(compMetricsRaw, 'articles', 'Articles')),
                    serviceOrders: normalizeMetric(pick(compMetricsRaw, 'serviceOrders', 'ServiceOrders')),
                    completedServiceOrders: normalizeMetric(pick(compMetricsRaw, 'completedServiceOrders', 'CompletedServiceOrders')),
                    serviceRevenue: normalizeMetric(pick(compMetricsRaw, 'serviceRevenue', 'ServiceRevenue')),
                },
            },
        },
        widgets: {
            revenueChart: (Array.isArray(revenueRaw) ? revenueRaw : []).map((item: any) => ({
                name: String(item?.name ?? item?.Name ?? ''),
                revenue: Number(item?.revenue ?? item?.Revenue ?? 0),
                bookings: Number(item?.bookings ?? item?.Bookings ?? 0),
            })),
            roomStatusChart: (Array.isArray(statusRaw) ? statusRaw : []).map((item: any) => ({
                name: String(item?.name ?? item?.Name ?? ''),
                value: Number(item?.value ?? item?.Value ?? 0),
                color: String(item?.color ?? item?.Color ?? '#0ea5e9'),
            })),
            recentBookings: (Array.isArray(bookingsRaw) ? bookingsRaw : []).map((item: any) => ({
                id: Number(item?.id ?? item?.Id ?? 0),
                guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
                checkInDate: String(item?.checkInDate ?? item?.CheckInDate ?? ''),
                checkOutDate: String(item?.checkOutDate ?? item?.CheckOutDate ?? ''),
                totalAmount: Number(item?.totalAmount ?? item?.TotalAmount ?? 0),
                status: String(item?.status ?? item?.Status ?? 'Pending'),
            })),
            pendingServices: (Array.isArray(pendingRaw) ? pendingRaw : []).map((item: any) => ({
                id: Number(item?.id ?? item?.Id ?? 0),
                roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? 'N/A'),
                guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
                orderDate: String(item?.orderDate ?? item?.OrderDate ?? ''),
            })),
        },
        breakdown: {
            occupancy: {
                total: Number(pick(occupancyRaw, 'total', 'Total') ?? 0),
                occupied: Number(pick(occupancyRaw, 'occupied', 'Occupied') ?? 0),
                maintenance: Number(pick(occupancyRaw, 'maintenance', 'Maintenance') ?? 0),
                available: Number(pick(occupancyRaw, 'available', 'Available') ?? 0),
            },
            inspectingCount: Number(pick(breakdownRaw, 'inspectingCount', 'InspectingCount') ?? 0),
            pendingCleaningRooms: (Array.isArray(pick(breakdownRaw, 'pendingCleaningRooms', 'PendingCleaningRooms')) ? pick<any[]>(breakdownRaw, 'pendingCleaningRooms', 'PendingCleaningRooms')! : []).map((item: any) => ({
                id: Number(item?.id ?? item?.Id ?? 0),
                roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
                status: String(item?.status ?? item?.Status ?? ''),
                cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
                cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
            })),
            inspectingRooms: (Array.isArray(pick(breakdownRaw, 'inspectingRooms', 'InspectingRooms')) ? pick<any[]>(breakdownRaw, 'inspectingRooms', 'InspectingRooms')! : []).map((item: any) => ({
                id: Number(item?.id ?? item?.Id ?? 0),
                roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
                status: String(item?.status ?? item?.Status ?? ''),
                cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
                cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
            })),
        },
        alerts: (Array.isArray(alertsRaw) ? alertsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            itemName: String(item?.itemName ?? item?.ItemName ?? 'Unknown'),
            room: String(item?.room ?? item?.Room ?? 'Unknown'),
            penalty: Number(item?.penalty ?? item?.Penalty ?? 0),
            description: String(item?.description ?? item?.Description ?? ''),
        })),
        events: (Array.isArray(eventsRaw) ? eventsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            type: String(item?.type ?? item?.Type ?? 'ACTIVITY'),
            message: String(item?.message ?? item?.Message ?? ''),
            timestamp: String(item?.timestamp ?? item?.Timestamp ?? ''),
            severity: String(item?.severity ?? item?.Severity ?? 'Info'),
        })),
    };
}

function normalizeHousekeeper(raw: unknown): HousekeeperDashboard {
    if (!raw || typeof raw !== 'object') return { cleanedToday: 0, cleanedInRange: 0, cleaningRequests: 0, inspectionRequests: 0, inspectingCount: 0, pendingCleaningRooms: [], inspectingRooms: [] };
    const src = raw as Record<string, unknown>;
    const pendingCleaningRoomsRaw = pick<unknown[]>(src, 'pendingCleaningRooms', 'PendingCleaningRooms') ?? [];
    const inspectingRoomsRaw = pick<unknown[]>(src, 'inspectingRooms', 'InspectingRooms') ?? [];

    return {
        cleanedToday: Number(pick(src, 'cleanedToday', 'CleanedToday') ?? 0),
        cleanedInRange: Number(pick(src, 'cleanedInRange', 'CleanedInRange') ?? 0),
        cleaningRequests: Number(pick(src, 'cleaningRequests', 'CleaningRequests') ?? 0),
        inspectionRequests: Number(pick(src, 'inspectionRequests', 'InspectionRequests') ?? 0),
        inspectingCount: Number(pick(src, 'inspectingCount', 'InspectingCount') ?? 0),
        pendingCleaningRooms: (Array.isArray(pendingCleaningRoomsRaw) ? pendingCleaningRoomsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
        inspectingRooms: (Array.isArray(inspectingRoomsRaw) ? inspectingRoomsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
    };
}

function normalizeAccountant(raw: unknown): AccountantDashboard {
    if (!raw || typeof raw !== 'object') return { totalRevenue: 0, totalLossPenalty: 0, serviceRevenue: 0, netProfit: 0, revenueChartData: [], topInvoices: [] };
    const src = raw as Record<string, unknown>;
    const revenueRaw = pick<unknown[]>(src, 'revenueChartData', 'RevenueChartData') ?? [];
    const invoicesRaw = pick<unknown[]>(src, 'topInvoices', 'TopInvoices') ?? [];

    return {
        totalRevenue: Number(pick(src, 'totalRevenue', 'TotalRevenue') ?? 0),
        totalLossPenalty: Number(pick(src, 'totalLossPenalty', 'TotalLossPenalty') ?? 0),
        serviceRevenue: Number(pick(src, 'serviceRevenue', 'ServiceRevenue') ?? 0),
        netProfit: Number(pick(src, 'netProfit', 'NetProfit') ?? 0),
        revenueChartData: (Array.isArray(revenueRaw) ? revenueRaw : []).map((item: any) => ({
            name: String(item?.name ?? item?.Name ?? ''),
            revenue: Number(item?.revenue ?? item?.Revenue ?? 0),
            bookings: Number(item?.bookings ?? item?.Bookings ?? 0),
        })),
        topInvoices: (Array.isArray(invoicesRaw) ? invoicesRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            invoiceCode: String(item?.invoiceCode ?? item?.InvoiceCode ?? ''),
            finalTotal: Number(item?.finalTotal ?? item?.FinalTotal ?? 0),
            completedAt: (item?.completedAt ?? item?.CompletedAt ?? null) as string | null,
        })),
    };
}

function normalizeReceptionist(raw: unknown): ReceptionistDashboard {
    if (!raw || typeof raw !== 'object') return { publishedArticles: 0, pendingArticles: 0, pendingServiceOrders: 0, completedServiceOrders: 0, serviceQueue: [], pendingCleaningRooms: [], inspectingRooms: [] };
    const src = raw as Record<string, unknown>;
    const serviceQueueRaw = pick<unknown[]>(src, 'serviceQueue', 'ServiceQueue') ?? [];

    return {
        publishedArticles: Number(pick(src, 'publishedArticles', 'PublishedArticles') ?? 0),
        pendingArticles: Number(pick(src, 'pendingArticles', 'PendingArticles') ?? 0),
        pendingServiceOrders: Number(pick(src, 'pendingServiceOrders', 'PendingServiceOrders') ?? 0),
        completedServiceOrders: Number(pick(src, 'completedServiceOrders', 'CompletedServiceOrders') ?? 0),
        serviceQueue: (Array.isArray(serviceQueueRaw) ? serviceQueueRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? 'N/A'),
            guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
            orderDate: String(item?.orderDate ?? item?.OrderDate ?? ''),
        })),
        pendingCleaningRooms: (Array.isArray(pick(src, 'pendingCleaningRooms', 'PendingCleaningRooms')) ? pick<any[]>(src, 'pendingCleaningRooms', 'PendingCleaningRooms')! : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
        inspectingRooms: (Array.isArray(pick(src, 'inspectingRooms', 'InspectingRooms')) ? pick<any[]>(src, 'inspectingRooms', 'InspectingRooms')! : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
    };
}

function normalizeManager(raw: unknown): ManagerDashboard {
    if (!raw || typeof raw !== 'object') return { pendingCleaningRequests: 0, pendingServiceOrders: 0, completedServiceOrders: 0, totalLossPenalty: 0, serviceRevenue: 0, netProfit: 0, pendingArticles: 0, publishedArticles: 0, inspectingCount: 0, pendingCleaningRooms: [], inspectingRooms: [] };
    const src = raw as Record<string, unknown>;
    const pendingCleaningRoomsRaw = pick<unknown[]>(src, 'pendingCleaningRooms', 'PendingCleaningRooms') ?? [];
    const inspectingRoomsRaw = pick<unknown[]>(src, 'inspectingRooms', 'InspectingRooms') ?? [];

    return {
        pendingCleaningRequests: Number(pick(src, 'pendingCleaningRequests', 'PendingCleaningRequests') ?? 0),
        pendingServiceOrders: Number(pick(src, 'pendingServiceOrders', 'PendingServiceOrders') ?? 0),
        completedServiceOrders: Number(pick(src, 'completedServiceOrders', 'CompletedServiceOrders') ?? 0),
        totalLossPenalty: Number(pick(src, 'totalLossPenalty', 'TotalLossPenalty') ?? 0),
        serviceRevenue: Number(pick(src, 'serviceRevenue', 'ServiceRevenue') ?? 0),
        netProfit: Number(pick(src, 'netProfit', 'NetProfit') ?? 0),
        pendingArticles: Number(pick(src, 'pendingArticles', 'PendingArticles') ?? 0),
        publishedArticles: Number(pick(src, 'publishedArticles', 'PublishedArticles') ?? 0),
        inspectingCount: Number(pick(src, 'inspectingCount', 'InspectingCount') ?? 0),
        pendingCleaningRooms: (Array.isArray(pendingCleaningRoomsRaw) ? pendingCleaningRoomsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
        inspectingRooms: (Array.isArray(inspectingRoomsRaw) ? inspectingRoomsRaw : []).map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
    };
}

function normalizeRoleDashboard(raw: unknown): RoleDashboard {
    if (!raw || typeof raw !== 'object') return { role: '' };
    const src = raw as Record<string, unknown>;
    return {
        role: String(pick(src, 'role', 'Role') ?? ''),
        overview: normalizeDashboardOverview(pick(src, 'overview', 'Overview')),
        housekeeper: normalizeHousekeeper(pick(src, 'housekeeper', 'Housekeeper')),
        accountant: normalizeAccountant(pick(src, 'accountant', 'Accountant')),
        receptionist: normalizeReceptionist(pick(src, 'receptionist', 'Receptionist')),
        manager: normalizeManager(pick(src, 'manager', 'Manager')),
    };
}

export const dashboardApi = {
    async getOverview(days = 7, refresh = false): Promise<DashboardOverview> {
        const { data } = await httpClient.get<unknown>('dashboard/overview', {
            params: { days, refresh },
        });
        return normalizeDashboardOverview(data);
    },
    async getRoleDashboard(days = 7, refresh = false): Promise<RoleDashboard> {
        const { data } = await httpClient.get<unknown>('dashboard/role', {
            params: { days, refresh },
        });
        return normalizeRoleDashboard(data);
    },
    async forceRefresh(): Promise<{ message: string }> {
        const { data } = await httpClient.post<{ message: string }>('dashboard/refresh');
        return data;
    }
};
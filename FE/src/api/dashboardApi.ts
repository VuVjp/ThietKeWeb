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

export interface HousekeeperDashboard {
    cleanedToday: number;
    cleanedInRange: number;
    cleaningRequests: number;
    inspectionRequests: number;
    inspectingCount: number;
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
    netProfit: number;
    revenueChartData: DashboardRevenuePoint[];
    topInvoices: DashboardTopInvoice[];
}

export interface ReceptionistDashboard {
    publishedArticles: number;
    pendingArticles: number;
    pendingServiceOrders: number;
    completedServiceOrdersToday: number;
    serviceQueue: DashboardPendingService[];
}

export interface ManagerDashboard {
    overview: DashboardOverview;
    pendingCleaningRequests: number;
    pendingServiceOrders: number;
    totalLossPenalty: number;
    netProfit: number;
    pendingArticles: number;
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

export interface DashboardOverview {
    totalRevenue: number;
    bookingCount: number;
    occupancyRate: number;
    auditLogTotal: number;
    netProfit: number;
    inspectingCount: number;
    occupancy: {
        total: number;
        occupied: number;
        maintenance: number;
        available: number;
    };
    revenueChartData: DashboardRevenuePoint[];
    statusChartData: DashboardRoomStatusPoint[];
    recentBookings: DashboardRecentBooking[];
    criticalAlerts: DashboardCriticalAlert[];
    pendingServices: DashboardPendingService[];
}

const emptyOverview: DashboardOverview = {
    totalRevenue: 0,
    bookingCount: 0,
    occupancyRate: 0,
    auditLogTotal: 0,
    netProfit: 0,
    inspectingCount: 0,
    occupancy: {
        total: 0,
        occupied: 0,
        maintenance: 0,
        available: 0,
    },
    revenueChartData: [],
    statusChartData: [],
    recentBookings: [],
    criticalAlerts: [],
    pendingServices: [],
};

function pick<T = unknown>(source: Record<string, unknown>, camel: string, pascal: string): T | undefined {
    return (source[camel] as T | undefined) ?? (source[pascal] as T | undefined);
}

function normalizeDashboardOverview(raw: unknown): DashboardOverview {
    if (!raw || typeof raw !== 'object') {
        return emptyOverview;
    }

    const src = raw as Record<string, unknown>;
    const occupancyRaw = pick<Record<string, unknown>>(src, 'occupancy', 'Occupancy') ?? {};

    const revenueRaw = pick<unknown[]>(src, 'revenueChartData', 'RevenueChartData');
    const statusRaw = pick<unknown[]>(src, 'statusChartData', 'StatusChartData');
    const bookingsRaw = pick<unknown[]>(src, 'recentBookings', 'RecentBookings');
    const alertsRaw = pick<unknown[]>(src, 'criticalAlerts', 'CriticalAlerts');
    const pendingRaw = pick<unknown[]>(src, 'pendingServices', 'PendingServices');

    const revenueChartData = Array.isArray(revenueRaw) ? revenueRaw : [];
    const statusChartData = Array.isArray(statusRaw) ? statusRaw : [];
    const recentBookings = Array.isArray(bookingsRaw) ? bookingsRaw : [];
    const criticalAlerts = Array.isArray(alertsRaw) ? alertsRaw : [];
    const pendingServices = Array.isArray(pendingRaw) ? pendingRaw : [];

    return {
        totalRevenue: Number(pick(src, 'totalRevenue', 'TotalRevenue') ?? 0),
        bookingCount: Number(pick(src, 'bookingCount', 'BookingCount') ?? 0),
        occupancyRate: Number(pick(src, 'occupancyRate', 'OccupancyRate') ?? 0),
        auditLogTotal: Number(pick(src, 'auditLogTotal', 'AuditLogTotal') ?? 0),
        netProfit: Number(pick(src, 'netProfit', 'NetProfit') ?? 0),
        inspectingCount: Number(pick(src, 'inspectingCount', 'InspectingCount') ?? 0),
        occupancy: {
            total: Number(pick(occupancyRaw, 'total', 'Total') ?? 0),
            occupied: Number(pick(occupancyRaw, 'occupied', 'Occupied') ?? 0),
            maintenance: Number(pick(occupancyRaw, 'maintenance', 'Maintenance') ?? 0),
            available: Number(pick(occupancyRaw, 'available', 'Available') ?? 0),
        },
        revenueChartData: revenueChartData.map((item: any) => ({
            name: String(item?.name ?? item?.Name ?? ''),
            revenue: Number(item?.revenue ?? item?.Revenue ?? 0),
            bookings: Number(item?.bookings ?? item?.Bookings ?? 0),
        })),
        statusChartData: statusChartData.map((item: any) => ({
            name: String(item?.name ?? item?.Name ?? ''),
            value: Number(item?.value ?? item?.Value ?? 0),
            color: String(item?.color ?? item?.Color ?? '#0ea5e9'),
        })),
        recentBookings: recentBookings.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
            checkInDate: String(item?.checkInDate ?? item?.CheckInDate ?? ''),
            checkOutDate: String(item?.checkOutDate ?? item?.CheckOutDate ?? ''),
            totalAmount: Number(item?.totalAmount ?? item?.TotalAmount ?? 0),
            status: String(item?.status ?? item?.Status ?? 'Pending'),
        })),
        criticalAlerts: criticalAlerts.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            itemName: String(item?.itemName ?? item?.ItemName ?? 'Unknown'),
            room: String(item?.room ?? item?.Room ?? 'Unknown'),
            penalty: Number(item?.penalty ?? item?.Penalty ?? 0),
            description: String(item?.description ?? item?.Description ?? ''),
        })),
        pendingServices: pendingServices.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? 'N/A'),
            guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
            orderDate: String(item?.orderDate ?? item?.OrderDate ?? ''),
        })),
    };
}

function normalizeHousekeeper(raw: unknown): HousekeeperDashboard {
    if (!raw || typeof raw !== 'object') {
        return { cleanedToday: 0, cleanedInRange: 0, cleaningRequests: 0, inspectionRequests: 0, inspectingCount: 0 };
    }

    const src = raw as Record<string, unknown>;
    return {
        cleanedToday: Number(pick(src, 'cleanedToday', 'CleanedToday') ?? 0),
        cleanedInRange: Number(pick(src, 'cleanedInRange', 'CleanedInRange') ?? 0),
        cleaningRequests: Number(pick(src, 'cleaningRequests', 'CleaningRequests') ?? 0),
        inspectionRequests: Number(pick(src, 'inspectionRequests', 'InspectionRequests') ?? 0),
        inspectingCount: Number(pick(src, 'inspectingCount', 'InspectingCount') ?? 0),
    };
}

function normalizeAccountant(raw: unknown): AccountantDashboard {
    if (!raw || typeof raw !== 'object') {
        return {
            totalRevenue: 0,
            totalLossPenalty: 0,
            netProfit: 0,
            revenueChartData: [],
            topInvoices: [],
        };
    }

    const src = raw as Record<string, unknown>;
    const revenueRaw = pick<unknown[]>(src, 'revenueChartData', 'RevenueChartData');
    const invoicesRaw = pick<unknown[]>(src, 'topInvoices', 'TopInvoices');

    const revenueChartData = Array.isArray(revenueRaw) ? revenueRaw : [];
    const topInvoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];

    return {
        totalRevenue: Number(pick(src, 'totalRevenue', 'TotalRevenue') ?? 0),
        totalLossPenalty: Number(pick(src, 'totalLossPenalty', 'TotalLossPenalty') ?? 0),
        netProfit: Number(pick(src, 'netProfit', 'NetProfit') ?? 0),
        revenueChartData: revenueChartData.map((item: any) => ({
            name: String(item?.name ?? item?.Name ?? ''),
            revenue: Number(item?.revenue ?? item?.Revenue ?? 0),
            bookings: Number(item?.bookings ?? item?.Bookings ?? 0),
        })),
        topInvoices: topInvoices.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            invoiceCode: String(item?.invoiceCode ?? item?.InvoiceCode ?? ''),
            finalTotal: Number(item?.finalTotal ?? item?.FinalTotal ?? 0),
            completedAt: (item?.completedAt ?? item?.CompletedAt ?? null) as string | null,
        })),
    };
}

function normalizeReceptionist(raw: unknown): ReceptionistDashboard {
    if (!raw || typeof raw !== 'object') {
        return { publishedArticles: 0, pendingArticles: 0, pendingServiceOrders: 0, completedServiceOrdersToday: 0, serviceQueue: [] };
    }

    const src = raw as Record<string, unknown>;
    const serviceQueueRaw = pick<unknown[]>(src, 'serviceQueue', 'ServiceQueue');
    const serviceQueue = Array.isArray(serviceQueueRaw) ? serviceQueueRaw : [];

    return {
        publishedArticles: Number(pick(src, 'publishedArticles', 'PublishedArticles') ?? 0),
        pendingArticles: Number(pick(src, 'pendingArticles', 'PendingArticles') ?? 0),
        pendingServiceOrders: Number(pick(src, 'pendingServiceOrders', 'PendingServiceOrders') ?? 0),
        completedServiceOrdersToday: Number(pick(src, 'completedServiceOrdersToday', 'CompletedServiceOrdersToday') ?? 0),
        serviceQueue: serviceQueue.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? 'N/A'),
            guestName: String(item?.guestName ?? item?.GuestName ?? 'Unknown'),
            orderDate: String(item?.orderDate ?? item?.OrderDate ?? ''),
        })),
    };
}

function normalizeManager(raw: unknown): ManagerDashboard {
    if (!raw || typeof raw !== 'object') {
        return {
            overview: emptyOverview,
            pendingCleaningRequests: 0,
            pendingServiceOrders: 0,
            totalLossPenalty: 0,
            netProfit: 0,
            pendingArticles: 0,
            inspectingCount: 0,
            pendingCleaningRooms: [],
            inspectingRooms: [],
        };
    }

    const src = raw as Record<string, unknown>;
    const pendingCleaningRoomsRaw = pick<unknown[]>(src, 'pendingCleaningRooms', 'PendingCleaningRooms');
    const inspectingRoomsRaw = pick<unknown[]>(src, 'inspectingRooms', 'InspectingRooms');

    const pendingCleaningRooms = Array.isArray(pendingCleaningRoomsRaw) ? pendingCleaningRoomsRaw : [];
    const inspectingRooms = Array.isArray(inspectingRoomsRaw) ? inspectingRoomsRaw : [];

    return {
        overview: normalizeDashboardOverview(pick(src, 'overview', 'Overview')),
        pendingCleaningRequests: Number(pick(src, 'pendingCleaningRequests', 'PendingCleaningRequests') ?? 0),
        pendingServiceOrders: Number(pick(src, 'pendingServiceOrders', 'PendingServiceOrders') ?? 0),
        totalLossPenalty: Number(pick(src, 'totalLossPenalty', 'TotalLossPenalty') ?? 0),
        netProfit: Number(pick(src, 'netProfit', 'NetProfit') ?? 0),
        pendingArticles: Number(pick(src, 'pendingArticles', 'PendingArticles') ?? 0),
        inspectingCount: Number(pick(src, 'inspectingCount', 'InspectingCount') ?? 0),
        pendingCleaningRooms: pendingCleaningRooms.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
        inspectingRooms: inspectingRooms.map((item: any) => ({
            id: Number(item?.id ?? item?.Id ?? 0),
            roomNumber: String(item?.roomNumber ?? item?.RoomNumber ?? ''),
            status: String(item?.status ?? item?.Status ?? ''),
            cleaningStatus: String(item?.cleaningStatus ?? item?.CleaningStatus ?? ''),
            cleaningRequested: Boolean(item?.cleaningRequested ?? item?.CleaningRequested ?? false),
        })),
    };
}

function normalizeRoleDashboard(raw: unknown): RoleDashboard {
    if (!raw || typeof raw !== 'object') {
        return { role: '' };
    }

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
    async getOverview(days = 7): Promise<DashboardOverview> {
        const { data } = await httpClient.get<unknown>('dashboard/overview', {
            params: { days },
        });

        return normalizeDashboardOverview(data);
    },
    async getRoleDashboard(days = 7): Promise<RoleDashboard> {
        const { data } = await httpClient.get<unknown>('dashboard/role', {
            params: { days },
        });

        return normalizeRoleDashboard(data);
    },
};
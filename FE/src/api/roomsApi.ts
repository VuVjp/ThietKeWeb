import type { Room } from '../types/models';
import { httpClient } from './httpClient';

interface RoomDto {
    id?: number;
    Id?: number;
    roomNumber?: string;
    RoomNumber?: string;
    floor?: number;
    Floor?: number;
    roomType?: string;
    RoomType?: string;
    roomTypeName?: string;
    RoomTypeName?: string;
    roomTypeId?: number;
    RoomTypeId?: number;
    status?: string;
    Status?: string;
    cleaningStatus?: string;
    CleaningStatus?: string;
    cleaningRequested?: boolean;
    CleaningRequested?: boolean;
    rowVersion?: string;
    RowVersion?: string;
}

export interface RoomPayload {
    roomNumber: string;
    floor: number;
    roomTypeId: number;
    status?: string;
    cleaningStatus?: string;
}

export interface BulkCreateRoomsPayload {
    rooms: RoomPayload[];
}

function normalizeRoom(dto: RoomDto): Room {
    return {
        id: Number(dto.id ?? dto.Id ?? 0),
        roomNumber: String(dto.roomNumber ?? dto.RoomNumber ?? ''),
        floor: Number(dto.floor ?? dto.Floor ?? 0),
        roomType: String(dto.roomTypeName ?? dto.RoomTypeName ?? dto.roomType ?? dto.RoomType ?? 'Standard') as Room['roomType'],
        roomTypeId: Number(dto.roomTypeId ?? dto.RoomTypeId ?? 0) || undefined,
        status: String(dto.status ?? dto.Status ?? 'Available') as Room['status'],
        cleaningStatus: String(dto.cleaningStatus ?? dto.CleaningStatus ?? 'Clean') as Room['cleaningStatus'],
        cleaningRequested: Boolean(dto.cleaningRequested ?? dto.CleaningRequested ?? false),
        rowVersion: String(dto.rowVersion ?? dto.RowVersion ?? ''),
    };
}

export const roomsApi = {
    async getAll() {
        const { data } = await httpClient.get<RoomDto[]>('rooms');
        return data.map(normalizeRoom);
    },

    async requestCleaning(id: number, request: boolean, rowVersion?: string) {
        const payload = { requested: request, rowVersion };
        const { data } = await httpClient.patch<RoomDto>(`rooms/${id}/request-cleaning`, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        return normalizeRoom(data);
    },

    async getByStatus(status: Room['status']) {
        const { data } = await httpClient.get<RoomDto[]>(`rooms/status/${status}`);
        return data.map(normalizeRoom);
    },

    async getByStatusWithCleaningRequested(status: Room['status'], includeCleaningRequested: boolean) {
        const { data } = await httpClient.get<RoomDto[]>(`rooms/status/${status}/?includeCleaningRequested=${includeCleaningRequested}`);
        return data.map(normalizeRoom);
    },

    async getById(id: number) {
        const { data } = await httpClient.get<RoomDto>(`rooms/${id}`);
        return normalizeRoom(data);
    },

    async create(payload: RoomPayload) {
        const { data } = await httpClient.post('rooms', payload);
        return data;
    },

    async bulkCreate(payload: RoomPayload[]) {
        const { data } = await httpClient.post('rooms/bulk-create', payload);
        return data as { message?: string; createdCount?: number };
    },

    async update(id: number, payload: RoomPayload) {
        await httpClient.put(`rooms/${id}`, payload);
    },

    async changeStatus(id: number, status: string) {
        await httpClient.patch(`rooms/${id}/status`, status, {
            headers: { 'Content-Type': 'application/json' },
        });
    },

    async changeCleaningStatus(id: number, cleaningStatus: string, rowVersion?: string) {
        const payload = { cleaningStatus, rowVersion };
        const { data } = await httpClient.patch<RoomDto>(`rooms/${id}/cleaning-status`, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        return normalizeRoom(data);
    },

    async getByCleaningStatus(cleaningStatus: Room['cleaningStatus']) {
        const { data } = await httpClient.get<RoomDto[]>(`rooms/cleaning-status/${cleaningStatus}`);
        return data.map(normalizeRoom);
    },
    async completeCleaning(id: number, rowVersion?: string) {
        const payload = { rowVersion };
        const { data } = await httpClient.patch<RoomDto>(`rooms/${id}/complete-cleaning`, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        return normalizeRoom(data);
    },

    async remove(id: number) {
        await httpClient.delete(`rooms/${id}`);
    },
};

import { httpClient } from './httpClient';

export interface ReviewItem {
    id: number;
    userId?: number;
    userName?: string;
    userAvatarUrl?: string;
    roomTypeId?: number;
    roomTypeName?: string;
    rating: number;
    comment?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    isActive: boolean;
    canEdit?: boolean;
    bookingId?: number;
}

export interface CreateReviewPayload {
    roomTypeId: number;
    bookingId: number;
    rating: number;
    comment?: string;
}

export interface UpdateReviewPayload {
    rating: number;
    comment?: string;
}

export interface ReviewEligibilityItem {
    id: number;
    roomTypeId: number;
    roomTypeName: string;
    bookingId: number;
    bookingCode: string;
    isReviewed: boolean;
    expiresAt: string;
}

export interface ReviewQueryPayload {
    search?: string;
    roomTypeId?: number;
    rating?: number;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    status?: string;
    userId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

export interface PaginatedReviews {
    items: ReviewItem[];
    total: number;
    page: number;
    pageSize: number;
}

interface ReviewDto {
    isActive?: boolean;
    IsActive?: boolean;
    id?: number;
    Id?: number;
    userId?: number;
    UserId?: number;
    userName?: string;
    UserName?: string;
    userAvatarUrl?: string;
    UserAvatarUrl?: string;
    roomTypeId?: number;
    RoomTypeId?: number;
    roomTypeName?: string;
    RoomTypeName?: string;
    rating?: number;
    Rating?: number;
    comment?: string;
    Comment?: string;
    createdAt?: string;
    CreatedAt?: string;
    updatedAt?: string;
    UpdatedAt?: string;
    status?: string;
    Status?: string;
    canEdit?: boolean;
    CanEdit?: boolean;
    bookingId?: number;
    BookingId?: number;
}

function normalizeReview(dto: ReviewDto): ReviewItem {
    return {
        id: Number(dto.id ?? dto.Id ?? 0),
        userId: dto.userId ?? dto.UserId,
        userName: dto.userName ?? dto.UserName,
        userAvatarUrl: dto.userAvatarUrl ?? dto.UserAvatarUrl,
        roomTypeId: dto.roomTypeId ?? dto.RoomTypeId,
        roomTypeName: dto.roomTypeName ?? dto.RoomTypeName,
        rating: Number(dto.rating ?? dto.Rating ?? 0),
        comment: dto.comment ?? dto.Comment,
        createdAt: dto.createdAt ?? dto.CreatedAt,
        updatedAt: dto.updatedAt ?? dto.UpdatedAt,
        status: dto.status ?? dto.Status,
        isActive: Boolean(dto.isActive ?? dto.IsActive ?? false),
        canEdit: dto.canEdit ?? dto.CanEdit ?? false,
        bookingId: dto.bookingId ?? dto.BookingId,
    };
}

export const reviewsApi = {
    async getAll() {
        const { data } = await httpClient.get<ReviewDto[]>('reviews');
        return data.map(normalizeReview);
    },

    async getPaged(query: ReviewQueryPayload) {
        const { data } = await httpClient.get<{ items: ReviewDto[]; total: number; page: number; pageSize: number }>('reviews', {
            params: query,
        });
        return {
            items: data.items.map(normalizeReview),
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
        };
    },

    async remove(id: number) {
        await httpClient.delete(`reviews/${id}`);
    },

    async toggleActive(id: number) {
        await httpClient.patch(`reviews/${id}/toggle-active`);
    },

    async getByRoomType(roomTypeId: number) {
        const { data } = await httpClient.get<ReviewDto[]>(`reviews/room-type/${roomTypeId}`);
        return data.map(normalizeReview);
    },

    async create(payload: CreateReviewPayload) {
        await httpClient.post('reviews', payload);
    },

    async update(id: number, payload: UpdateReviewPayload) {
        await httpClient.put(`reviews/${id}`, payload);
    },

    async approve(id: number) {
        await httpClient.patch(`reviews/${id}/approve`);
    },

    async reject(id: number) {
        await httpClient.patch(`reviews/${id}/reject`);
    },

    async getEligibility() {
        const { data } = await httpClient.get<ReviewEligibilityItem[]>('reviews/eligibility');
        return data;
    },
};

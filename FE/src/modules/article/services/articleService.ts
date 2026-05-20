import { httpClient } from '../../../api/httpClient';
import type {
    ArticleCategory,
    ArticleItem,
    Attraction,
    CreateArticlePayload,
    UpdateArticlePayload,
} from '../types/article.types';

// ─── Raw DTO shapes ──────────────────────────────────────────────────────────

interface ArticleCategoryDto {
    id?: number;
    Id?: number;
    name?: string;
    Name?: string;
    isActive?: boolean;
    IsActive?: boolean;
}

interface AttractionDto {
    id?: number;
    Id?: number;
    name?: string;
    Name?: string;
    description?: string;
    Description?: string;
    distanceKm?: number;
    DistanceKm?: number;
    isActive?: boolean;
    IsActive?: boolean;
    mapEmbedLink?: string;
    MapEmbedLink?: string;
    latitude?: string;
    Latitude?: string;
    longitude?: string;
    Longitude?: string;
    imageUrl?: string;
    ImageUrl?: string;
}

interface ArticleDto {
    id?: number;
    Id?: number;
    title?: string;
    Title?: string;
    content?: string;
    Content?: string;
    subtitle?: string;
    Subtitle?: string;
    thumbnailUrl?: string;
    ThumbnailUrl?: string;
    status?: string;
    Status?: string;
    authorName?: string;
    AuthorName?: string;
    authorId?: number;
    AuthorId?: number;
    categories?: ArticleCategoryDto[];
    Categories?: ArticleCategoryDto[];
    createdAt?: string;
    CreatedAt?: string;
    updatedAt?: string;
    UpdatedAt?: string;
    isActive?: boolean;
    IsActive?: boolean;
    publishedAt?: string;
    PublishedAt?: string;
    attractions?: AttractionDto[];
    Attractions?: AttractionDto[];
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeCategory(dto: ArticleCategoryDto): ArticleCategory {
    return {
        id: Number(dto.id ?? dto.Id ?? 0),
        name: String(dto.name ?? dto.Name ?? ''),
        isActive: Boolean(dto.isActive ?? dto.IsActive ?? true),
    };
}

function normalizeAttraction(dto: AttractionDto): Attraction {
    return {
        id: Number(dto.id ?? dto.Id ?? 0),
        name: String(dto.name ?? dto.Name ?? ''),
        description: dto.description ?? dto.Description,
        distanceKm: dto.distanceKm ?? dto.DistanceKm,
        isActive: Boolean(dto.isActive ?? dto.IsActive ?? true),
        mapEmbedLink: dto.mapEmbedLink ?? dto.MapEmbedLink,
        latitude: dto.latitude ?? dto.Latitude,
        longitude: dto.longitude ?? dto.Longitude,
        imageUrl: dto.imageUrl ?? dto.ImageUrl,
    };
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeArticle(dto: ArticleDto): ArticleItem {
    const rawCategories = dto.categories ?? dto.Categories ?? [];
    const rawAttractions = dto.attractions ?? dto.Attractions ?? [];
    const isActive = Boolean(dto.isActive ?? dto.IsActive ?? true);
    return {
        id: Number(dto.id ?? dto.Id ?? 0),
        title: String(dto.title ?? dto.Title ?? ''),
        subtitle: dto.subtitle ?? dto.Subtitle,
        content: String(dto.content ?? dto.Content ?? ''),
        thumbnailUrl: dto.thumbnailUrl ?? dto.ThumbnailUrl ?? undefined,
        status: isActive ? 'Active' : 'Inactive',
        authorName: String(dto.authorName ?? dto.AuthorName ?? ''),
        authorId: Number(dto.authorId ?? dto.AuthorId ?? 0),
        categories: rawCategories.map(normalizeCategory),
        attractions: rawAttractions.map(normalizeAttraction),
        createdAt: String(dto.publishedAt ?? dto.PublishedAt ?? dto.createdAt ?? dto.CreatedAt ?? ''),
        updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? undefined,
        isActive: isActive,
    };
}

// ─── FormData builder ────────────────────────────────────────────────────────

function toArticleFormData(payload: CreateArticlePayload | UpdateArticlePayload): FormData {
    const form = new FormData();
    form.append('Title', payload.title);
    if (payload.subtitle) {
        form.append('Subtitle', payload.subtitle);
    }
    form.append('Content', payload.content);
    form.append('IsActive', payload.status === 'Active' ? 'true' : 'false');
    payload.categoryIds.forEach((id) => form.append('CategoryIds', String(id)));
    payload.attractionIds.forEach((id) => form.append('AttractionIds', String(id)));
    if (payload.thumbnail) {
        form.append('ThumbnailFile', payload.thumbnail);
    }
    if ('thumbnailUrl' in payload && payload.thumbnailUrl !== undefined) {
        form.append('ThumbnailUrl', payload.thumbnailUrl ?? '');
    }
    return form;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const articleService = {
    async getAll(): Promise<ArticleItem[]> {
        // Fetch all articles from BE once
        const { data } = await httpClient.get<ArticleDto[]>('articles');
        // Return normalized array natively
        return data.map(normalizeArticle);
    },

    async getById(id: number): Promise<ArticleItem> {
        const { data } = await httpClient.get<ArticleDto>(`articles/${id}`);
        return normalizeArticle(data);
    },

    async create(payload: CreateArticlePayload): Promise<ArticleItem> {
        const { data } = await httpClient.post<ArticleDto>('articles', toArticleFormData(payload), {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return normalizeArticle(data);
    },

    async update(id: number, payload: UpdateArticlePayload): Promise<ArticleItem> {
        const { data } = await httpClient.put<ArticleDto>(`articles/${id}`, toArticleFormData(payload), {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return normalizeArticle(data);
    },

    async remove(id: number): Promise<void> {
        await httpClient.delete(`articles/${id}`);
    },

    async restore(id: number): Promise<void> {
        await httpClient.put(`articles/${id}/restore`);
    },

    async uploadThumbnail(id: number, file: File): Promise<void> {
        const form = new FormData();
        form.append('ThumbnailFile', file);
        await httpClient.post(`articles/${id}/thumbnail`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    /**
     * Uploads an image used within the article content (Rich text editor) to the cloud.
     * Simulated implementation returns an object URL or placeholder if endpoint isn't ready.
     */
    async uploadImage(file: File): Promise<string> {
        const form = new FormData();
        form.append('file', file);
        const { data } = await httpClient.post<{ url: string }>('articles/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.url;
    },
};

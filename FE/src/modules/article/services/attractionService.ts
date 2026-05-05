import { httpClient } from '../../../api/httpClient';
import type { Attraction } from '../types/article.types';

export const attractionService = {
    async getAll(): Promise<Attraction[]> {
        const { data } = await httpClient.get<Attraction[]>('attractions');
        return data;
    },
};

import { httpClient, getAccessToken } from './httpClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5082/api';


export interface UserProfile {
    id: number;
    email: string;
    fullName: string;
    phone: string;
    roleName: string;
    isActive: boolean;
    avatarUrl?: string;
    birthday?: string;
    birthdayUpdateCount: number;
    membershipTierName?: string;
    membershipDiscountPercent?: number;
}

export interface UpdateProfilePayload {
    fullName: string;
    phone: string;
    birthday?: string;
}

export const userProfileApi = {
    getMyProfile: async (): Promise<UserProfile> => {
        const response = await httpClient.get<UserProfile>('/UserProfile/my-profile');
        return response.data;
    },

    updateProfile: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
        const response = await httpClient.put<UserProfile>('/UserProfile/update-profile', payload);
        return response.data;
    },

    uploadAvatar: async (uploadFile: File): Promise<UserProfile> => {
        const formData = new FormData();
        formData.append('file', uploadFile);
        
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/UserProfile/upload-avatar`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
                // Note: We deliberately DO NOT set Content-Type here. 
                // The browser will automatically set it to multipart/form-data with the correct boundary!
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Avatar upload failed with status: ${response.status}`);
        }

        return await response.json();
    }
};

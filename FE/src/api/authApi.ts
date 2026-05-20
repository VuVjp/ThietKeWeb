import {
    clearAuthTokens,
    getRefreshToken,
    httpClient,
    notifyAuthTokenChanged,
    setAccessToken,
    setRefreshToken,
} from './httpClient';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
}

export interface AuthResponse {
    token: string;
    message?: string;
    status?: string;
    refreshToken: string;
}

interface TokenEnvelope {
    token?: string;
    Token?: string;
    accessToken?: string;
    AccessToken?: string;
    refreshToken?: string;
    RefreshToken?: string;
    refeshToken?: string;
    RefeshToken?: string;
    message?: string;
    status?: string;
}

function resolveAuthTokens(data: TokenEnvelope): AuthResponse {
    const token = data.token ?? data.Token ?? data.accessToken ?? data.AccessToken;
    const refreshToken =
        data.refreshToken ??
        data.RefreshToken ??
        data.refeshToken ??
        data.RefeshToken;

    const message = data.message;
    const status = data.status;

    if (!token || !refreshToken) {
        throw new Error('Auth response does not contain token pair');
    }

    return { token, refreshToken, message, status };
}

export const authApi = {
    async login(payload: LoginRequest) {
        const { data } = await httpClient.post<TokenEnvelope>('auth/login', payload);

        const result = resolveAuthTokens(data);
        setAccessToken(result.token);
        setRefreshToken(result.refreshToken);
        notifyAuthTokenChanged(result.token);
        return result;
    },

    async register(payload: RegisterRequest) {
        const { data } = await httpClient.post('auth/register', payload);
        return data;
    },

    async googleLogin(idToken: string) {
        const { data } = await httpClient.post<TokenEnvelope>('auth/google-login', { idToken });
        const result = resolveAuthTokens(data);
        setAccessToken(result.token);
        setRefreshToken(result.refreshToken);
        notifyAuthTokenChanged(result.token);
        return result;
    },

    async refreshToken(refreshToken = getRefreshToken()) {
        if (!refreshToken) {
            throw new Error('Refresh token is missing');
        }

        const { data } = await httpClient.post<TokenEnvelope>('auth/refresh-token', {
            refreshToken,
        });

        const result = resolveAuthTokens(data);

        setAccessToken(result.token);
        setRefreshToken(result.refreshToken);
        notifyAuthTokenChanged(result.token);
        return result;
    },

    async logout(refreshToken = getRefreshToken()) {
        if (refreshToken) {
            await httpClient.post('auth/logout', { refreshToken });
        }
        clearAuthTokens();
    },
};

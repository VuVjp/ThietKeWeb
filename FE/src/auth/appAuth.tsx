import { createContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { rolesApi } from '../api/rolesApi';
import { clearAuthTokens, getAccessToken, toApiError } from '../api/httpClient';
import { type AppPermission, type AppUser } from './auth.types';
import { subscribeAuthRefresh } from '../api/httpClient';
import { userProfileApi } from '../api/userProfileApi';
import { message } from 'antd';

const PERMISSIONS_STORAGE_KEY = 'permissions';

interface AuthContextValue {
    user: AppUser | null;
    isAuthenticated: boolean;
    isAuthReady: boolean;
    login: (email: string, password: string) => Promise<{ message: string; success: boolean }>;
    loginWithGoogle: (idToken: string) => Promise<{ message: string; success: boolean }>;
    logout: () => Promise<void>;
    hasPermission: (permission: AppPermission) => boolean;
    hasAnyPermission: (permissions: AppPermission[]) => boolean;
}

export const AppAuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payloadPart = token.split('.')[1];
        if (!payloadPart) {
            return null;
        }

        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(normalized);
        return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function toKnownPermissions(items: string[] | null | undefined): AppPermission[] {
    if (!items?.length) {
        return [];
    }

    const normalized = new Set<AppPermission>();

    for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) {
            continue;
        }

        normalized.add(trimmed.toUpperCase() as AppPermission);
    }

    return Array.from(normalized);
}

function getUserBaseFromToken(previousUser?: AppUser | null): Omit<AppUser, 'permissions'> | null {
    const token = getAccessToken();
    if (!token) {
        return null;
    }

    const payload = parseJwtPayload(token);
    const roleClaim =
        payload?.role ??
        payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const role = String(roleClaim ?? previousUser?.role ?? '').trim() || String(previousUser?.role ?? '');

    const idClaim =
        payload?.nameid ??
        payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

    const emailClaim =
        payload?.email ??
        payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

    const nameClaim =
        payload?.name ??
        payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
        'User';

    return {
        id: Number(idClaim ?? Date.now()),
        name: String(nameClaim),
        email: String(emailClaim ?? ''),
        role,
    };
}

async function resolveCurrentUser(
    emailOverride?: string,
    previousUser?: AppUser | null,
    forcePermissionsRefresh = false,
): Promise<AppUser | null> {
    let baseUser = getUserBaseFromToken(previousUser);

    if (!baseUser) {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await authApi.refreshToken();
                baseUser = getUserBaseFromToken(previousUser);
            }
        } catch {
            return null;
        }
    }

    if (!baseUser) {
        return null;
    }

    let avatarUrl: string | undefined = previousUser?.avatarUrl;
    try {
        const profile = await userProfileApi.getMyProfile();
        avatarUrl = profile.avatarUrl;
        if (profile.fullName) {
            baseUser.name = profile.fullName;
        }
    } catch {
        // ignore profile fetch failure (e.g. if endpoint is not ready yet or token not verified)
    }

    const cachedPermissionsRaw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    const cachedPermissions = cachedPermissionsRaw ? toKnownPermissions(JSON.parse(cachedPermissionsRaw) as string[]) : [];

    if (!forcePermissionsRefresh && cachedPermissions.length > 0) {
        return {
            ...baseUser,
            email: emailOverride?.trim().toLowerCase() || baseUser.email,
            permissions: cachedPermissions,
            avatarUrl,
        };
    }

    try {
        const apiPermissions = await rolesApi.getMyPermissions();
        const normalizedPermissions = toKnownPermissions(apiPermissions);
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(normalizedPermissions));

        return {
            ...baseUser,
            email: emailOverride?.trim().toLowerCase() || baseUser.email,
            permissions: normalizedPermissions,
            avatarUrl,
        };
    } catch {
        return {
            ...baseUser,
            email: emailOverride?.trim().toLowerCase() || baseUser.email,
            permissions: cachedPermissions,
            avatarUrl,
        };
    }
}

export function AppAuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const userRef = useRef<AppUser | null>(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        let active = true;

        void resolveCurrentUser(undefined, undefined, false).then((nextUser) => {
            if (active) {
                setUser(nextUser);
                setIsAuthReady(true);
            }
        });

        const unsubscribe = subscribeAuthRefresh((_token) => {
            try {
                const baseUser = getUserBaseFromToken(userRef.current);
                if (baseUser) {
                    setUser((prev) => ({
                        id: baseUser.id,
                        name: baseUser.name,
                        email: baseUser.email,
                        role: baseUser.role,
                        permissions: prev?.permissions ?? [],
                        avatarUrl: prev?.avatarUrl,
                    }));
                }
            } catch {
                // swallow parsing errors and continue to resolve full user
            }

            void resolveCurrentUser(undefined, userRef.current, false).then((nextUser) => {
                if (active) {
                    setUser(nextUser);
                }
            });
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handlePermissionsChanged = () => {
            void resolveCurrentUser(undefined, userRef.current, true).then((nextUser) => {
                setUser(nextUser);
            });
            toast.success('Permissions updated. Please reopen the page if something looks off.');
        };

        const handleForceLogout = () => {
            clearAuthTokens();
            setUser(null);
            localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
            setIsAuthReady(true);
            toast.error('Your account was deactivated. You have been signed out.');
        };

        window.addEventListener('permissions-changed', handlePermissionsChanged);
        window.addEventListener('force-logout', handleForceLogout);

        return () => {
            window.removeEventListener('permissions-changed', handlePermissionsChanged);
            window.removeEventListener('force-logout', handleForceLogout);
        };
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isAuthReady,
            login: async (email: string, password: string) => {
                const normalizedEmail = email.trim().toLowerCase();

                try {
                    const authRes = await authApi.login({ email: normalizedEmail, password });
                    const message = authRes.message;
                    const nextUser = await resolveCurrentUser(normalizedEmail, user);

                    if (!nextUser) {
                        return { message: message || 'Login failed', success: false };
                    }

                    setUser(nextUser);
                    setIsAuthReady(true);
                    return { message: message || 'Login successful', success: true };
                } catch (error) {
                    const apiError = toApiError(error);
                    return { message: apiError.message || 'Login failed', success: false };
                }
            },
            loginWithGoogle: async (idToken: string) => {
                try {
                    const authRes = await authApi.googleLogin(idToken);
                    const message = authRes.message;

                    const nextUser = await resolveCurrentUser(undefined, user);

                    if (!nextUser) {
                        return { message: message || 'Google sign-in failed', success: false };
                    }

                    setUser(nextUser);
                    setIsAuthReady(true);
                    return { message: message || 'Google sign-in successful', success: true };
                } catch (error) {
                    const apiError = toApiError(error);
                    return { message: apiError.message || 'Google sign-in failed', success: false };
                }
            },
            logout: async () => {
                try {
                    await authApi.logout();
                } finally {
                    setUser(null);
                    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
                    setIsAuthReady(true);
                }
            },
            hasPermission: (permission: AppPermission) => {
                if (!user) {
                    return false;
                }
                return user.permissions.includes(permission.toUpperCase() as AppPermission);
            },
            hasAnyPermission: (permissions: AppPermission[]) => {
                if (!user) {
                    return false;
                }
                return permissions.some((permission) => user.permissions.includes(permission.toUpperCase() as AppPermission));
            },
        }),
        [user, isAuthReady],
    );

    return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

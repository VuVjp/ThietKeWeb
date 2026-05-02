import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAppAuth } from '../auth/useAppAuth';

interface LoginLocationState {
    from?: {
        pathname?: string;
    };
}

export function LoginPage() {
    const { login, loginWithGoogle, isAuthenticated, isAuthReady, user } = useAppAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LoginLocationState | null;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B1121]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm tracking-widest uppercase">Loading...</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated && user) {
        const fromPath = state?.from?.pathname;
        if (fromPath) {
            return <Navigate to={fromPath} replace />;
        }
        return <Navigate to="/" replace />;
    }

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (!email.trim() || !password) {
            toast.error('Please enter email and password');
            return;
        }

        setIsSubmitting(true);
        const ok = await login(email, password);
        setIsSubmitting(false);

        if (!ok) {
            toast.error('Invalid email or password');
            return;
        }

        toast.success('Welcome back!');
        // Navigation handled by the redirect logic above on re-render
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) {
            toast.error('Google sign-in failed. Please try again.');
            return;
        }
        
        const ok = await loginWithGoogle(credentialResponse.credential);
        if (!ok) {
            toast.error('Google sign-in failed. Email may already be in use.');
            return;
        }
        toast.success('Welcome back!');
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            {/* Left Panel - Hero Image */}
            <div className="hidden lg:flex lg:w-[55%] relative">
                <img
                    src="https://images.unsplash.com/photo-1549294413-26f195200c16?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aG90ZWx8ZW58MHx8MHx8fDA%3D"
                    alt="Luxury Hotel"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/70" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                {/* Overlay Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    <Link to="/" className="flex items-center gap-3 group">
                        <span className="text-white text-3xl font-bold tracking-tight group-hover:text-amber-300 transition-colors">
                            Grandeur <span className="font-light">Hotel</span>
                        </span>
                    </Link>

                    <div className="space-y-8">
                        <div>
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Welcome Back</p>
                            <h1 className="text-5xl font-bold text-white leading-tight">
                                Your Luxury<br />
                                <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                                    Experience Awaits
                                </span>
                            </h1>
                            <p className="mt-4 text-slate-300 text-lg max-w-md leading-relaxed">
                                Sign in to manage your reservations, explore exclusive offers, and unlock premium membership benefits.
                            </p>
                        </div>

                        {/* Features */}
                        {/* <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: '🏨', label: 'Manage Bookings' },
                                { icon: '⭐', label: 'VIP Rewards' },
                                { icon: '🎁', label: 'Exclusive Offers' },
                            ].map((f) => (
                                <div key={f.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
                                    <span className="text-2xl block mb-2">{f.icon}</span>
                                    <span className="text-white/80 text-xs font-medium">{f.label}</span>
                                </div>
                            ))}
                        </div> */}
                    </div>

                    <p className="text-slate-500 text-xs">
                        © {new Date().getFullYear()} Grandeur Hotel. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col bg-[#0B1121] relative">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />

                {/* Mobile Logo */}
                <div className="lg:hidden p-6">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <span className="text-white text-lg font-bold">Grandeur <span className="font-light">Hotel</span></span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-16 py-8">
                    <div className="w-full max-w-md relative z-10">
                        {/* Header */}
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
                            <p className="text-slate-400 text-sm">
                                Enter your credentials to access your account
                            </p>
                        </div>

                        {/* Google Sign In */}
                        <div className="relative group overflow-hidden rounded-xl">
                            <button
                                type="button"
                                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white px-4 py-3.5 text-sm font-medium transition-all duration-300"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="group-hover:text-white/90">Continue with Google</span>
                            </button>
                            <div className="absolute inset-0 opacity-0 z-10 flex justify-center items-center [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:!opacity-0 cursor-pointer">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => toast.error('Google sign-in failed')}
                                    theme="filled_black"
                                    text="signin_with"
                                    shape="rectangular"
                                    width="400"
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-4 bg-[#0B1121] text-slate-500 uppercase tracking-widest font-medium">or sign in with email</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </div>
                                    <input
                                        id="login-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                        placeholder="your@email.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="login-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => toast('Password reset feature coming soon!', { icon: '🔒' })}
                                        className="text-xs text-amber-400/80 hover:text-amber-400 font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                            >
                                <span className="relative z-10">
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Signing In...
                                        </span>
                                    ) : 'Sign In'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-white/20 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            </button>
                        </form>

                        {/* Register Link */}
                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm">
                                Don't have an account?{' '}
                                <Link to="/register" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                                    Create Account
                                </Link>
                            </p>
                        </div>

                        {/* Staff Portal Link */}
                        <div className="mt-4 text-center">
                            <p className="text-slate-600 text-xs">
                                Staff members use the same login.{' '}
                                <span className="text-slate-500">Your role determines access level.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

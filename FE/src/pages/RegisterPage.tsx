import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAppAuth } from '../auth/useAppAuth';
import { authApi } from '../api/authApi';

export function RegisterPage() {
    const { isAuthenticated, isAuthReady, login, loginWithGoogle } = useAppAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
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

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            await authApi.register({
                email: formData.email.trim().toLowerCase(),
                fullName: formData.fullName.trim(),
                password: formData.password,
                phone: formData.phone.trim() || undefined,
            });
            toast.success('Account created successfully!');

            // Auto-login after registration
            const loginOk = await login(formData.email, formData.password);
            if (loginOk) {
                navigate('/');
            } else {
                navigate('/login');
            }
        } catch (err: unknown) {
            const message = (err as { response?: { data?: string } })?.response?.data;
            toast.error(typeof message === 'string' ? message : 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
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
                    src="https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="Luxury Hotel Interior"
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
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-4">Join Us Today</p>
                            <h1 className="text-5xl font-bold text-white leading-tight">
                                Begin Your<br />
                                <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                                    Luxury Journey
                                </span>
                            </h1>
                            <p className="mt-4 text-slate-300 text-lg max-w-md leading-relaxed">
                                Create your account and unlock a world of exclusive benefits, personalized experiences, and premium rewards.
                            </p>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-3">
                            {[
                                'Earn loyalty points on every stay',
                                'Access exclusive member-only rates',
                                'Priority booking & free upgrades',
                                'Manage all your reservations online',
                            ].map((benefit) => (
                                <div key={benefit} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-white/80 text-sm">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-slate-500 text-xs">
                        © {new Date().getFullYear()} Grandeur Hotel. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right Panel - Register Form */}
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
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                            <p className="text-slate-400 text-sm">
                                Join Grandeur Hotel and start your premium experience
                            </p>
                        </div>

                        {/* Google Sign Up */}
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
                                    text="signup_with"
                                    shape="rectangular"
                                    width="400"
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-4 bg-[#0B1121] text-slate-500 uppercase tracking-widest font-medium">or register with email</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label htmlFor="reg-fullName" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Full Name <span className="text-amber-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="reg-fullName"
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Email Address <span className="text-amber-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                        </svg>
                                    </div>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                        placeholder="your@email.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-1.5">
                                <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="reg-phone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                        placeholder="+84 xxx xxx xxx"
                                    />
                                </div>
                            </div>

                            {/* Password Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Password <span className="text-amber-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="reg-password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Confirm <span className="text-amber-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="reg-confirm"
                                            type={showPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-all duration-300"
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Show Password Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showPassword}
                                    onChange={() => setShowPassword(!showPassword)}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/25"
                                />
                                <span className="text-xs text-slate-500">Show passwords</span>
                            </label>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mt-2"
                            >
                                <span className="relative z-10">
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Creating Account...
                                        </span>
                                    ) : 'Create Account'}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-white/20 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            </button>
                        </form>

                        {/* Login Link */}
                        <div className="mt-6 text-center">
                            <p className="text-slate-500 text-sm">
                                Already have an account?{' '}
                                <Link to="/login" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

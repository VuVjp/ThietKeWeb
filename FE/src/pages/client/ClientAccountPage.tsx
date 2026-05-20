import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserCircleIcon, ArrowRightOnRectangleIcon, CalendarDaysIcon, ArrowPathIcon, CreditCardIcon, XMarkIcon, CheckCircleIcon, CameraIcon, SparklesIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { receptionApi } from '../../api/receptionApi';
import { userProfileApi } from '../../api/userProfileApi';
import type { UserProfile } from '../../api/userProfileApi';
import type { Booking } from '../../types/models';
import { getAccessToken } from '../../api/httpClient';
import momoApi from '../../api/momoApi';
import { useAppAuth } from '../../auth/useAppAuth';
import { reviewsApi } from '../../api/reviewsApi';
import { roomTypesApi } from '../../api/roomTypesApi';

export function ClientAccountPage() {
    const navigate = useNavigate();
    const { logout } = useAppAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [pwdCurrent, setPwdCurrent] = useState('');
    const [pwdNew, setPwdNew] = useState('');
    const [pwdConfirm, setPwdConfirm] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        birthday: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Reviews Tab State
    const [myReviews, setMyReviews] = useState<any[]>([]);
    const [eligibilities, setEligibilities] = useState<any[]>([]);
    const [roomTypes, setRoomTypes] = useState<any[]>([]);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsPageSize] = useState(5);
    const [filterRoomTypeId, setFilterRoomTypeId] = useState<number | undefined>(undefined);
    const [filterRating, setFilterRating] = useState<number | undefined>(undefined);
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');
    const [reviewsLoading, setReviewsLoading] = useState(false);

    // Write/Edit Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewModalMode, setReviewModalMode] = useState<'create' | 'edit'>('create');
    const [selectedEligibility, setSelectedEligibility] = useState<any | null>(null);
    const [selectedReviewToEdit, setSelectedReviewToEdit] = useState<any | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    const fetchWrittenReviews = async (pageNumber: number) => {
        if (!profile?.id) return;
        try {
            const query: any = {
                userId: profile.id,
                page: pageNumber,
                pageSize: reviewsPageSize,
                sortBy: 'id',
                sortOrder: 'desc'
            };
            if (filterRoomTypeId) query.roomTypeId = filterRoomTypeId;
            if (filterRating) query.rating = filterRating;
            if (filterStatus) query.status = filterStatus;
            if (filterStartDate) query.startDate = new Date(filterStartDate).toISOString();
            if (filterEndDate) query.endDate = new Date(filterEndDate).toISOString();

            const paged = await reviewsApi.getPaged(query);
            setMyReviews(paged.items);
            setReviewsTotal(paged.total);
            setReviewsPage(paged.page);
        } catch (error) {
            console.error('Error fetching written reviews:', error);
        }
    };

    const fetchReviewsData = async () => {
        if (!profile?.id) return;
        setReviewsLoading(true);
        try {
            const [eligList, rtList] = await Promise.all([
                reviewsApi.getEligibility(),
                roomTypesApi.getAll()
            ]);
            setEligibilities(eligList);
            setRoomTypes(rtList);
            await fetchWrittenReviews(1);
        } catch (error) {
            console.error('Error fetching review data:', error);
            toast.error('Failed to load review data');
        } finally {
            setReviewsLoading(false);
        }
    };

    const handleReviewsPageChange = (page: number) => {
        fetchWrittenReviews(page);
    };

    const handleOpenCreateReview = (eligibility: any) => {
        setReviewModalMode('create');
        setSelectedEligibility(eligibility);
        setReviewRating(5);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const handleOpenEditReview = (reviewItem: any) => {
        setReviewModalMode('edit');
        setSelectedReviewToEdit(reviewItem);
        setReviewRating(reviewItem.rating);
        setReviewComment(reviewItem.comment || '');
        setShowReviewModal(true);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            if (reviewModalMode === 'create' && selectedEligibility) {
                await reviewsApi.create({
                    roomTypeId: selectedEligibility.roomTypeId,
                    bookingId: selectedEligibility.bookingId,
                    rating: reviewRating,
                    comment: reviewComment
                });
                toast.success('Review submitted successfully for moderation!');
            } else if (reviewModalMode === 'edit' && selectedReviewToEdit) {
                await reviewsApi.update(selectedReviewToEdit.id, {
                    rating: reviewRating,
                    comment: reviewComment
                });
                toast.success('Review updated successfully!');
            }
            setShowReviewModal(false);
            fetchReviewsData();
        } catch (error: any) {
            console.error('Error submitting review:', error);
            const errMsg = error.response?.data?.message || error.response?.data || error.message || 'Failed to submit review';
            toast.error(errMsg);
        } finally {
            setSubmittingReview(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reviews') {
            fetchReviewsData();
        }
    }, [activeTab, filterRoomTypeId, filterRating, filterStatus, filterStartDate, filterEndDate]);

    useEffect(() => {
        const token = getAccessToken();
        if (!token) {
            navigate('/login');
            return;
        }

        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileData, bookingsData, eligData] = await Promise.all([
                userProfileApi.getMyProfile(),
                receptionApi.getMyHistory(),
                reviewsApi.getEligibility().catch(() => [])
            ]);
            setProfile(profileData);
            setBookings(bookingsData);
            setEligibilities(eligData);
            setFormData({
                fullName: profileData.fullName,
                phone: profileData.phone,
                birthday: profileData.birthday ? profileData.birthday.split('T')[0] : ''
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load account information');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('client_guest_email');
        toast.success('Logged out successfully');
        navigate('/');
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarFile(file);
        setImageError(false); // Reset error state

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                fullName: formData.fullName,
                phone: formData.phone,
                birthday: formData.birthday || undefined
            };

            let finalProfile = await userProfileApi.updateProfile(payload);

            if (avatarFile) {
                try {
                    const updatedWithAvatar = await userProfileApi.uploadAvatar(avatarFile);
                    finalProfile = updatedWithAvatar;
                    setAvatarFile(null);
                    setAvatarPreview(null);
                    setImageError(false); // Reset image error for the newly uploaded avatar
                } catch (avatarError) {
                    console.error('Error uploading avatar:', avatarError);
                    toast.error('Profile info saved, but avatar upload failed.');
                }
            }

            setProfile(finalProfile);
            toast.success(`Profile updated! Avatar: ${finalProfile.avatarUrl ? 'Saved' : 'Missing'}`);
            if (finalProfile.avatarUrl) {
                console.log('New Avatar URL:', finalProfile.avatarUrl);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pwdCurrent) {
            toast.error('Please enter your current password');
            return;
        }
        if (!pwdNew) {
            toast.error('Please enter your new password');
            return;
        }
        if (pwdNew.length < 6) {
            toast.error('New password must be at least 6 characters long');
            return;
        }
        if (pwdNew === pwdCurrent) {
            toast.error('New password cannot be the same as your current password');
            return;
        }
        if (pwdNew !== pwdConfirm) {
            toast.error('Confirm password does not match');
            return;
        }

        setPwdSaving(true);
        try {
            await userProfileApi.changePassword({
                currentPassword: pwdCurrent,
                newPassword: pwdNew
            });
            toast.success('Password changed successfully!');
            setPwdCurrent('');
            setPwdNew('');
            setPwdConfirm('');
        } catch (error: any) {
            console.error('Password change error:', error);
            const errMsg = error.response?.data?.message || error.message || 'Incorrect current password';
            toast.error(errMsg);
        } finally {
            setPwdSaving(false);
        }
    };

    const handlePayDeposit = async (bookingId: number) => {
        try {
            const res = await momoApi.createPayment({
                type: 'booking',
                targetId: bookingId
            });
            if (res.payUrl) {
                window.location.href = res.payUrl;
            }
        } catch (error) {
            toast.error('Không thể tạo liên kết thanh toán.');
        }
    };

    const handleCancelBooking = (bookingId: number) => {
        setBookingToCancel(bookingId);
    };

    const confirmCancel = async () => {
        if (!bookingToCancel) return;
        setIsCancelling(true);
        try {
            await receptionApi.cancelBooking(bookingToCancel);
            toast.success('Booking cancelled successfully!');
            setBookingToCancel(null);
            fetchData(); // Refresh list
        } catch (error) {
            toast.error('Failed to cancel booking. It may be too late to cancel.');
        } finally {
            setIsCancelling(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            case 'checkedin': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'checkedout': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'cancelled': return 'Cancelled';
            case 'checkedin': return 'Checked In';
            case 'checkedout': return 'Checked Out';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="w-full bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
        );
    }

    const currentPoints = profile?.loyaltyPoints || 0;
    const currentTier = (profile?.membershipTierName || 'Bronze').toLowerCase();

    let nextTierName = '';
    let nextTierMinPoints = 0;
    let progressPercent = 0;

    if (currentTier.includes('platinum')) {
        nextTierName = 'Max Tier';
        nextTierMinPoints = 10000;
        progressPercent = 100;
    } else if (currentTier.includes('gold')) {
        nextTierName = 'Platinum';
        nextTierMinPoints = 10000;
        progressPercent = Math.max(0, Math.min(((currentPoints - 5000) / 5000) * 100, 100));
    } else if (currentTier.includes('silver')) {
        nextTierName = 'Gold';
        nextTierMinPoints = 5000;
        progressPercent = Math.max(0, Math.min(((currentPoints - 1000) / 4000) * 100, 100));
    } else {
        nextTierName = 'Silver';
        nextTierMinPoints = 1000;
        progressPercent = Math.max(0, Math.min((currentPoints / 1000) * 100, 100));
    }

    return (
        <div className="w-full bg-[#f4f7f6] min-h-screen pb-24 font-sans text-slate-800">
            {/* Header */}
            <div className="pt-[120px] pb-10 bg-slate-900 border-b-4 border-cyan-500">
                <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Account</h1>
                        <p className="text-cyan-400 text-sm tracking-widest uppercase">
                            {profile?.email ? `Signed in as: ${profile.email}` : 'Welcome back'}
                        </p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest">
                        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 mt-12 flex flex-col lg:flex-row gap-10">

                {/* SIDEBAR TABS */}
                <div className="lg:w-64 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 overflow-hidden flex flex-col space-y-1">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'profile' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <UserCircleIcon className="w-5 h-5" /> Profile Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'bookings' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <CalendarDaysIcon className="w-5 h-5" /> Booking History
                            {bookings.length > 0 && (
                                <span className="ml-auto bg-cyan-600 text-white text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                                    {bookings.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'reviews' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <SparklesIcon className="w-5 h-5" /> My Reviews
                            {eligibilities.length > 0 && (
                                <span className="ml-auto bg-amber-500 text-white text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                    {eligibilities.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1">
                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            {/* Personal Information & Change Password Column */}
                            <div className="order-2 lg:order-1 lg:col-span-2 space-y-8">
                                {/* Personal Information Card */}
                                <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm border border-slate-200">
                                    <h2 className="text-2xl font-bold mb-8 border-b pb-4">Personal Information</h2>

                                    {/* Avatar Section */}
                                    <div className="mb-10 flex flex-col sm:flex-row items-center gap-8 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-white border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>

                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center ring-4 ring-slate-50 transition-all duration-300 group-hover:shadow-xl">
                                                {(avatarPreview || profile?.avatarUrl) && !imageError ? (
                                                    <img
                                                        src={avatarPreview || profile?.avatarUrl || ''}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        onError={() => setImageError(true)}
                                                    />
                                                ) : (
                                                    <UserCircleIcon className="w-24 h-24 text-slate-300" />
                                                )}

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full flex flex-col items-center justify-center text-white">
                                                    <CameraIcon className="w-8 h-8 mb-1" />
                                                    <span className="text-xs font-semibold tracking-wider uppercase">Upload</span>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleAvatarChange}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                        </div>
                                        <div className="text-center sm:text-left flex-1 z-10">
                                            <h3 className="font-bold text-2xl text-slate-900 tracking-tight mb-1">{profile?.fullName || 'Your Profile'}</h3>
                                            <p className="text-slate-500 text-sm mb-4">{profile?.email}</p>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:text-cyan-600 hover:border-cyan-200 hover:bg-cyan-50 transition-all shadow-sm"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                                Update Photo
                                            </button>
                                        </div>
                                        {avatarFile && (
                                            <div className="sm:ml-auto animate-pulse flex flex-col items-center sm:items-end z-10">
                                                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                    <span className="text-xs font-bold uppercase tracking-wide">Ready to save</span>
                                                </div>
                                                <span className="text-[11px] text-slate-400 mt-2 text-center sm:text-right w-full">
                                                    Don't forget to click<br className="hidden sm:block" /> 'Save Changes'
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <form className="space-y-6 max-w-2xl" onSubmit={handleUpdateProfile}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Birthday</label>
                                                <input
                                                    type="date"
                                                    value={formData.birthday}
                                                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none ${(profile?.birthdayUpdateCount || 0) >= 1 ? 'cursor-not-allowed opacity-75' : ''}`}
                                                    disabled={(profile?.birthdayUpdateCount || 0) >= 1}
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1 italic">
                                                    Enter your birthday to receive voucher offers on your birthday 🎉
                                                </p>
                                                {(profile?.birthdayUpdateCount || 0) >= 1 && (
                                                    <p className="text-[10px] text-red-500 mt-1">
                                                        Birthday can only be set once. Please contact support if you need to change it.
                                                    </p>
                                                )}
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                                                <input type="email" value={profile?.email || ''} disabled className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed" />
                                                <p className="text-xs text-slate-500 mt-1">Contact support to change your email address.</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 flex flex-wrap gap-4 items-center">
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-cyan-500 transition-colors shadow-md disabled:opacity-50"
                                            >
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>

                                            {!showPasswordForm && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordForm(true)}
                                                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors shadow-sm flex items-center gap-2"
                                                >
                                                    <LockClosedIcon className="w-4 h-4 text-cyan-600 animate-pulse" />
                                                    Change Password
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* Change Password Card */}
                                {showPasswordForm && (
                                    <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 ease-in-out">
                                        <h2 className="text-2xl font-bold mb-8 border-b pb-4 flex items-center gap-2">
                                            <LockClosedIcon className="w-6 h-6 text-cyan-600 animate-bounce" />
                                            Change Account Password
                                        </h2>
                                        <form className="space-y-6 max-w-2xl" onSubmit={handleChangePassword}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Current Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showCurrent ? 'text' : 'password'}
                                                            value={pwdCurrent}
                                                            onChange={(e) => setPwdCurrent(e.target.value)}
                                                            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                            placeholder="Enter current password"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrent(!showCurrent)}
                                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-600 transition-colors"
                                                        >
                                                            {showCurrent ? (
                                                                <EyeSlashIcon className="w-5 h-5" />
                                                            ) : (
                                                                <EyeIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showNew ? 'text' : 'password'}
                                                            value={pwdNew}
                                                            onChange={(e) => setPwdNew(e.target.value)}
                                                            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                            placeholder="New password (minimum 6 characters)"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNew(!showNew)}
                                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-600 transition-colors"
                                                        >
                                                            {showNew ? (
                                                                <EyeSlashIcon className="w-5 h-5" />
                                                            ) : (
                                                                <EyeIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Confirm New Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showConfirm ? 'text' : 'password'}
                                                            value={pwdConfirm}
                                                            onChange={(e) => setPwdConfirm(e.target.value)}
                                                            className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                            placeholder="Re-enter new password"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirm(!showConfirm)}
                                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-cyan-600 transition-colors"
                                                        >
                                                            {showConfirm ? (
                                                                <EyeSlashIcon className="w-5 h-5" />
                                                            ) : (
                                                                <EyeIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-2 flex flex-wrap gap-4 items-center">
                                                <button
                                                    type="submit"
                                                    disabled={pwdSaving}
                                                    className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-cyan-500 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {pwdSaving ? 'Updating...' : 'Update Password'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowPasswordForm(false);
                                                        setPwdCurrent('');
                                                        setPwdNew('');
                                                        setPwdConfirm('');
                                                    }}
                                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold uppercase tracking-widest text-sm transition-colors shadow-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Membership Banner */}
                            <div className="order-1 lg:order-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden">
                                {/* Decorative Background element */}
                                <div className="absolute -right-8 -top-8 text-white/5 transform rotate-12">
                                    <SparklesIcon className="w-48 h-48" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Membership</h3>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                            {profile?.membershipTierName || 'Standard Tier'}
                                        </span>
                                        {profile?.membershipDiscountPercent ? (
                                            <span className="bg-cyan-500/10 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full border border-cyan-500/20 shadow-inner">
                                                {profile.membershipDiscountPercent}% Room Discount
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-slate-500 text-sm mt-3">
                                        Your discount is automatically applied to all eligible room bookings.
                                    </p>

                                    {/* Progress Bar to Next Membership Tier */}
                                    <div className="mt-6 border-t border-slate-700/50 pt-5">
                                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                                            <span>{currentPoints.toLocaleString()} Points</span>
                                            {nextTierName !== 'Max Tier' ? (
                                                <span className="text-cyan-400">{Math.max(0, nextTierMinPoints - currentPoints).toLocaleString()} points to {nextTierName}</span>
                                            ) : (
                                                <span className="text-emerald-400">✨ Highest Tier Reached</span>
                                            )}
                                        </div>
                                        <div className="w-full bg-slate-700/50 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/30">
                                            <div
                                                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${progressPercent}%` }}
                                            ></div>
                                        </div>
                                        {nextTierName !== 'Max Tier' && (
                                            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-semibold">
                                                <span>{profile?.membershipTierName || 'Bronze'}</span>
                                                <span>{nextTierName} ({nextTierMinPoints.toLocaleString()} pts)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOOKINGS TAB */}
                    {activeTab === 'bookings' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800">Booking History</h2>
                                <button
                                    onClick={fetchData}
                                    className="flex items-center gap-2 text-slate-500 hover:text-cyan-600 font-bold text-xs uppercase tracking-wider transition-colors"
                                >
                                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                                </button>
                            </div>

                            {bookings.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="text-5xl mb-4">🛎️</div>
                                    <p className="text-xl font-bold text-slate-700 mb-2">No bookings yet</p>
                                    <p className="text-slate-500 mb-6">Your reservations will appear here after you book a room.</p>
                                    <button
                                        onClick={() => navigate('/booking')}
                                        className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-700 transition"
                                    >
                                        Book a Room Now
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                                                <th className="p-5 font-bold">Booking ID / Room</th>
                                                <th className="p-5 font-bold">Dates</th>
                                                <th className="p-5 font-bold">Total</th>
                                                <th className="p-5 font-bold">Status</th>
                                                <th className="p-5 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bookings.map((bkg) => (
                                                <tr key={bkg.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-5">
                                                        <div className="font-bold text-slate-900 mb-1">{bkg.roomNumbers?.join(', ') || 'N/A'}</div>
                                                        <div className="text-xs text-slate-500">#{bkg.id}</div>
                                                    </td>
                                                    <td className="p-5 text-sm text-slate-600">
                                                        <div className="mb-1"><span className="font-semibold text-slate-400">In:</span> {new Date(bkg.checkInDate).toLocaleDateString()}</div>
                                                        <div><span className="font-semibold text-slate-400">Out:</span> {new Date(bkg.checkOutDate).toLocaleDateString()}</div>
                                                    </td>
                                                    <td className="p-5 text-sm text-slate-600">
                                                        <div className="font-bold text-slate-900">${bkg.totalAmount?.toLocaleString()}</div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(bkg.status)}`}>
                                                            {getStatusLabel(bkg.status)}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {bkg.status?.toLowerCase() === 'pending' && (
                                                                <button
                                                                    onClick={() => handlePayDeposit(bkg.id)}
                                                                    className="text-white bg-cyan-600 hover:bg-cyan-700 shadow-md shadow-cyan-600/20 active:scale-95 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1 transition-all"
                                                                >
                                                                    <CreditCardIcon className="w-4 h-4" /> Pay Deposit
                                                                </button>
                                                            )}
                                                            {/* {&& new Date(bkg.checkInDate).addHours(1) > new Date()} */}
                                                            {(bkg.status?.toLowerCase() === 'pending' || bkg.status?.toLowerCase() === 'confirmed') && (
                                                                <button
                                                                    onClick={() => handleCancelBooking(bkg.id)}
                                                                    className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1 transition-all shadow-sm active:scale-95"
                                                                >
                                                                    <XMarkIcon className="w-4 h-4" /> Cancel
                                                                </button>
                                                            )}
                                                            {(bkg.status?.toLowerCase() !== 'pending' && bkg.status?.toLowerCase() !== 'confirmed') && (
                                                                <div className="text-slate-400 bg-slate-100 font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded flex items-center gap-1 grayscale opacity-60">
                                                                    <CheckCircleIcon className="w-3.5 h-3.5" /> {getStatusLabel(bkg.status)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REVIEWS TAB */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* UNREVIEWED ROOM TYPES CARD */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">Unreviewed Stays</h2>
                                        <p className="text-sm text-slate-500 mt-1">Room types you have recently stayed in but haven't reviewed yet.</p>
                                    </div>
                                    <span className="bg-amber-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                        {eligibilities.length} Pending
                                    </span>
                                </div>
                                <div className="p-6 md:p-8">
                                    {eligibilities.length === 0 ? (
                                        <div className="text-center py-10">
                                            <div className="text-4xl mb-3">✨</div>
                                            <p className="font-bold text-slate-700">All caught up!</p>
                                            <p className="text-xs text-slate-500 mt-1">You have reviewed all your recent hotel stays.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Object.values(
                                                eligibilities.reduce((acc, curr) => {
                                                    if (!acc[curr.roomTypeId]) {
                                                        acc[curr.roomTypeId] = {
                                                            roomTypeId: curr.roomTypeId,
                                                            roomTypeName: curr.roomTypeName,
                                                            count: 0,
                                                            items: []
                                                        };
                                                    }
                                                    acc[curr.roomTypeId].count += 1;
                                                    acc[curr.roomTypeId].items.push(curr);
                                                    return acc;
                                                }, {} as Record<number, { roomTypeId: number; roomTypeName: string; count: number; items: any[] }>)
                                            ).map((group: any) => (
                                                <div key={group.roomTypeId} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors"></div>
                                                    <div>
                                                        <span className="text-[10px] font-extrabold tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase border border-amber-200/50">
                                                            {group.count} stay{group.count > 1 ? 's' : ''} to review
                                                        </span>
                                                        <h3 className="font-bold text-lg text-slate-800 mt-3 group-hover:text-cyan-600 transition-colors">{group.roomTypeName}</h3>
                                                        <p className="text-xs text-slate-500 mt-2">
                                                            Bookings: {group.items.map((item: any) => `#${item.bookingCode}`).join(', ')}
                                                        </p>
                                                    </div>
                                                    <div className="mt-6">
                                                        <button
                                                            onClick={() => handleOpenCreateReview(group.items[0])}
                                                            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-md shadow-cyan-600/10 transition-all transform active:scale-[0.98]"
                                                        >
                                                            Write Review
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* MY WRITTEN REVIEWS & FILTERS */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">My Reviews</h2>
                                        <p className="text-sm text-slate-500 mt-1">Review history and active status.</p>
                                    </div>
                                    <button
                                        onClick={fetchReviewsData}
                                        className="inline-flex items-center justify-center gap-2 text-slate-500 hover:text-cyan-600 font-bold text-xs uppercase tracking-wider transition-colors self-start md:self-auto"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" /> Refresh
                                    </button>
                                </div>

                                {/* FILTERS BLOCK */}
                                <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Room Type</label>
                                        <select
                                            value={filterRoomTypeId || ''}
                                            onChange={(e) => setFilterRoomTypeId(e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">All Room Types</option>
                                            {roomTypes.map((rt) => (
                                                <option key={rt.id} value={rt.id}>{rt.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Rating</label>
                                        <select
                                            value={filterRating || ''}
                                            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">All Stars</option>
                                            {[5, 4, 3, 2, 1].map((stars) => (
                                                <option key={stars} value={stars}>{stars} Star{stars > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
                                        <select
                                            value={filterStatus || ''}
                                            onChange={(e) => setFilterStatus(e.target.value || undefined)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">From Date</label>
                                        <input
                                            type="date"
                                            value={filterStartDate}
                                            onChange={(e) => setFilterStartDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">To Date</label>
                                        <input
                                            type="date"
                                            value={filterEndDate}
                                            onChange={(e) => setFilterEndDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* WRITTEN REVIEWS LIST */}
                                <div className="p-6 md:p-8">
                                    {reviewsLoading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                                        </div>
                                    ) : myReviews.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="text-4xl mb-3">📝</div>
                                            <p className="font-bold text-slate-700">No reviews found</p>
                                            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or write a new review.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {myReviews.map((rev) => (
                                                <div key={rev.id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all duration-300 relative group shadow-sm">
                                                    <div className="flex flex-wrap justify-between items-start gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-slate-800">{rev.roomTypeName || 'Room Type'}</span>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                                                    rev.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                    rev.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-rose-50 text-rose-700 border-rose-200'
                                                                }`}>
                                                                    {rev.status === 'Active' ? 'Active' : rev.status}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 mt-2">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <svg
                                                                        key={i}
                                                                        className={`w-4 h-4 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                                                                        viewBox="0 0 20 20"
                                                                    >
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                ))}
                                                                <span className="text-xs text-slate-500 font-semibold ml-1.5">
                                                                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {rev.canEdit && (
                                                            <button
                                                                onClick={() => handleOpenEditReview(rev)}
                                                                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-cyan-600 hover:border-cyan-200 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 animate-pulse"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                                Edit Review
                                                            </button>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-white/50 p-4 rounded-xl border border-slate-100/50">
                                                        {rev.comment || <em className="text-slate-400">No comment provided.</em>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* PAGINATION */}
                                    {reviewsTotal > reviewsPageSize && (
                                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <button
                                                disabled={reviewsPage === 1 || reviewsLoading}
                                                onClick={() => handleReviewsPageChange(reviewsPage - 1)}
                                                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-xs text-slate-500 font-bold">
                                                Page {reviewsPage} of {Math.ceil(reviewsTotal / reviewsPageSize)}
                                            </span>
                                            <button
                                                disabled={reviewsPage >= Math.ceil(reviewsTotal / reviewsPageSize) || reviewsLoading}
                                                onClick={() => handleReviewsPageChange(reviewsPage + 1)}
                                                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* WRITE / EDIT REVIEW MODAL */}
            {showReviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900">
                                    {reviewModalMode === 'create' ? 'Write Room Review' : 'Edit Room Review'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    {reviewModalMode === 'create' 
                                        ? `Share your stay experience for ${selectedEligibility?.roomTypeName}`
                                        : `Modify your review for ${selectedReviewToEdit?.roomTypeName}`
                                    }
                                </p>
                            </div>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitReview} className="p-6 md:p-8 space-y-6">
                            {/* Rating Stars Selection */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Your Rating</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((stars) => (
                                        <button
                                            key={stars}
                                            type="button"
                                            onClick={() => setReviewRating(stars)}
                                            className="focus:outline-none transition-transform active:scale-95"
                                        >
                                            <svg
                                                className={`w-10 h-10 ${stars <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} hover:scale-110 transition-transform`}
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                    <span className="text-sm text-slate-500 font-bold ml-2">
                                        {reviewRating === 5 ? 'Excellent! 🌟' :
                                         reviewRating === 4 ? 'Good! 👍' :
                                         reviewRating === 3 ? 'Okay 😐' :
                                         reviewRating === 2 ? 'Poor 🙁' :
                                         'Terrible 😡'}
                                    </span>
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Your Feedback</label>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Tell us what you liked or disliked about your stay..."
                                    rows={5}
                                    maxLength={1000}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                                    required
                                ></textarea>
                                <div className="text-right text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
                                    {reviewComment.length} / 1000 characters
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="flex-1 py-3.5 bg-cyan-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-cyan-500 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
                                >
                                    {submittingReview ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Review'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    disabled={submittingReview}
                                    className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-xs transition disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {bookingToCancel && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XMarkIcon className="w-12 h-12" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cancel Booking?</h2>
                            <p className="text-slate-500 mb-8">Are you sure you want to cancel booking <strong>#{bookingToCancel}</strong>? This action cannot be undone.</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmCancel}
                                    disabled={isCancelling}
                                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                                >
                                    {isCancelling ? 'Processing...' : 'Yes, Cancel Booking'}
                                </button>
                                <button
                                    onClick={() => setBookingToCancel(null)}
                                    disabled={isCancelling}
                                    className="w-full py-4 bg-white text-slate-500 border-2 border-slate-100 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

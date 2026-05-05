import { useState, useEffect, useMemo } from 'react';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, PencilSquareIcon, CheckCircleIcon, ExclamationCircleIcon, FunnelIcon } from '@heroicons/react/24/solid';
import { reviewsApi, type ReviewItem } from '../api/reviewsApi';
import { receptionApi } from '../api/receptionApi';
import { useAppAuth } from '../auth/useAppAuth';
import toast from 'react-hot-toast';
import { Spin } from 'antd';

interface RoomReviewSectionProps {
    roomTypeId: number;
    averageRating: number;
    reviewCount: number;
}

export function RoomReviewSection({ roomTypeId, averageRating, reviewCount }: RoomReviewSectionProps) {
    const { user, isAuthenticated } = useAppAuth();
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [isEligible, setIsEligible] = useState(false);
    const [eligibleBookingId, setEligibleBookingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

    const loadReviews = async () => {
        try {
            const data = await reviewsApi.getByRoomType(roomTypeId);
            setReviews(data);
        } catch (error) {
            console.error('Failed to load reviews', error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkEligibility = async () => {
        if (!isAuthenticated || !user) return;
        try {
            const history = await receptionApi.getMyHistory();
            const roomTypeBookings = history.filter(b => 
                b.status === 'CheckedOut' && 
                b.roomTypeIds?.includes(roomTypeId)
            );

            if (roomTypeBookings.length > 0) {
                // Fetch all reviews by this user to see if they've reviewed these bookings
                // Backend already returns user's pending reviews in getByRoomType
                const userReviews = reviews.filter(r => r.userId === user.id);
                const reviewedBookingIds = userReviews.map(r => r.bookingId).filter(id => id !== undefined) as number[];
                
                const unreviewedBooking = roomTypeBookings.find(b => !reviewedBookingIds.includes(b.id));
                
                if (unreviewedBooking) {
                    setIsEligible(true);
                    setEligibleBookingId(unreviewedBooking.id);
                } else {
                    setIsEligible(false);
                    setEligibleBookingId(null);
                }
            }
        } catch (error) {
            console.error('Failed to check review eligibility', error);
        }
    };

    useEffect(() => {
        loadReviews();
    }, [roomTypeId]);

    useEffect(() => {
        if (!isLoading) {
            checkEligibility();
        }
    }, [isLoading, reviews, isAuthenticated]);

    const filteredReviews = useMemo(() => {
        if (filterRating === null) return reviews;
        return reviews.filter(r => r.rating === filterRating);
    }, [reviews, filterRating]);

    const ratingDistribution = useMemo(() => {
        const dist = [0, 0, 0, 0, 0, 0]; // Index 1-5
        reviews.filter(r => r.isActive).forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++;
        });
        return dist;
    }, [reviews]);

    const handleEdit = (review: ReviewItem) => {
        setEditingReviewId(review.id);
        setRating(review.rating);
        setComment(review.comment || '');
        setShowForm(true);
        window.scrollTo({ top: document.getElementById('review-form')?.offsetTop ? document.getElementById('review-form')!.offsetTop - 100 : 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) {
            toast.error('Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            if (editingReviewId) {
                await reviewsApi.update(editingReviewId, { rating, comment });
                toast.success('Review updated successfully');
            } else {
                if (!eligibleBookingId) return;
                await reviewsApi.create({
                    roomTypeId,
                    bookingId: eligibleBookingId,
                    rating,
                    comment
                });
                toast.success('Review submitted for moderation');
            }
            setShowForm(false);
            setRating(5);
            setComment('');
            setEditingReviewId(null);
            loadReviews();
        } catch (error: any) {
            toast.error(error.response?.data || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return <div className="py-20 flex justify-center"><Spin /></div>;

    return (
        <div className="space-y-12">
            {/* Header & Stats */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Overall Rating */}
                    <div className="flex flex-col items-center justify-center text-center space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-8 lg:pb-0 lg:pr-12">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Overall Rating</h3>
                        <div className="text-7xl font-black text-slate-900 leading-none">{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</div>
                        <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                                s <= Math.round(averageRating) ? <StarIconSolid key={s} className="w-6 h-6" /> : <StarIcon key={s} className="w-6 h-6" />
                            ))}
                        </div>
                        <div className="text-slate-500 font-medium">{reviewCount} reviews</div>
                    </div>

                    {/* Distribution */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Review Breakdown</h3>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = ratingDistribution[star];
                            const percentage = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-4 group cursor-pointer" onClick={() => setFilterRating(filterRating === star ? null : star)}>
                                    <div className="w-12 text-sm font-bold text-slate-600 flex items-center gap-1">
                                        {star} <StarIconSolid className="w-3.5 h-3.5 text-amber-400" />
                                    </div>
                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-amber-400 rounded-full transition-all duration-1000" 
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-sm text-slate-400 text-right font-medium">
                                        {percentage.toFixed(0)}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Write Review Section */}
            {(isEligible || (reviews.some(r => r.userId === user?.id && r.canEdit))) && !showForm && (
                <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl shadow-cyan-900/20 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-2xl font-bold">Share your experience!</h3>
                        <p className="text-cyan-50/80">Your feedback helps us improve and helps others choose their perfect stay.</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)}
                        className="bg-white text-cyan-700 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-cyan-50 transition shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                        <PencilSquareIcon className="w-5 h-5" />
                        Write a Review
                    </button>
                </div>
            )}

            {/* Review Form */}
            {showForm && (
                <div id="review-form" className="bg-white rounded-3xl border-2 border-cyan-500 p-8 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900">{editingReviewId ? 'Edit Your Review' : 'New Review'}</h3>
                        <button onClick={() => { setShowForm(false); setEditingReviewId(null); }} className="text-slate-400 hover:text-slate-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Rating</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button 
                                        key={s} 
                                        type="button"
                                        onClick={() => setRating(s)}
                                        className="transition-transform active:scale-90"
                                    >
                                        {s <= rating ? (
                                            <StarIconSolid className="w-10 h-10 text-amber-400" />
                                        ) : (
                                            <StarIcon className="w-10 h-10 text-slate-200 hover:text-amber-200" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Experience</label>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[150px] transition"
                                placeholder="What did you like about this room? How was the service?"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                required
                            />
                        </div>

                        <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 items-start border border-amber-100">
                            <ExclamationCircleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Note: You can edit your review for up to 12 hours after submission. After that, it will be finalized and sent for admin approval.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-cyan-600 transition shadow-lg disabled:opacity-50"
                            >
                                {submitting ? <Spin /> : (editingReviewId ? 'Update Review' : 'Submit Review')}
                            </button>
                            <button 
                                type="button"
                                onClick={() => { setShowForm(false); setEditingReviewId(null); }}
                                className="px-8 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters & List */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        Guest Reviews
                        <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{reviews.length}</span>
                    </h3>

                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-slate-400" />
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setFilterRating(null)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filterRating === null ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All
                            </button>
                            {[5, 4, 3, 2, 1].map(star => (
                                <button 
                                    key={star}
                                    onClick={() => setFilterRating(star)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${filterRating === star ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {star} <StarIconSolid className="w-3 h-3" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredReviews.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center space-y-4">
                        <div className="text-4xl">💭</div>
                        <div className="text-lg font-bold text-slate-900">No reviews yet</div>
                        <p className="text-slate-500">Be the first to share your experience with this room!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredReviews.map((review) => (
                            <div key={review.id} className={`bg-white rounded-3xl border p-6 shadow-sm transition hover:shadow-md ${!review.isActive ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                            {review.userAvatarUrl ? (
                                                <img src={review.userAvatarUrl} alt={review.userName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-cyan-50 text-cyan-600 font-black text-xl">
                                                    {review.userName?.[0] || 'G'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                                {review.userName || 'Verified Guest'}
                                                {!review.isActive && (
                                                    <span className="text-[10px] font-black uppercase tracking-tighter bg-amber-400 text-white px-2 py-0.5 rounded-full">Pending</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                                <span>{review.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(review.createdAt)) : 'Recently'}</span>
                                                <span>•</span>
                                                <span className="text-cyan-600/70">Verified Stay</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex text-amber-400">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                s <= review.rating ? <StarIconSolid key={s} className="w-4 h-4" /> : <StarIcon key={s} className="w-4 h-4" />
                                            ))}
                                        </div>
                                        {review.canEdit && (
                                            <button 
                                                onClick={() => handleEdit(review)}
                                                className="text-xs font-bold text-cyan-600 hover:text-cyan-700 underline underline-offset-4 flex items-center gap-1"
                                            >
                                                <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 text-slate-600 leading-relaxed text-sm">
                                    {review.comment}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

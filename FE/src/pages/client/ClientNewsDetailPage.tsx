import { useState, useEffect } from 'react';
import DOMPurify from "dompurify";
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CalendarDaysIcon, TagIcon, ArrowLeftIcon, ShareIcon, BookmarkIcon, UserIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { articleService } from '../../modules/article/services/articleService';
import type { ArticleItem } from '../../modules/article/types/article.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}



// ─── Component ───────────────────────────────────────────────────────────────

export function ClientNewsDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [article, setArticle] = useState<ArticleItem | null>(null);
    const [related, setRelated] = useState<ArticleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        setNotFound(false);
        setArticle(null);
        setRelated([]);

        // Gọi song song 2 API để tăng tốc
        Promise.all([
            articleService.getById(Number(id)),
            articleService.getAll(),
        ])
            .then(([data, all]) => {
                setArticle(data);
                const rel = all.filter(a =>
                    a.id !== data.id &&
                    a.isActive &&
                    a.categories.some(c => data.categories.some(dc => dc.id === c.id))
                ).slice(0, 3);
                setRelated(rel);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center pt-[88px]">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Not Found ────────────────────────────────────────────────────────────
    if (notFound || !article) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-500 pt-[88px]">
                <p className="text-2xl font-bold mb-4">Bài viết không tồn tại</p>
                <button
                    onClick={() => navigate('/news')}
                    className="flex items-center gap-2 text-cyan-600 font-bold hover:underline"
                >
                    <ArrowLeftIcon className="w-4 h-4" /> Quay lại trang tin tức
                </button>
            </div>
        );
    }

    // ── Detail ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full bg-[#f8fafc] text-slate-800 pb-24 font-sans min-h-screen">
            {/* ── Hero Image ──────────────────────────────────────────── */}
            <div className="relative h-[280px] md:h-[360px] overflow-hidden bg-slate-200 flex items-center justify-center">
                {article.thumbnailUrl ? (
                    <img
                        src={article.thumbnailUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <PhotoIcon className="w-20 h-20 text-slate-400" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/20" />

                {/* Back Button */}
                <div className="absolute top-64 left-6 md:left-16 z-20">
                    <button
                        onClick={() => navigate('/news')}
                        className="flex items-center gap-2 text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 transition-all"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> Back to News
                    </button>
                </div>

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 z-10 max-w-[900px] mx-auto px-6 pb-10">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {article.categories.map(c => (
                            <span key={c.id} className="bg-slate-800 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                                {c.name}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                        {article.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
                        <span className="flex items-center gap-1">
                            <UserIcon className="w-4 h-4" /> {article.authorName || 'Grandeur Hotel'}
                        </span>
                        <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-4 h-4" /> {formatDate(article.createdAt)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Article Body ────────────────────────────────────────── */}
            <div className="max-w-[860px] mx-auto px-6 sm:px-8 py-14">

                {/* Meta bar */}
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-200">
                    <div className="flex flex-wrap gap-2">
                        {article.categories.map(c => (
                            <span key={c.id} className="px-3 py-1.5 rounded-full text-xs font-bold border border-cyan-200 bg-cyan-50 text-cyan-700 tracking-wider">
                                {c.name}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-600 transition-colors uppercase tracking-wider">
                            <ShareIcon className="w-4 h-4" /> Share
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-600 transition-colors uppercase tracking-wider">
                            <BookmarkIcon className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>

                {/* Content từ rich text editor của admin */}
                {article.subtitle && (
                    <div className="mb-12 border-l-4 border-cyan-500 pl-6 py-2">
                        <p className="text-xl md:text-2xl font-semibold text-slate-700 italic leading-relaxed">
                            {article.subtitle}
                        </p>
                    </div>
                )}

                <div
                    className="prose prose-slate max-w-none
                        prose-headings:font-extrabold prose-headings:text-slate-900
                        prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                        prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-base
                        prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-sm prose-img:w-full prose-img:shadow-md
                        prose-blockquote:border-l-cyan-500 prose-blockquote:text-slate-600
                        prose-strong:text-slate-900
                        prose-ul:text-slate-700 prose-ol:text-slate-700
                        prose-li:my-1 mb-16"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Related Attractions Section */}
                {article.attractions && article.attractions.length > 0 && (
                    <div className="mb-16 pt-12 border-t border-slate-200">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-8 h-px bg-cyan-500"></span>
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Recommended Nearby</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {article.attractions.map((attr) => (
                                <div key={attr.id} className="flex gap-5 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                    {attr.imageUrl && (
                                        <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-xl">
                                            <img src={attr.imageUrl} alt={attr.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex flex-col justify-center">
                                        <h4 className="font-bold text-slate-900 text-base mb-1">{attr.name}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{attr.description}</p>
                                        {attr.distanceKm && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-600 bg-cyan-50 w-fit px-2 py-0.5 rounded">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {attr.distanceKm} km from hotel
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tags */}
                <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap gap-2">
                    {article.categories.map(c => (
                        <span key={c.id} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition-colors">
                            #{c.name.replace(/\s/g, '')}
                        </span>
                    ))}
                </div>

                {/* Author box */}
                {article.authorName && (
                    <div className="mt-10 p-6 bg-slate-50 border border-slate-200 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="w-7 h-7 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Written by</p>
                            <p className="text-base font-extrabold text-slate-900">{article.authorName}</p>
                            <p className="text-sm text-slate-500 mt-1">The Grandeur Hotel Editorial Team</p>
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="mt-14 bg-slate-900 p-10 text-center">
                    <span className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-xs block mb-3">Experience The Grandeur</span>
                    <h3 className="text-2xl font-extrabold text-white mb-4">Ready to Book Your Stay?</h3>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                        Enjoy exclusive perks and the best guaranteed rates when you book directly with us.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/rooms"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 font-bold uppercase tracking-widest text-xs transition-all"
                        >
                            Book Now
                        </Link>
                        <button
                            onClick={() => navigate('/news')}
                            className="border border-white/30 hover:border-white text-white px-8 py-3 font-bold uppercase tracking-widest text-xs transition-all hover:bg-white/10"
                        >
                            More Articles
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Related Articles ─────────────────────────────────────── */}
            {related.length > 0 && (
                <div className="max-w-[1200px] mx-auto px-6 sm:px-8 mt-4 pb-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-px bg-cyan-500" />
                        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-[0.25em]">Related Articles</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {related.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    window.scrollTo(0, 0);
                                    navigate(`/news/${item.id}`);
                                }}
                                className="bg-white group overflow-hidden flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-transparent hover:-translate-y-1 cursor-pointer"
                            >
                                <div className="relative h-44 overflow-hidden">
                                    <img
                                        src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'}
                                        alt={item.title}
                                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                    />
                                    {item.categories[0] && (
                                        <div className="absolute top-3 left-3 px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-slate-800 text-white">
                                            {item.categories[0].name}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <CalendarDaysIcon className="w-3 h-3" /> {formatDate(item.createdAt)}
                                    </p>
                                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-cyan-700 transition-colors line-clamp-2 mb-3">
                                        {item.title}
                                    </h3>
                                    <span className="mt-auto text-[10px] font-bold uppercase tracking-widest text-cyan-600">
                                        Read Article →
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}   
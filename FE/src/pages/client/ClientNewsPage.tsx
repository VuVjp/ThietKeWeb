import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from "dompurify";
import { CalendarDaysIcon, TagIcon, ArrowRightIcon, MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { articleService } from '../../modules/article/services/articleService';
import type { ArticleItem } from '../../modules/article/types/article.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}



function stripHtml(html: string) {
    return html?.replace(/<[^>]*>/g, '') ?? '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientNewsPage() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState<ArticleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        articleService.getAll()
            .then(data => setArticles(data.filter(a => a.isActive)))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Reset page when filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, searchQuery]);

    // Lấy danh sách categories từ data thật
    const allCategories = ['All', ...Array.from(new Set(
        articles.flatMap(a => a.categories.map(c => c.name))
    ))];

    // Lọc tất cả bài viết theo category và search
    const allFiltered = articles
        .filter(a => activeCategory === 'All' || a.categories.some(c => c.name === activeCategory))
        .filter(a =>
            searchQuery === '' ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stripHtml(a.content).toLowerCase().includes(searchQuery.toLowerCase())
        );

    // Tính toán phân trang
    const totalPages = Math.ceil(allFiltered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedArticles = allFiltered.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="w-full bg-[#f8fafc] text-slate-800 pb-24 font-sans min-h-screen">

            {/* ── Hero Banner ─────────────────────────────────────────── */}
            <div className="relative pt-[48px] overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="News Banner"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90" />
                </div>
                <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-20 text-center">
                    <span className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-xs mb-4 block">
                        The Grandeur Journal
                    </span>
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
                        News, Stories &<br />
                        <span className="text-cyan-400 italic font-light">Exclusive Offers</span>
                    </h1>
                    <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto mt-4">
                        Stay in the know — from hotel milestones and promotions to local travel guides and community stories.
                    </p>

                </div>
            </div>

            {/* ── Loading / Empty ──────────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 mt-16">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        
                        {/* ── MAIN CONTENT (Left side) ───────────────────────── */}
                        <div className="lg:col-span-8 space-y-12">
                            {paginatedArticles.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                    <p className="text-slate-500 italic">No articles found matching your criteria.</p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    {paginatedArticles.map((item) => (
                                        <div 
                                            key={item.id} 
                                            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 flex flex-col md:flex-row group"
                                        >
                                            {/* Article Image */}
                                            <div 
                                                className="w-full md:w-[320px] h-[240px] flex-shrink-0 overflow-hidden cursor-pointer bg-slate-100 flex items-center justify-center"
                                                onClick={() => navigate(`/news/${item.id}`)}
                                            >
                                                {item.thumbnailUrl ? (
                                                    <img
                                                        src={item.thumbnailUrl}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <PhotoIcon className="w-12 h-12 text-slate-300" />
                                                )}
                                            </div>

                                            {/* Article Content */}
                                            <div className="p-8 flex flex-col justify-center flex-1">
                                                <div className="flex items-center gap-3 text-[10px] text-cyan-600 font-bold uppercase tracking-wider mb-3">
                                                    <span>{formatDate(item.createdAt)}</span>
                                                </div>
                                                
                                                <h2 
                                                    className="text-2xl font-bold text-slate-900 mb-3 cursor-pointer hover:text-cyan-700 transition-colors line-clamp-2"
                                                    onClick={() => navigate(`/news/${item.id}`)}
                                                >
                                                    {item.title}
                                                </h2>

                                                {item.subtitle && (
                                                    <p className="text-slate-500 font-medium text-sm mb-4 line-clamp-2">
                                                        {item.subtitle}
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.categories.slice(0, 2).map(c => (
                                                            <span key={c.id} className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded border border-slate-100">
                                                                {c.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={() => navigate(`/news/${item.id}`)} 
                                                        className="text-cyan-600 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 hover:gap-2 transition-all"
                                                    >
                                                        Read More <ArrowRightIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-10">
                                            <button
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.max(1, prev - 1));
                                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === 1}
                                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                                            >
                                                Prev
                                            </button>
                                            
                                            <div className="flex gap-2">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => {
                                                            setCurrentPage(page);
                                                            window.scrollTo({ top: 400, behavior: 'smooth' });
                                                        }}
                                                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm
                                                            ${currentPage === page 
                                                                ? 'bg-cyan-600 text-white shadow-cyan-100' 
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                                }}
                                                disabled={currentPage === totalPages}
                                                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── SIDEBAR (Right side) ───────────────────────────── */}
                        <aside className="lg:col-span-4 space-y-10">
                            
                            {/* Search Widget */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-cyan-600" /> Search
                                </h3>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Type keywords..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            {/* Categories Widget */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <TagIcon className="w-5 h-5 text-cyan-600" /> Categories
                                    </h3>
                                </div>
                                
                                {/* Inner Search for Categories */}
                                <div className="relative mb-4">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search category..."
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border-transparent focus:bg-white focus:border-cyan-500 focus:ring-0 rounded-lg transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                    {allCategories
                                        .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                                        .map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setActiveCategory(cat)}
                                                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all
                                                    ${activeCategory === cat 
                                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-100' 
                                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                                            >
                                                <span>{cat}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {cat === 'All' ? articles.length : articles.filter(a => a.categories.some(c => c.name === cat)).length}
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            </div>

                            {/* Featured/Popular Posts Widget */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-cyan-600 rounded-full animate-pulse"></span> Featured News
                                </h3>
                                <div className="space-y-6">
                                    {articles.slice(0, 4).map(item => (
                                        <div 
                                            key={item.id} 
                                            className="flex gap-4 group cursor-pointer"
                                            onClick={() => navigate(`/news/${item.id}`)}
                                        >
                                            <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                                                <img 
                                                    src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=200&q=80'} 
                                                    alt={item.title} 
                                                    className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                                                />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <h4 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-cyan-700 transition-colors mb-1">
                                                    {item.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 font-medium">{formatDate(item.createdAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
}
import type { ArticleItem } from '../types/article.types';

interface ArticlePreviewPanelProps {
    article: Partial<ArticleItem> & { title: string; content: string };
}

export function ArticlePreviewPanel({ article }: ArticlePreviewPanelProps) {
    const formattedDate = article.createdAt
        ? new Date(article.createdAt).toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
          })
        : new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });

    return (
        <div className="w-full bg-[#f8fafc] text-slate-800 pb-12 font-sans min-h-screen">
            {/* ── Hero Image (Matching ClientNewsDetailPage) ──────────────── */}
            <div className="relative h-[240px] md:h-[300px] overflow-hidden">
                <img
                    src={article.thumbnailUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80'}
                    alt={article.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/20" />

                {/* Hero Content */}
                <div className="absolute bottom-0 left-0 right-0 z-10 max-w-[800px] mx-auto px-6 pb-8">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {article.categories?.map(c => (
                            <span key={c.id} className="bg-slate-800 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                                {c.name}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-xl md:text-3xl font-extrabold text-white leading-tight mb-3">
                        {article.title || 'Untitled Article'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-300 font-medium">
                        <span className="flex items-center gap-1">
                             {article.authorName || 'Grandeur Hotel'}
                        </span>
                        <span className="flex items-center gap-1">
                            {formattedDate}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Article Body ────────────────────────────────────────── */}
            <div className="max-w-[760px] mx-auto px-6 py-10">
                
                {/* Subtitle */}
                {article.subtitle && (
                    <div className="mb-10 border-l-4 border-cyan-500 pl-5 py-1">
                        <p className="text-lg md:text-xl font-semibold text-slate-700 italic leading-relaxed">
                            {article.subtitle}
                        </p>
                    </div>
                )}

                {/* Content */}
                <div
                    className="prose prose-slate max-w-none
                        prose-headings:font-extrabold prose-headings:text-slate-900
                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                        prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-sm
                        prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-sm prose-img:w-full prose-img:shadow-md
                        prose-blockquote:border-l-cyan-500 prose-blockquote:text-slate-600
                        prose-strong:text-slate-900
                        prose-ul:text-slate-700 prose-ol:text-slate-700
                        prose-li:my-1 mb-12"
                    dangerouslySetInnerHTML={{ __html: article.content || '<p><em>No content yet.</em></p>' }}
                />

                {/* Related Attractions Section */}
                {article.attractions && article.attractions.length > 0 && (
                    <div className="mt-12 pt-10 border-t border-slate-200">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-6 h-px bg-cyan-500"></span>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Recommended Nearby</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {article.attractions.map((attr) => (
                                <div key={attr.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                                    {attr.imageUrl && (
                                        <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                                            <img src={attr.imageUrl} alt={attr.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex flex-col justify-center">
                                        <h4 className="font-bold text-slate-900 text-sm mb-0.5">{attr.name}</h4>
                                        <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed">{attr.description}</p>
                                        {attr.distanceKm && (
                                            <div className="text-[9px] font-bold text-cyan-600 mt-1 uppercase tracking-tight">
                                                {attr.distanceKm} km from hotel
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

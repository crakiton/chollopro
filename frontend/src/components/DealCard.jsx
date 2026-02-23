import React, { useState } from 'react';
import { ExternalLink, MapPin, Truck, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DealCard({ deal }) {
    const [showTooltip, setShowTooltip] = useState(false);

    const getScoreColor = (score) => {
        if (score >= 8) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (score >= 6) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden hover:border-blue-500/50 transition-all duration-300 group flex flex-col">
            <div className="relative h-48 overflow-hidden bg-slate-900 border-b border-slate-700">
                {deal.photo_url ? (
                    <img
                        src={deal.photo_url}
                        alt={deal.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                        Sin imagen
                    </div>
                )}
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full border backdrop-blur-md font-bold flex items-center gap-1 ${getScoreColor(deal.score)}`}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}>
                    <Bot className="w-4 h-4" />
                    {deal.score}/10
                </div>

                {/* Tooltip for AI Reason */}
                {showTooltip && (
                    <div className="absolute top-12 right-3 w-64 bg-slate-900 border border-slate-600 p-3 rounded-lg shadow-xl z-10 text-sm text-slate-300 animate-in fade-in zoom-in duration-200">
                        <p className="font-semibold text-blue-400 mb-1">Análisis IA:</p>
                        {deal.reason}
                    </div>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-slate-100 line-clamp-2 leading-tight flex-1 mr-3">
                        {deal.title}
                    </h3>
                    <span className="text-xl font-bold text-white bg-blue-600 px-3 py-1 rounded-lg">
                        {deal.price}€
                    </span>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between text-sm text-slate-400">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate max-w-[120px]">{deal.location || 'Desconocida'}</span>
                        </div>
                        {deal.has_shipping && (
                            <div className="flex items-center gap-1.5 text-blue-400">
                                <Truck className="w-4 h-4" />
                                <span>Con envío</span>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <span className="text-xs opacity-75 block mb-2">
                            Hace {formatDistanceToNow(new Date(deal.created_at), { locale: es })}
                        </span>
                        <a
                            href={deal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                        >
                            Ver oferta
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

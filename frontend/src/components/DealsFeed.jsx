import React, { useState } from 'react';
import DealCard from './DealCard';
import { Filter } from 'lucide-react';

export default function DealsFeed({ deals }) {
    const [minScoreFilter, setMinScoreFilter] = useState(0);
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week

    const filteredDeals = deals.filter(deal => {
        if (deal.score < minScoreFilter) return false;

        if (dateFilter !== 'all') {
            const today = new Date();
            const dealDate = new Date(deal.created_at);
            if (dateFilter === 'today') {
                today.setHours(0, 0, 0, 0);
                if (dealDate < today) return false;
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (dealDate < weekAgo) return false;
            }
        }
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <Filter className="w-5 h-5 text-blue-400" />
                    Filtros rápidos
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={minScoreFilter}
                        onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    >
                        <option value={0}>Todos los scores</option>
                        <option value={7}>Score 7+ (Buenos)</option>
                        <option value={8}>Score 8+ (Muy buenos)</option>
                        <option value={9}>Score 9+ (Legendarios)</option>
                    </select>

                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    >
                        <option value="all">Todas las fechas</option>
                        <option value="today">Hoy</option>
                        <option value="week">Última semana</option>
                    </select>
                </div>
            </div>

            {filteredDeals.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                    <p className="text-slate-400 text-lg">No hay chollos que coincidan con los filtros todavía.</p>
                    <p className="text-slate-500 text-sm mt-2">El scraper corre cada 15 minutos ⏳</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} />
                    ))}
                </div>
            )}
        </div>
    );
}

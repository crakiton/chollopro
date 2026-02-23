import React from 'react';
import { Target, TrendingUp, Award } from 'lucide-react';

export default function StatsBar({ deals }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysDeals = deals.filter(deal => new Date(deal.created_at) >= today);
    const totalToday = todaysDeals.length;

    const avgScore = totalToday > 0
        ? (todaysDeals.reduce((acc, deal) => acc + deal.score, 0) / totalToday).toFixed(1)
        : 0;

    let bestDeal = null;
    if (todaysDeals.length > 0) {
        bestDeal = todaysDeals.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg flex items-center gap-4">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Chollos Hoy</p>
                    <p className="text-2xl font-bold text-slate-100">{totalToday}</p>
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Nota Media</p>
                    <p className="text-2xl font-bold text-slate-100">{avgScore} <span className="text-sm text-slate-500">/10</span></p>
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg flex items-center gap-4">
                <div className="bg-amber-500/10 p-3 rounded-lg">
                    <Award className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Mejor Deal</p>
                    {bestDeal ? (
                        <div className="truncate text-slate-100 font-medium">
                            <span className="text-amber-400 font-bold mr-1">{bestDeal.score}/10</span>
                            {bestDeal.title}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm">Sin datos hoy</p>
                    )}
                </div>
            </div>
        </div>
    );
}

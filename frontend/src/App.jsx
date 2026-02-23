import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Settings, RefreshCw, Flame } from 'lucide-react';
import DealsFeed from './components/DealsFeed';
import StatsBar from './components/StatsBar';
import ConfigPanel from './components/ConfigPanel';

function App() {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchDeals = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('deals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (data) {
            setDeals(data);
            setLastUpdated(new Date());
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDeals();

        // Auto refresh every 2 minutes
        const interval = setInterval(() => {
            fetchDeals();
        }, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen relative flex">
            {/* Config Panel overlay and container */}
            <ConfigPanel isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />

            {/* Overlay background when config is open on mobile */}
            {isConfigOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setIsConfigOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-300">

                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 bg-slate-800/30 p-4 sm:p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl bg-gradient-to-br from-orange-400 to-rose-500 bg-clip-text text-transparent transform hover:scale-110 transition-transform">🔥</span>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white m-0">
                                CholloPro
                            </h1>
                            <p className="text-sm text-slate-400 font-medium">Auto-Scraper IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Última act.</p>
                            <div className="flex items-center gap-1.5 text-sm text-slate-200">
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : 'text-slate-500'}`} />
                                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsConfigOpen(true)}
                            className="bg-slate-700 hover:bg-slate-600 active:bg-slate-600 text-white p-2.5 rounded-xl transition-all hover:shadow-lg flex items-center gap-2 border border-slate-600"
                        >
                            <Settings className="w-5 h-5 text-blue-400" />
                            <span className="font-medium sm:hidden">Ajustes</span>
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="space-y-8 animate-in fade-in duration-500">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4 hidden sm:block">Resumen</h2>
                        <StatsBar deals={deals} />
                    </section>

                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                Feed de Chollos
                            </h2>
                            <button
                                onClick={fetchDeals}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                <span>Actualizar ahora</span>
                            </button>
                        </div>

                        {loading && deals.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center bg-slate-800/20 rounded-2xl border border-slate-800 border-dashed">
                                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                                <p className="text-slate-400 font-medium">Cargando chollos...</p>
                            </div>
                        ) : (
                            <DealsFeed deals={deals} />
                        )}
                    </section>
                </div>

            </main>
        </div>
    );
}

export default App;

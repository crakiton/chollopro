import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Settings2, X, AlertCircle } from 'lucide-react';

export default function ConfigPanel({ isOpen, onClose }) {
    const [config, setConfig] = useState({
        keyword: 'iphone 13',
        category: 'technology',
        min_price: 0,
        max_price: 300,
        location_mode: 'shipping',
        city: 'Madrid',
        radius_km: 50,
        min_score: 7
    });
    const [configId, setConfigId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        const { data, error } = await supabase.from('config').select('*').limit(1);
        if (data && data.length > 0) {
            setConfigId(data[0].id);
            setConfig({
                keyword: data[0].keyword || '',
                category: data[0].category || 'technology',
                min_price: data[0].min_price || 0,
                max_price: data[0].max_price || 300,
                location_mode: data[0].location_mode || 'shipping',
                city: data[0].city || '',
                radius_km: data[0].radius_km || 50,
                min_score: data[0].min_score || 7
            });
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' || type === 'range' ? Number(value) : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const { data: existingData, error: fetchError } = await supabase.from('config').select('id').limit(1);

            if (fetchError) throw fetchError;

            if (existingData && existingData.length > 0) {
                const { error: updateError } = await supabase.from('config').update({ ...config, updated_at: new Date() }).eq('id', existingData[0].id);
                if (updateError) throw updateError;
                setConfigId(existingData[0].id);
            } else {
                const { data: insertData, error: insertError } = await supabase.from('config').insert({ ...config }).select();
                if (insertError) throw insertError;
                if (insertData && insertData.length > 0) setConfigId(insertData[0].id);
            }
            setMessage('✅ Configuración guardada');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Save config error:", error);
            setMessage('❌ Error al guardar config');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 left-0 w-full md:w-96 bg-slate-900 border-r border-slate-700 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Settings2 className="text-blue-400" />
                    Ajustes de Búsqueda
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                <form onSubmit={handleSave} className="space-y-6">

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Palabra Clave</label>
                        <input
                            type="text"
                            name="keyword"
                            value={config.keyword}
                            onChange={handleChange}
                            placeholder="Ej: macbook pro m2"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Categoría</label>
                        <select
                            name="category"
                            value={config.category}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="technology">Tecnología y Electrónica</option>
                            <option value="fashion">Moda y Accesorios</option>
                            <option value="motor">Motor</option>
                            <option value="home">Hogar y Jardín</option>
                            <option value="sports">Deporte y Ocio</option>
                            <option value="videogames">Consolas y Videojuegos</option>
                            <option value="others">Otros</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Precio Min (€)</label>
                            <input type="number" name="min_price" value={config.min_price} onChange={handleChange} min="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Precio Max (€)</label>
                            <input type="number" name="max_price" value={config.max_price} onChange={handleChange} min="0" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-sm font-medium text-slate-200 mb-3">Ubicación y Envío</h3>
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 mb-4">
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, location_mode: 'shipping' })}
                                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${config.location_mode === 'shipping' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Solo con envío
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, location_mode: 'city_radius' })}
                                className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${config.location_mode === 'city_radius' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Ciudad y radio
                            </button>
                        </div>

                        {config.location_mode === 'city_radius' && (
                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Ciudad</label>
                                    <input type="text" name="city" value={config.city} onChange={handleChange} placeholder="Ej: Madrid" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <div className="flex justify-between">
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Radio</label>
                                        <span className="text-blue-400 text-sm">{config.radius_km} km</span>
                                    </div>
                                    <input type="range" name="radius_km" value={config.radius_km} onChange={handleChange} min="10" max="500" step="10" className="w-full accent-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-300">Score Min IA</label>
                            <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">{config.min_score}/10</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 block">Solo se guardarán ofertas con nota igual o superior.</p>
                        <input type="range" name="min_score" value={config.min_score} onChange={handleChange} min="1" max="10" step="1" className="w-full accent-emerald-500" />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'}`}>
                            {message}
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Configuración
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-slate-500 mt-3 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            El scraper lee estos datos cada 15 min.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

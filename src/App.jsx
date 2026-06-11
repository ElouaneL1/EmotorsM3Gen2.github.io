import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Settings, BarChart2, Calendar, Clock, AlertTriangle, CheckCircle, Download, Maximize2, Minimize2, ShieldAlert } from 'lucide-react';
import { format, parseISO, subDays, isAfter } from 'date-fns';

const DEFAULT_SETTINGS = {
  cipg: { target: 14.5, tolerance: 5, unit: 'g' },
  gapFiller1: { target: 1.2, tolerance: 10, unit: 'g' },
  gapFiller2: { target: 1.2, tolerance: 10, unit: 'g' },
  potting: { target: 10.2, tolerance: 10, unit: 'g' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('daily');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('emotors-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('emotors-history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('emotors-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('emotors-history', JSON.stringify(history));
  }, [history]);

  const addEntry = (entry) => {
    setHistory([...history, { ...entry, id: Date.now().toString(), timestamp: new Date().toISOString() }]);
    alert("Données enregistrées avec succès !");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-8 h-8 text-blue-400" />
              <h1 className="text-xl font-bold tracking-wide">PDS Digital - Onduleurs m3gen 2</h1>
            </div>
            <div className="flex space-x-1">
              <TabButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} icon={Clock} label="Quotidiens" />
              <TabButton active={activeTab === 'periodic'} onClick={() => setActiveTab('periodic')} icon={Calendar} label="Périodiques" />
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={BarChart2} label="Dashboard" />
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Paramètres" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'daily' && <DailyControls settings={settings} onSave={addEntry} />}
        {activeTab === 'periodic' && <PeriodicControls onSave={addEntry} />}
        {activeTab === 'dashboard' && <Dashboard history={history} settings={settings} />}
        {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} history={history} />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function DailyControls({ settings, onSave }) {
  const [weights, setWeights] = useState({ cipg: '', gapFiller1: '', gapFiller2: '', potting: '' });
  const [visuals, setVisuals] = useState({
    ecrasementGf1: null, ecrasementGf2: null,
    aoiMasterOk: null, aoiMasterNok: null
  });
  const [nokReasons, setNokReasons] = useState({});

  const handleWeightChange = (key, val) => setWeights(p => ({ ...p, [key]: val }));
  
  const handleVisualChange = (key, status) => {
    setVisuals(p => ({ ...p, [key]: status }));
    if (status === 'OK') {
      setNokReasons(p => { const newR = {...p}; delete newR[key]; return newR; });
    }
  };

  const handleReasonChange = (key, reason) => setNokReasons(p => ({ ...p, [key]: reason }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate alert
    const hasNok = Object.values(visuals).includes('NOK');
    if (hasNok) {
      alert("⚠️ ALERTE CHEF D'ÉQUIPE : Une ou plusieurs non-conformités ont été détectées.");
    }
    
    onSave({
      type: 'daily',
      weights: {
        cipg: parseFloat(weights.cipg) || 0,
        gapFiller1: parseFloat(weights.gapFiller1) || 0,
        gapFiller2: parseFloat(weights.gapFiller2) || 0,
        potting: parseFloat(weights.potting) || 0,
      },
      visuals,
      nokReasons
    });
    setWeights({ cipg: '', gapFiller1: '', gapFiller2: '', potting: '' });
    setVisuals({ ecrasementGf1: null, ecrasementGf2: null, aoiMasterOk: null, aoiMasterNok: null });
    setNokReasons({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm mr-3">1</span>
          Pesées de contrôle (Matière)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WeightInput label="CIPG" valKey="cipg" val={weights.cipg} onChange={handleWeightChange} config={settings.cipg} />
          <WeightInput label="Gap-filler Station 1" valKey="gapFiller1" val={weights.gapFiller1} onChange={handleWeightChange} config={settings.gapFiller1} />
          <WeightInput label="Gap-filler Station 2" valKey="gapFiller2" val={weights.gapFiller2} onChange={handleWeightChange} config={settings.gapFiller2} />
          <WeightInput label="Potting" valKey="potting" val={weights.potting} onChange={handleWeightChange} config={settings.potting} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm mr-3">2</span>
          Contrôles Visuels & Process
        </h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-700 border-b pb-2">PDS Écrasement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VisualControl label="Gap-filler 1" valKey="ecrasementGf1" status={visuals.ecrasementGf1} onChange={handleVisualChange} reason={nokReasons.ecrasementGf1} onReasonChange={handleReasonChange} />
              <VisualControl label="Gap-filler 2" valKey="ecrasementGf2" status={visuals.ecrasementGf2} onChange={handleVisualChange} reason={nokReasons.ecrasementGf2} onReasonChange={handleReasonChange} />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-700 border-b pb-2">Caméra AOI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VisualControl label="Master OK (Vérifie la bonne détection)" valKey="aoiMasterOk" status={visuals.aoiMasterOk} onChange={handleVisualChange} reason={nokReasons.aoiMasterOk} onReasonChange={handleReasonChange} />
              <VisualControl label="Master NOK (Vérifie le rejet d'anomalie)" valKey="aoiMasterNok" status={visuals.aoiMasterNok} onChange={handleVisualChange} reason={nokReasons.aoiMasterNok} onReasonChange={handleReasonChange} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all flex items-center">
          <CheckCircle className="mr-2 w-5 h-5" />
          Valider le contrôle quotidien
        </button>
      </div>
    </form>
  );
}

function WeightInput({ label, valKey, val, onChange, config }) {
  const min = (config.target * (1 - config.tolerance / 100)).toFixed(2);
  const max = (config.target * (1 + config.tolerance / 100)).toFixed(2);
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          required
          value={val}
          onChange={e => onChange(valKey, e.target.value)}
          className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          placeholder={`Cible: ${config.target}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-slate-500 sm:text-sm">{config.unit}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Cible: {config.target}{config.unit} (Tol: ±{config.tolerance}%) | Plage: [{min} - {max}]
      </p>
    </div>
  );
}

function VisualControl({ label, valKey, status, onChange, reason, onReasonChange }) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-slate-800">{label}</span>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onChange(valKey, 'OK')}
            className={`px-4 py-1.5 rounded-md font-bold text-sm transition-colors ${status === 'OK' ? 'bg-green-500 text-white shadow-inner' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => onChange(valKey, 'NOK')}
            className={`px-4 py-1.5 rounded-md font-bold text-sm transition-colors ${status === 'NOK' ? 'bg-red-500 text-white shadow-inner' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
          >
            NOK
          </button>
        </div>
      </div>
      {status === 'NOK' && (
        <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
          <label className="block text-xs font-medium text-red-700 mb-1 flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Raison de la non-conformité
          </label>
          <textarea
            required
            value={reason || ''}
            onChange={e => onReasonChange(valKey, e.target.value)}
            className="w-full p-2 border border-red-300 rounded-md focus:ring-red-500 focus:border-red-500 shadow-sm text-sm"
            rows="2"
            placeholder="Décrivez le défaut..."
          />
        </div>
      )}
    </div>
  );
}

function PeriodicControls({ onSave }) {
  const [radiometers, setRadiometers] = useState({
    rad1: ['', '', ''],
    rad2: ['', '', ''],
    rad3: ['', '', '']
  });

  const handleChange = (rad, index, val) => {
    const newRad = [...radiometers[rad]];
    newRad[index] = val;
    setRadiometers({ ...radiometers, [rad]: newRad });
  };

  const calculateTotal = (vals) => {
    return vals.reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      type: 'uv',
      totals: {
        rad1: parseFloat(calculateTotal(radiometers.rad1)),
        rad2: parseFloat(calculateTotal(radiometers.rad2)),
        rad3: parseFloat(calculateTotal(radiometers.rad3)),
      }
    });
    setRadiometers({ rad1: ['', '', ''], rad2: ['', '', ''], rad3: ['', '', ''] });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Contrôles UV (Mardi et Jeudi)</h2>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Périodique
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-6">Saisissez les 3 mesures successives en Joules (J) pour chaque radiomètre. L'addition est automatique.</p>
      
      <div className="space-y-6">
        {['rad1', 'rad2', 'rad3'].map((rad, i) => (
          <div key={rad} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-3">Radiomètre {i + 1}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {[0, 1, 2].map(idx => (
                <div key={idx}>
                  <label className="block text-xs text-slate-500 mb-1">Mesure {idx + 1} (J)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={radiometers[rad][idx]}
                    onChange={e => handleChange(rad, idx, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              ))}
              <div className="bg-blue-50 rounded-md p-3 border border-blue-200 text-center sm:mt-5">
                <span className="block text-xs text-blue-600 font-semibold mb-1">Total (J)</span>
                <span className="text-xl font-bold text-blue-900">{calculateTotal(radiometers[rad])}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all">
          Enregistrer les mesures UV
        </button>
      </div>
    </form>
  );
}

function Dashboard({ history, settings }) {
  const [timeRange, setTimeRange] = useState('30days'); // '30days' or 'all'
  const [fullscreenChart, setFullscreenChart] = useState(null);

  const filteredHistory = useMemo(() => {
    if (timeRange === 'all') return history;
    const cutoff = subDays(new Date(), 30);
    return history.filter(item => isAfter(parseISO(item.timestamp), cutoff));
  }, [history, timeRange]);

  const dailyData = filteredHistory.filter(h => h.type === 'daily').map(h => ({
    date: format(parseISO(h.timestamp), 'dd/MM HH:mm'),
    ...h.weights
  }));

  const uvData = filteredHistory.filter(h => h.type === 'uv').map(h => ({
    date: format(parseISO(h.timestamp), 'dd/MM'),
    ...h.totals
  }));

  const renderLineChart = (dataKey, label, config) => {
    const min = config.target * (1 - config.tolerance / 100);
    const max = config.target * (1 + config.tolerance / 100);
    const yMin = min * 0.9;
    const yMax = max * 1.1;

    const chartContent = (
      <ResponsiveContainer width="100%" height={fullscreenChart === dataKey ? "90%" : 250}>
        <LineChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <ReferenceLine y={config.target} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'top', value: 'Cible', fill: '#3b82f6', fontSize: 12 }} />
          <ReferenceLine y={min} stroke="#ef4444" label={{ position: 'bottom', value: 'Min', fill: '#ef4444', fontSize: 12 }} />
          <ReferenceLine y={max} stroke="#ef4444" label={{ position: 'top', value: 'Max', fill: '#ef4444', fontSize: 12 }} />
          <Line type="monotone" dataKey={dataKey} name={label} stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    );

    if (fullscreenChart === dataKey) {
      return (
        <div className="fixed inset-0 z-50 bg-white p-8 flex flex-col animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{label} - Vue détaillée</h2>
            <button onClick={() => setFullscreenChart(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-grow">
            {chartContent}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative group">
        <button 
          onClick={() => setFullscreenChart(dataKey)}
          className="absolute top-4 right-4 p-1.5 bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-200 text-slate-600 z-10"
          title="Plein écran"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <h3 className="font-semibold text-center mb-4 text-slate-700">{label}</h3>
        {dailyData.length > 0 ? chartContent : <p className="text-center text-slate-400 py-10">Aucune donnée</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Tableau de Bord & Tendances</h2>
        <div className="bg-white rounded-lg p-1 border border-slate-200 shadow-sm flex text-sm">
          <button 
            onClick={() => setTimeRange('30days')} 
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${timeRange === '30days' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            30 derniers jours
          </button>
          <button 
            onClick={() => setTimeRange('all')} 
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${timeRange === 'all' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Historique complet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderLineChart('cipg', 'CIPG', settings.cipg)}
        {renderLineChart('gapFiller1', 'Gap-filler Station 1', settings.gapFiller1)}
        {renderLineChart('gapFiller2', 'Gap-filler Station 2', settings.gapFiller2)}
        {renderLineChart('potting', 'Potting', settings.potting)}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4 text-slate-800">Totaux Radiomètres UV</h3>
        {uvData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={uvData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Legend />
              <Bar dataKey="rad1" name="Radiomètre 1" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rad2" name="Radiomètre 2" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rad3" name="Radiomètre 3" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-slate-400 py-10">Aucune donnée UV enregistrée</p>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ settings, setSettings, history }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Export states
  const [exportFilterDate, setExportFilterDate] = useState('all'); // 'all', '30days', '7days'
  const [exportFilterType, setExportFilterType] = useState('all'); // 'all', 'daily', 'uv'

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'process') {
      setIsAuthenticated(true);
    } else {
      alert("Mot de passe incorrect.");
    }
  };

  const handleSave = () => {
    setSettings(localSettings);
    alert("Paramètres sauvegardés avec succès !");
  };

  const handleChange = (key, field, val) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: parseFloat(val) }
    }));
  };

  const generateCSV = () => {
    let dataToExport = [...history];
    
    // Filter by date
    if (exportFilterDate !== 'all') {
      const days = exportFilterDate === '30days' ? 30 : 7;
      const cutoff = subDays(new Date(), days);
      dataToExport = dataToExport.filter(item => isAfter(parseISO(item.timestamp), cutoff));
    }
    
    // Filter by type
    if (exportFilterType !== 'all') {
      dataToExport = dataToExport.filter(item => item.type === exportFilterType);
    }

    if (dataToExport.length === 0) {
      alert("Aucune donnée à exporter avec ces filtres.");
      return;
    }

    // CSV format for Excel (semicolon separated)
    const headers = [
      "Date", "Type", 
      "CIPG (g)", "Gap Filler 1 (g)", "Gap Filler 2 (g)", "Potting (g)",
      "Ecrasement GF1", "Ecrasement GF2", "AOI Master OK", "AOI Master NOK", "Raisons NOK",
      "UV Rad1 (J)", "UV Rad2 (J)", "UV Rad3 (J)"
    ].join(';');

    const rows = dataToExport.map(row => {
      const d = format(parseISO(row.timestamp), 'dd/MM/yyyy HH:mm:ss');
      const t = row.type === 'daily' ? 'Quotidien' : 'UV';
      
      let w_cipg = '', w_gf1 = '', w_gf2 = '', w_pot = '';
      let v_egf1 = '', v_egf2 = '', v_aok = '', v_anok = '', reasons = '';
      let uv_r1 = '', uv_r2 = '', uv_r3 = '';

      if (row.type === 'daily') {
        w_cipg = row.weights.cipg || '';
        w_gf1 = row.weights.gapFiller1 || '';
        w_gf2 = row.weights.gapFiller2 || '';
        w_pot = row.weights.potting || '';
        v_egf1 = row.visuals.ecrasementGf1 || '';
        v_egf2 = row.visuals.ecrasementGf2 || '';
        v_aok = row.visuals.aoiMasterOk || '';
        v_anok = row.visuals.aoiMasterNok || '';
        reasons = Object.entries(row.nokReasons || {})
          .map(([k, v]) => `${k}:${v}`)
          .join(' | ')
          .replace(/;/g, ','); // avoid breaking CSV
      } else if (row.type === 'uv') {
        uv_r1 = row.totals.rad1 || '';
        uv_r2 = row.totals.rad2 || '';
        uv_r3 = row.totals.rad3 || '';
      }

      return [
        d, t, w_cipg, w_gf1, w_gf2, w_pot,
        v_egf1, v_egf2, v_aok, v_anok, reasons,
        uv_r1, uv_r2, uv_r3
      ].join(';');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `emotors_pds_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md border border-slate-200 mt-10 animate-in fade-in zoom-in-95">
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Zone Sécurisée</h2>
          <p className="text-slate-500 text-sm mt-1">Saisissez le mot de passe opérateur pour accéder aux paramètres.</p>
        </div>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            placeholder="Mot de passe"
          />
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Déverrouiller
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-slate-500" />
          Cibles et Tolérances
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(localSettings).map(([key, config]) => (
            <div key={key} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-700 capitalize mb-3">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cible ({config.unit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.target}
                    onChange={e => handleChange(key, 'target', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tolérance (± %)</label>
                  <input
                    type="number"
                    value={config.tolerance}
                    onChange={e => handleChange(key, 'tolerance', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Sauvegarder les paramètres
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Download className="w-6 h-6 mr-2 text-slate-500" />
          Export de Données
        </h2>
        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600 mb-4">Exportez l'historique au format CSV (compatible Excel). Vous pouvez filtrer les données avant l'export.</p>
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Période</label>
              <select 
                value={exportFilterDate}
                onChange={e => setExportFilterDate(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 bg-white"
              >
                <option value="all">Tout depuis le début</option>
                <option value="30days">30 derniers jours</option>
                <option value="7days">7 derniers jours</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Type de contrôle</label>
              <select 
                value={exportFilterType}
                onChange={e => setExportFilterType(e.target.value)}
                className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 px-3 bg-white"
              >
                <option value="all">Tous les contrôles</option>
                <option value="daily">Quotidiens (Pesées & Visuel)</option>
                <option value="uv">Périodiques (UV)</option>
              </select>
            </div>
          </div>

          <button onClick={generateCSV} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto">
            <Download className="w-5 h-5 mr-2" />
            Télécharger le CSV Excel
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin, ArrowRight, Leaf, Clock, DollarSign, Settings2, Loader2,
  ShieldCheck, Ship, Train, Truck, Plane, Search, ChevronDown,
  Zap, Wallet, TreePine, Crown, Scale, Route, Star, X, ArrowDownUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';

/* ──────────────────────────── Types ──────────────────────────── */
interface RouteStep {
  origin: string;
  dest: string;
  mode: string;
  carrier: string;
  cost: number;
  time: number;
  co2: number;
  reliability?: number;
}

interface RouteResponse {
  total_cost: number;
  total_time: number;
  total_co2: number;
  path: RouteStep[];
}

/* ──────────────── Preset definitions (mirrors notebook) ──────────────── */
const PRESETS = [
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Optimizes all factors with priority to cost & time',
    weights: 'Time 30% · Cost 40% · CO₂ 10% · Reliability 20%',
    icon: Scale,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'ring-amber-500/30',
  },
  {
    id: 'fastest',
    label: 'Fastest',
    desc: '100% time priority — minimize transit duration',
    weights: 'Time 100%',
    icon: Zap,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    ring: 'ring-blue-500/30',
  },
  {
    id: 'cheapest',
    label: 'Cheapest',
    desc: '100% cost priority — minimize total expense',
    weights: 'Cost 100%',
    icon: Wallet,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500/30',
  },
  {
    id: 'eco',
    label: 'Eco-Friendly',
    desc: '100% CO₂ priority — minimize carbon footprint',
    weights: 'CO₂ 100%',
    icon: TreePine,
    color: 'lime',
    gradient: 'from-lime-500 to-emerald-500',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    text: 'text-lime-700',
    ring: 'ring-lime-500/30',
  },
  {
    id: 'premium',
    label: 'Premium',
    desc: '100% reliability priority — most dependable carriers',
    weights: 'Reliability 100%',
    icon: Crown,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    ring: 'ring-violet-500/30',
  },
] as const;

/* ──────────────────── Searchable Combobox ──────────────────── */
function NodeCombobox({
  label,
  value,
  onChange,
  nodes,
  placeholder = 'Search city or port…',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  nodes: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return nodes;
    const q = search.toLowerCase();
    return nodes.filter((n) => n.toLowerCase().includes(q));
  }, [nodes, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3.5 text-left flex items-center justify-between gap-2 hover:border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none shadow-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-stone-800 font-medium truncate">{value || placeholder}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-stone-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-stone-100">
              <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                <Search size={14} className="text-stone-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-stone-400 text-center">No matching nodes found</div>
              ) : (
                filtered.map((n) => (
                  <button
                    key={n}
                    onClick={() => { onChange(n); setOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-amber-50 flex items-center gap-2 ${
                      n === value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-stone-700'
                    }`}
                  >
                    <MapPin size={12} className={n === value ? 'text-amber-500' : 'text-stone-300'} />
                    {n}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ──────────────── Transport mode helpers ──────────────── */
function getTransportIcon(mode: string, size = 18) {
  switch (mode.toLowerCase()) {
    case 'sea':      return <Ship size={size} />;
    case 'rail':     return <Train size={size} />;
    case 'road':     return <Truck size={size} />;
    case 'air':      return <Plane size={size} />;
    case 'transfer': return <ArrowDownUp size={size} />;
    default:         return <Route size={size} />;
  }
}

function getModeColor(mode: string) {
  switch (mode.toLowerCase()) {
    case 'sea':      return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'rail':     return { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'road':     return { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-300', dot: 'bg-stone-500' };
    case 'air':      return { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' };
    case 'transfer': return { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', dot: 'bg-amber-500' };
    default:         return { bg: 'bg-stone-100', text: 'text-stone-500', border: 'border-stone-200', dot: 'bg-stone-400' };
  }
}

function reliabilityLabel(score: number) {
  if (score >= 0.95) return 'Excellent';
  if (score >= 0.90) return 'Very Good';
  if (score >= 0.85) return 'Good';
  if (score >= 0.80) return 'Fair';
  return 'Low';
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function RouteOptimizer() {
  const { user } = useAuth();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [preset, setPreset] = useState('balanced');

  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [nodes, setNodes] = useState<string[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);

  /* ── Fetch all available nodes from routing graph on mount ── */
  useEffect(() => {
    async function fetchNodes() {
      setNodesLoading(true);
      try {
        const res = await fetch('http://localhost:8000/api/route/nodes');
        if (res.ok) {
          const data: string[] = await res.json();
          const sorted = data.sort();
          setNodes(sorted);
          if (sorted.length > 0) {
            setOrigin((prev) => (sorted.includes(prev) ? prev : sorted[0]));
            setDestination((prev) =>
              sorted.includes(prev) ? prev : sorted[Math.min(sorted.length - 1, 10)]
            );
          }
        }
      } catch {
        console.error('Failed to fetch routing nodes');
      } finally {
        setNodesLoading(false);
      }
    }
    fetchNodes();
  }, []);

  /* ── Run optimisation: exact same call the notebook makes ── */
  const handleOptimize = async () => {
    if (!origin || !destination) return;
    if (origin === destination) {
      setError('Origin and destination must be different.');
      return;
    }
    setIsLoading(true);
    setError('');
    setRouteData(null);
    try {
      const res = await fetch('http://localhost:8000/api/route/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, preset, user_id: user?.id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'No route possible between these nodes.');
      }
      const data: RouteResponse = await res.json();
      setRouteData(data);
      // Notify sidebar to refresh routing history
      window.dispatchEvent(new Event('routingHistoryUpdated'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Derived stats ── */
  const avgReliability = useMemo(() => {
    if (!routeData?.path?.length) return 0;
    const reliabilities = routeData.path
      .map((s) => s.reliability)
      .filter((r): r is number => r !== undefined && r !== null);
    if (reliabilities.length === 0) return 0;
    return reliabilities.reduce((a, b) => a + b, 0) / reliabilities.length;
  }, [routeData]);

  const activePreset = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="min-h-full bg-stone-50 text-stone-700 font-sans overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ─────────── HEADER ─────────── */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
              <Route size={22} />
            </div>
            <h1 className="text-3xl font-serif text-stone-900">
              Multi-Factor Route Optimizer
            </h1>
          </div>
          <div className="ml-[52px] max-w-2xl">
            <p className="text-[15px] leading-relaxed text-stone-600">
              Enterprise-grade global logistics optimization. Configure your strategic priorities and let our intelligent routing engine orchestrate the most efficient multi-modal supply chain pathways.
            </p>
            <div className="flex items-center gap-3 mt-3.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-bold tracking-wide uppercase border border-green-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live Data
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 text-[11px] font-bold tracking-wide uppercase border border-stone-200/60">
                220+ Global Hubs
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold tracking-wide uppercase border border-blue-200/60">
                Multi-Modal
              </span>
            </div>
          </div>
        </div>

        {/* ─────────── CONTROL PANEL ─────────── */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-8">
          {/* Origin / Destination */}
          {nodesLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-stone-400">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading routing graph…</span>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <NodeCombobox
                label="🛫 Origin"
                value={origin}
                onChange={setOrigin}
                nodes={nodes}
                placeholder="Search origin…"
              />
              <button
                type="button"
                onClick={() => { const tmp = origin; setOrigin(destination); setDestination(tmp); }}
                className="p-3 rounded-xl border border-stone-200 text-stone-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 transition-all flex-shrink-0 self-end mb-[2px]"
                title="Swap origin & destination"
              >
                <ArrowDownUp size={18} />
              </button>
              <NodeCombobox
                label="🛬 Destination"
                value={destination}
                onChange={setDestination}
                nodes={nodes}
                placeholder="Search destination…"
              />
            </div>
          )}

          {/* ── Strategy Selector ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
              ⚙️ Optimization Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`relative rounded-xl p-4 text-left transition-all outline-none border-2 ${
                      active
                        ? `${p.bg} ${p.border} ${p.text} ring-4 ${p.ring} shadow-sm`
                        : 'bg-white border-stone-100 text-stone-600 hover:border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          active ? `bg-gradient-to-br ${p.gradient} text-white` : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <span className="font-semibold text-sm">{p.label}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${active ? p.text : 'text-stone-400'}`}>
                      {p.desc}
                    </p>
                    <p className={`text-[10px] mt-2 font-mono ${active ? `${p.text} opacity-80` : 'text-stone-300'}`}>
                      {p.weights}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Action ── */}
          <button
            onClick={handleOptimize}
            disabled={isLoading || !origin || !destination || nodesLoading}
            className={`w-full md:w-auto bg-gradient-to-r ${activePreset.gradient} hover:opacity-90 text-white rounded-xl px-10 py-4 font-semibold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/15`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Settings2 size={18} />}
            <span>{isLoading ? 'Calculating Optimal Route…' : 'Calculate Optimal Route'}</span>
          </button>
        </div>

        {/* ─────────── ERROR ─────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="p-2 rounded-full bg-red-100 flex-shrink-0">
                <ShieldCheck size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-red-700">Route Calculation Failed</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─────────── EMPTY STATE ─────────── */}
        {!routeData && !isLoading && !error && (
          <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl bg-stone-100 mb-4">
              <Route size={32} className="text-stone-300" />
            </div>
            <h3 className="text-lg font-serif text-stone-900 mb-2">
              Select origin, destination & strategy
            </h3>
            <p className="text-sm text-stone-400 max-w-md">
              The optimizer will calculate the best multi-hop route through our network
              of 220+ cities, ports, and airports using Dijkstra's shortest-path algorithm
              with your chosen weights.
            </p>
          </div>
        )}

        {/* ─────────── LOADING ─────────── */}
        {isLoading && (
          <div className="bg-white border border-stone-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <Loader2 size={36} className="text-amber-500 animate-spin mb-4" />
            <h3 className="text-lg font-serif text-stone-900 mb-1">
              Computing optimal route…
            </h3>
            <p className="text-sm text-stone-400">
              Running Dijkstra's algorithm on the routing graph with <strong>{activePreset.label}</strong> strategy
            </p>
          </div>
        )}

        {/* ═══════════════════ RESULTS ═══════════════════ */}
        <AnimatePresence>
          {routeData && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* ── Strategy badge ── */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${activePreset.gradient} text-white`}>
                  {(() => { const I = activePreset.icon; return <I size={16} />; })()}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Strategy Applied
                  </span>
                  <h3 className={`text-lg font-semibold ${activePreset.text}`}>
                    {activePreset.label}
                  </h3>
                </div>
              </div>

              {/* ── KPI Dashboard ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Time */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white border border-stone-200 rounded-2xl p-5 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm"
                >
                  <div className="absolute -top-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                    <Clock size={72} />
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500 text-xs uppercase tracking-wider mb-3">
                    <Clock size={14} className="text-blue-500" />
                    Total Time
                  </div>
                  <div className="text-3xl font-serif text-stone-900">
                    {routeData.total_time < 24
                      ? <>{routeData.total_time.toFixed(1)}<span className="text-base text-stone-500 font-sans ml-1">hours</span></>
                      : <>{(routeData.total_time / 24).toFixed(1)}<span className="text-base text-stone-500 font-sans ml-1">days</span></>
                    }
                  </div>
                  {routeData.total_time >= 24 && (
                    <div className="text-xs text-stone-400 mt-1">{routeData.total_time.toFixed(1)}h total</div>
                  )}
                </motion.div>

                {/* Cost */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-stone-200 rounded-2xl p-5 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm"
                >
                  <div className="absolute -top-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                    <DollarSign size={72} />
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500 text-xs uppercase tracking-wider mb-3">
                    <DollarSign size={14} className="text-emerald-500" />
                    Total Cost
                  </div>
                  <div className="text-3xl font-serif text-stone-900">
                    ${routeData.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </motion.div>

                {/* CO₂ */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white border border-stone-200 rounded-2xl p-5 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm"
                >
                  <div className="absolute -top-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                    <Leaf size={72} />
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500 text-xs uppercase tracking-wider mb-3">
                    <Leaf size={14} className="text-lime-500" />
                    CO₂ Emissions
                  </div>
                  <div className="text-3xl font-serif text-stone-900">
                    {routeData.total_co2.toFixed(2)}<span className="text-base text-stone-500 font-sans ml-1">kg</span>
                  </div>
                </motion.div>

                {/* Reliability */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white border border-stone-200 rounded-2xl p-5 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm"
                >
                  <div className="absolute -top-3 -right-3 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                    <ShieldCheck size={72} />
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500 text-xs uppercase tracking-wider mb-3">
                    <ShieldCheck size={14} className="text-violet-500" />
                    Avg. Reliability
                  </div>
                  <div className="text-3xl font-serif text-stone-900">
                    {avgReliability > 0
                      ? <>{(avgReliability * 100).toFixed(0)}<span className="text-base text-stone-500 font-sans ml-1">%</span></>
                      : <span className="text-stone-400">N/A</span>
                    }
                  </div>
                  {avgReliability > 0 && (
                    <div className="text-xs text-stone-400 mt-1">{reliabilityLabel(avgReliability)}</div>
                  )}
                </motion.div>
              </div>

              {/* ── Multi-Hop Supply Chain Timeline ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
              >
                <h3 className="text-xl font-serif text-stone-900 mb-8 flex items-center gap-2">
                  <Route size={20} className="text-amber-500" />
                  Supply Chain Visualization
                  <span className="text-sm font-sans text-stone-400 ml-auto">
                    {routeData.path.length} hop{routeData.path.length !== 1 ? 's' : ''}
                  </span>
                </h3>

                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[22px] top-6 bottom-6 w-px bg-gradient-to-b from-stone-200 via-stone-200 to-amber-300" />

                  <div className="space-y-6">
                    {routeData.path.map((step, index) => {
                      const mc = getModeColor(step.mode);
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.08 }}
                          className="relative pl-14"
                        >
                          {/* Node dot */}
                          <div
                            className={`absolute left-[10px] top-4 w-[26px] h-[26px] rounded-full border-[3px] border-white shadow-md flex items-center justify-center z-10 ${mc.bg} ${mc.text}`}
                          >
                            {getTransportIcon(step.mode, 12)}
                          </div>

                          {/* Step card */}
                          <div className="border border-stone-150 rounded-xl overflow-hidden hover:border-stone-300 transition-all hover:shadow-sm bg-white">
                            {/* Header */}
                            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base font-semibold text-stone-900 truncate">{step.origin}</span>
                                <ArrowRight size={14} className="text-stone-300 flex-shrink-0" />
                                <span className="text-base font-semibold text-stone-900 truncate">{step.dest}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${mc.bg} ${mc.text} border ${mc.border}`}
                                >
                                  {getTransportIcon(step.mode, 12)}
                                  {step.mode}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                                  {step.carrier}
                                </span>
                              </div>
                            </div>

                            {/* Metrics row */}
                            <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 flex items-center gap-1">
                                  <Clock size={10} /> Time
                                </div>
                                <span className="text-sm font-semibold text-stone-800">{step.time}h</span>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 flex items-center gap-1">
                                  <DollarSign size={10} /> Cost
                                </div>
                                <span className="text-sm font-semibold text-stone-800">${step.cost.toFixed(2)}</span>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 flex items-center gap-1">
                                  <Leaf size={10} /> CO₂
                                </div>
                                <span className="text-sm font-semibold text-stone-800">{step.co2} kg</span>
                              </div>
                              {step.reliability !== undefined && step.reliability !== null && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 flex items-center gap-1">
                                    <Star size={10} /> Reliability
                                  </div>
                                  <span className="text-sm font-semibold text-stone-800">
                                    {(step.reliability * 100).toFixed(0)}%
                                    <span className="text-[10px] font-normal text-stone-400 ml-1">
                                      {reliabilityLabel(step.reliability)}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Final destination marker */}
                    {routeData.path.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + routeData.path.length * 0.08 }}
                        className="relative pl-14"
                      >
                        <div className="absolute left-[10px] top-0 w-[26px] h-[26px] rounded-full bg-gradient-to-br from-amber-500 to-orange-500 border-[3px] border-white shadow-md flex items-center justify-center z-10">
                          <MapPin size={12} className="text-white" />
                        </div>
                        <div className="py-1">
                          <span className="text-lg font-serif font-semibold text-stone-900">
                            {routeData.path[routeData.path.length - 1].dest}
                          </span>
                          <p className="text-sm text-stone-400">Final Destination Reached ✓</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* ── Summary Banner ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className={`rounded-2xl p-6 border ${activePreset.border} ${activePreset.bg}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${activePreset.gradient} text-white shadow-md`}>
                    {(() => { const I = activePreset.icon; return <I size={24} />; })()}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-base ${activePreset.text}`}>
                      Route Summary — {activePreset.label} Strategy
                    </h4>
                    <p className="text-sm text-stone-500 mt-1">
                      {routeData.path.length} segment{routeData.path.length !== 1 ? 's' : ''}
                      {' · '}
                      {routeData.total_time.toFixed(1)}h total transit
                      {' · '}
                      ${routeData.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cost
                      {' · '}
                      {routeData.total_co2.toFixed(2)} kg CO₂
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

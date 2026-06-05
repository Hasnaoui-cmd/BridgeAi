import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, Map, AlertTriangle,
  Plus, MessageCircle, LogOut, ShieldCheck, ChevronDown, Clock, Timer, Loader2,
  PanelLeftClose, PanelLeft, Trash2, Route
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getRecentSessions, getPredictionHistory, getRoutingHistory, deleteSession, deletePrediction, deleteRoutingHistory } from '../lib/api';

type ChatSession = { id: string; title: string; last_activity: string };

// Titles that are too generic to display — replace with a friendly fallback
const GENERIC_TITLES = new Set([
  'hello', 'hi', 'salam', 'bonjour', 'hey', 'salut', 'ok', 'oui', 'non', 'yes', 'no',
]);

function smartTitle(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || GENERIC_TITLES.has(cleaned) || cleaned.length < 4) {
    return 'New Trade Assessment';
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatRelative(isoString: string): string {
  try {
    const d = new Date(isoString);
    const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function Layout() {
  const { user, signOut, isAdmin, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [predictionHistoryOpen, setPredictionHistoryOpen] = useState(false);
  const [isLoadingPredictionHistory, setIsLoadingPredictionHistory] = useState(false);
  const [routingHistory, setRoutingHistory] = useState<any[]>([]);
  const [routingHistoryOpen, setRoutingHistoryOpen] = useState(false);
  const [isLoadingRoutingHistory, setIsLoadingRoutingHistory] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar) return;
      const newWidth = Math.max(200, Math.min(e.clientX, 600));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      document.body.classList.remove('select-none');
    };

    if (isDraggingSidebar) {
      document.body.classList.add('select-none');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('select-none');
    };
  }, [isDraggingSidebar]);


  const loadRecentChats = async () => {
    if (!user) return;
    try {
      const res = await getRecentSessions(user.id);
      if (res?.sessions) {
        setRecentChats(res.sessions);
      }
    } catch (err) {
      console.error('Failed to load recent chats', err);
    }
  };

  const loadPredictionHistory = async () => {
    if (!user) return;
    setIsLoadingPredictionHistory(true);
    try {
      const res = await getPredictionHistory(user.id);
      if (res?.status === 'success' && res?.data) {
        setPredictionHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load prediction history', err);
    } finally {
      setIsLoadingPredictionHistory(false);
    }
  };

  const loadRoutingHistory = async () => {
    if (!user) return;
    setIsLoadingRoutingHistory(true);
    try {
      const res = await getRoutingHistory(user.id);
      if (res?.status === 'success' && res?.data) {
        setRoutingHistory(res.data);
      }
    } catch (err) {
      console.error('Failed to load routing history', err);
    } finally {
      setIsLoadingRoutingHistory(false);
    }
  };

  useEffect(() => {
    loadRecentChats();
    window.addEventListener('recentChatsUpdated', loadRecentChats);
    return () => window.removeEventListener('recentChatsUpdated', loadRecentChats);
  }, [user]);

  useEffect(() => {
    loadPredictionHistory();
    window.addEventListener('predictionHistoryUpdated', loadPredictionHistory);
    return () => window.removeEventListener('predictionHistoryUpdated', loadPredictionHistory);
  }, [user]);

  useEffect(() => {
    loadRoutingHistory();
    window.addEventListener('routingHistoryUpdated', loadRoutingHistory);
    return () => window.removeEventListener('routingHistoryUpdated', loadRoutingHistory);
  }, [user]);

  useEffect(() => {
    if (location.pathname.startsWith('/assistant')) {
      setAssistantOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/prediction')) {
      setPredictionHistoryOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/routes')) {
      setRoutingHistoryOpen(true);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNewAssessment = () => {
    navigate('/assistant', { replace: true });
  };

  const handleNewPrediction = () => {
    window.location.href = '/prediction';
  };

  const handleNewRoute = () => {
    window.location.href = '/routes';
  };

  // Delete handlers
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setRecentChats((prev) => prev.filter((c) => c.id !== sessionId));
      if (location.pathname === `/assistant/${sessionId}`) {
        navigate('/assistant', { replace: true });
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleDeletePrediction = async (e: React.MouseEvent, predictionId: number) => {
    e.stopPropagation();
    try {
      await deletePrediction(predictionId);
      setPredictionHistory((prev) => prev.filter((p) => p.id !== predictionId));
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('id') === String(predictionId)) {
        navigate('/prediction', { replace: true });
      }
    } catch (err) {
      console.error('Failed to delete prediction', err);
    }
  };

  const handleDeleteRoute = async (e: React.MouseEvent, routeId: number) => {
    e.stopPropagation();
    try {
      await deleteRoutingHistory(routeId);
      setRoutingHistory((prev) => prev.filter((r) => r.id !== routeId));
    } catch (err) {
      console.error('Failed to delete route', err);
    }
  };

  // Derive active session from URL
  const activeSessionId = location.pathname.startsWith('/assistant/')
    ? location.pathname.replace('/assistant/', '')
    : null;

  const isAssistantActive = location.pathname.startsWith('/assistant');

  return (
    <div className="flex h-screen bg-[#Fdfdfc] text-stone-800 font-sans selection:bg-amber-100">
      {/* ── Sidebar Toggle Button (when hidden) ── */}
      {!isSidebarVisible && (
        <button
          onClick={() => setIsSidebarVisible(true)}
          className="absolute top-4 left-4 z-50 p-2 bg-white border border-stone-200 rounded-lg shadow-sm text-stone-500 hover:text-stone-800 transition-colors"
          title="Show Sidebar"
        >
          <PanelLeft size={20} />
        </button>
      )}

      {/* ── Sidebar ── */}
      {isSidebarVisible && (
        <aside
          style={{ width: sidebarWidth }}
          className="bg-stone-100/50 border-r border-stone-200/60 flex flex-col pt-6 pb-4 relative flex-shrink-0"
        >
          {/* Resize Handle */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingSidebar(true);
            }}
            className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-10 transition-colors ${
              isDraggingSidebar ? 'bg-amber-400' : 'hover:bg-amber-400/50'
            }`}
          />

          {/* Logo and Hide Button */}
          <div className="px-6 mb-8 flex items-center justify-between">
            <h1 className="text-xl font-medium tracking-tight flex items-center space-x-2">
              <span className="w-6 h-6 rounded-md bg-stone-800 text-stone-50 flex items-center justify-center text-xs font-bold">B</span>
              <span>BridgeAI</span>
            </h1>
            <button
              onClick={() => setIsSidebarVisible(false)}
              className="p-1 text-stone-400 hover:text-stone-600 rounded transition-colors"
              title="Hide Sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">

          {/* ═══════════ Assistant accordion ═══════════ */}
          <div>
            <div className="flex items-center">
              <button
                onClick={() => setAssistantOpen(o => !o)}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                  isAssistantActive
                    ? 'bg-stone-200/50 font-medium text-stone-900'
                    : 'text-stone-600 hover:bg-stone-200/30'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <MessageSquare size={18} className="opacity-80" />
                  <span>Assistant</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-stone-400 transition-transform duration-200 ${assistantOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                onClick={handleNewAssessment}
                className="ml-1 p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="New Assessment"
              >
                <Plus size={16} />
              </button>
            </div>

            {assistantOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-stone-200 space-y-0.5">
                {recentChats.length === 0 ? (
                  <p className="text-[11px] text-stone-400 py-2 px-2 italic">No recent sessions</p>
                ) : (
                  recentChats.map((chat) => {
                    const isActive = chat.id === activeSessionId;
                    const title = smartTitle(chat.title);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => navigate(`/assistant/${chat.id}`)}
                        className={`relative w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group ${
                          isActive
                            ? 'bg-amber-50 text-amber-900'
                            : 'text-stone-500 hover:bg-stone-200/40 hover:text-stone-800'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-amber-500 rounded-full" />
                        )}
                        <MessageCircle
                          size={15}
                          className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-amber-600' : 'opacity-40 group-hover:opacity-70'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug truncate">{title}</p>
                          {chat.last_activity && (
                            <p className={`text-xs mt-0.5 flex items-center gap-1 ${isActive ? 'text-amber-500/70' : 'text-stone-400'}`}>
                              <Clock size={10} />
                              {formatRelative(chat.last_activity)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(e, chat.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-stone-400 transition-all flex-shrink-0"
                          title="Delete conversation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ═══════════ Routes accordion (with history) ═══════════ */}
          <div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setRoutingHistoryOpen(o => !o);
                  if (!location.pathname.startsWith('/routes')) {
                    navigate('/routes');
                  }
                }}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                  location.pathname.startsWith('/routes')
                    ? 'bg-stone-200/50 font-medium text-stone-900'
                    : 'text-stone-600 hover:bg-stone-200/30'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <Route size={18} className="opacity-80" />
                  <span>Routes</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-stone-400 transition-transform duration-200 ${routingHistoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                onClick={handleNewRoute}
                className="ml-1 p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="New Route"
              >
                <Plus size={16} />
              </button>
            </div>

            {routingHistoryOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-stone-200 space-y-0.5">
                {isLoadingRoutingHistory ? (
                  <div className="flex items-center gap-2 py-2 px-2">
                    <Loader2 size={12} className="animate-spin text-stone-400" />
                    <span className="text-[11px] text-stone-400 font-medium">Loading history...</span>
                  </div>
                ) : routingHistory.length === 0 ? (
                  <p className="text-[11px] text-stone-400 py-2 px-2 italic">No routes logged</p>
                ) : (
                  routingHistory.map((item) => {
                    const date = new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    const label = `${item.origin} → ${item.destination}`;
                    const truncatedLabel = label.length > 28 ? label.slice(0, 25) + '...' : label;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate('/routes')}
                        className="relative w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group text-stone-500 hover:bg-stone-200/40 hover:text-stone-800"
                      >
                        <Map
                          size={14}
                          className="flex-shrink-0 mt-0.5 opacity-40 group-hover:opacity-70"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug truncate">{truncatedLabel}</p>
                          <p className="text-[10px] mt-0.5 flex items-center gap-1 text-stone-400">
                            <span>{date}</span>
                            <span className="ml-auto bg-stone-100 text-stone-600 px-1 py-0.2 rounded text-[9px] font-semibold capitalize">
                              {item.preset}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteRoute(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-stone-400 transition-all flex-shrink-0"
                          title="Delete route"
                        >
                          <Trash2 size={13} />
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ═══════════ Risks ═══════════ */}
          <NavLink
            to="/risks"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                isActive ? 'bg-stone-200/50 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-200/30'
              }`
            }
          >
            <AlertTriangle size={18} className="opacity-80" />
            <span>Risks</span>
          </NavLink>

          {/* ═══════════ AI Delay Prediction accordion ═══════════ */}
          <div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setPredictionHistoryOpen(o => !o);
                  if (!location.pathname.startsWith('/prediction')) {
                    navigate('/prediction');
                  }
                }}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                  location.pathname.startsWith('/prediction')
                    ? 'bg-stone-200/50 font-medium text-stone-900'
                    : 'text-stone-600 hover:bg-stone-200/30'
                }`}
              >
                <span className="flex items-center space-x-3">
                  <Timer size={18} className="opacity-80" />
                  <span>AI Delay Prediction</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-stone-400 transition-transform duration-200 ${predictionHistoryOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                onClick={handleNewPrediction}
                className="ml-1 p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                title="New Prediction"
              >
                <Plus size={16} />
              </button>
            </div>

            {predictionHistoryOpen && (
              <div className="mt-0.5 ml-4 pl-3 border-l border-stone-200 space-y-0.5">
                {isLoadingPredictionHistory ? (
                  <div className="flex items-center gap-2 py-2 px-2">
                    <Loader2 size={12} className="animate-spin text-stone-400" />
                    <span className="text-[11px] text-stone-400 font-medium">Loading history...</span>
                  </div>
                ) : predictionHistory.length === 0 ? (
                  <p className="text-[11px] text-stone-400 py-2 px-2 italic">No predictions logged</p>
                ) : (
                  predictionHistory.map((item) => {
                    const searchParams = new URLSearchParams(location.search);
                    const isActive = location.pathname.startsWith('/prediction') && searchParams.get('id') === String(item.id);
                    const date = new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    const truncatedMessage = item.user_message.length > 28
                      ? item.user_message.slice(0, 25) + '...'
                      : item.user_message;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/prediction?id=${item.id}`)}
                        className={`relative w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group ${
                          isActive
                            ? 'bg-amber-50 text-amber-900'
                            : 'text-stone-500 hover:bg-stone-200/40 hover:text-stone-800'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-amber-500 rounded-full" />
                        )}
                        <Clock
                          size={14}
                          className={`flex-shrink-0 mt-0.5 ${isActive ? 'text-amber-600' : 'opacity-40 group-hover:opacity-70'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug truncate">{truncatedMessage}</p>
                          <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${isActive ? 'text-amber-500/70' : 'text-stone-400'}`}>
                            <span>{date}</span>
                            {item.prediction_data?.delay_days !== undefined && (
                              <span className="ml-auto bg-amber-100/60 text-amber-800 px-1 py-0.2 rounded text-[9px] font-semibold">
                                {item.prediction_data.delay_days}d delay
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeletePrediction(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 text-stone-400 transition-all flex-shrink-0"
                          title="Delete prediction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Admin Panel */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-colors mt-1 border ${
                  isActive
                    ? 'bg-amber-50 border-amber-200 font-medium text-amber-800'
                    : 'border-amber-100 text-amber-700 hover:bg-amber-50/60'
                }`
              }
            >
              <ShieldCheck size={18} className="opacity-80" />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        {/* ── User footer ── */}
        <div className="px-4 mt-auto pt-4 border-t border-stone-200/60">
          {user ? (
            <div className="space-y-2">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    isActive ? 'bg-stone-200/50' : 'hover:bg-stone-200/30'
                  }`
                }
              >
                <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-50 uppercase font-bold text-xs flex-shrink-0">
                  {(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="text-sm overflow-hidden">
                  <div className="font-medium text-stone-800 truncate text-xs">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <div className="text-[10px] text-stone-400 capitalize">{userRole}</div>
                </div>
              </NavLink>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} className="opacity-80" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center space-x-2 bg-stone-800 text-stone-50 rounded-xl px-3 py-2 text-sm font-medium hover:bg-stone-700 transition-colors shadow-sm"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </aside>
      )}

      {/* ── Main Area ── */}
      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>
    </div>
  );
}

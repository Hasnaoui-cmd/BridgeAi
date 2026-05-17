import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare, FileText, Map, AlertTriangle,
  Plus, MessageCircle, LogOut, ShieldCheck, ChevronDown, Clock,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getRecentSessions } from '../lib/api';

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
  // Capitalise first letter
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

  useEffect(() => {
    loadRecentChats();
    window.addEventListener('recentChatsUpdated', loadRecentChats);
    return () => window.removeEventListener('recentChatsUpdated', loadRecentChats);
  }, [user]);

  // Auto-expand the assistant accordion when on an assistant route
  useEffect(() => {
    if (location.pathname.startsWith('/assistant')) {
      setAssistantOpen(true);
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNewAssessment = () => {
    navigate('/assistant', { replace: true });
  };

  // Derive active session from URL
  const activeSessionId = location.pathname.startsWith('/assistant/')
    ? location.pathname.replace('/assistant/', '')
    : null;

  const isAssistantActive = location.pathname.startsWith('/assistant');

  return (
    <div className="flex h-screen bg-[#Fdfdfc] text-stone-800 font-sans selection:bg-amber-100">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-stone-100/50 border-r border-stone-200/60 flex flex-col pt-6 pb-4">

        {/* Logo */}
        <div className="px-6 mb-8">
          <h1 className="text-xl font-medium tracking-tight flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-stone-800 text-stone-50 flex items-center justify-center text-xs font-bold">B</span>
            <span>BridgeAI</span>
          </h1>
        </div>

        {/* New Assessment CTA */}
        <div className="px-4 mb-4">
          <button
            onClick={handleNewAssessment}
            className="w-full flex items-center space-x-2 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>New Assessment</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">

          {/* ── Assistant accordion ── */}
          <div>
            {/* Parent trigger */}
            <button
              onClick={() => setAssistantOpen(o => !o)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
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

            {/* Nested session list */}
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
                        {/* Amber active bar */}
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
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Other nav items ── */}
          {[
            { label: 'Documents', icon: FileText, to: '/documents' },
            { label: 'Routes', icon: Map, to: '/routes' },
            { label: 'Risks', icon: AlertTriangle, to: '/risks' },
          ].map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  isActive ? 'bg-stone-200/50 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-200/30'
                }`
              }
            >
              <item.icon size={18} className="opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          ))}

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

      {/* ── Main Area ── */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}

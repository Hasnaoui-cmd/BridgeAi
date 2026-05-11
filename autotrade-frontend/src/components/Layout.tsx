import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Map, AlertTriangle, User, Plus, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { clearHistory } from '../lib/api';

type ChatSession = { id: string; title: string };

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);

  const loadRecentChats = async () => {
    if (!user) return;
    try {
      const res = await import('../lib/api').then(m => m.getRecentSessions(user.id));
      if (res.sessions) {
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

  const navItems = [
    { id: 'assistant', label: 'Assistant', icon: MessageSquare, to: '/assistant' },
    { id: 'documents', label: 'Documents', icon: FileText, to: '/documents' },
    { id: 'routes', label: 'Routes', icon: Map, to: '/routes' },
    { id: 'risks', label: 'Risks', icon: AlertTriangle, to: '/risks' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNewAssessment = () => {
    navigate('/assistant');
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfc] text-stone-800 font-sans selection:bg-amber-100">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-100/50 border-r border-stone-200/60 flex flex-col pt-6 pb-4">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-medium tracking-tight flex items-center space-x-2">
            <span className="w-6 h-6 rounded-md bg-stone-800 text-stone-50 flex items-center justify-center text-xs font-bold">B</span>
            <span>BridgeAI</span>
          </h1>
        </div>

        <div className="px-4 mb-4">
          <button 
            onClick={handleNewAssessment}
            className="w-full flex items-center space-x-2 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>New Assessment</span>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
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

          {recentChats.length > 0 && (
            <>
              <div className="pt-8 pb-2 px-3 text-xs font-medium text-stone-400 uppercase tracking-wider">
                Recent Chats
              </div>
              <div className="space-y-0.5">
                {recentChats.map((chat) => (
                  <button 
                    key={chat.id} 
                    onClick={() => navigate(`/assistant/${chat.id}`)}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-200/30 transition-colors truncate"
                  >
                    <MessageCircle size={16} className="opacity-60 flex-shrink-0" />
                    <span className="truncate text-left">{chat.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="px-4 mt-auto">
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
                <div className="w-8 h-8 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 uppercase font-bold text-xs">
                  {user.email?.[0] || 'U'}
                </div>
                <div className="text-sm overflow-hidden">
                  <div className="font-medium text-stone-800 truncate">{user.email}</div>
                  <div className="text-xs text-stone-500">Admin</div>
                </div>
              </NavLink>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Main Area */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
}

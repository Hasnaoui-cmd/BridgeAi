import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, ArrowUp, StopCircle, Lock } from 'lucide-react';
import { marked } from 'marked';
import { getHistory, sendMessage, sendAudioMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Message {
  role: 'user' | 'ai';
  content: string;
  htmlContent?: string;
  sources?: string[];
}

export default function Assistant() {
  const { user: realUser } = useAuth();
  const { sessionId: paramSessionId } = useParams();
  const navigate = useNavigate();

  // Maintain a stable session ID for this instance
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [displayedGreeting, setDisplayedGreeting] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or update Session ID based on URL
  useEffect(() => {
    if (paramSessionId) {
      setCurrentSessionId(paramSessionId);
    } else {
      // Generate a new unique session ID starting with user ID to enable DB querying
      const userId = realUser?.id || 'mock';
      const newId = `${userId}___sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setCurrentSessionId(newId);
      setMessages([]); // Ensure we clear if navigating from an old chat to a new one
    }
  }, [paramSessionId, realUser]);

  useEffect(() => {
    setIsLoggedIn(!!realUser);
    let name = realUser?.user_metadata?.full_name || realUser?.email?.split('@')[0] || 'Guest';
    if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
    setUserName(name);
  }, [realUser]);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    const hour = new Date().getHours();
    let timeGreeting = "Good evening";
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 18) timeGreeting = "Good afternoon";

    const fullGreeting = `${timeGreeting}, ${userName}. How can I help you today?`;
    setGreeting(fullGreeting);
  }, [isLoggedIn, userName]);

  useEffect(() => {
    if (!greeting || messages.length > 0) return;
    
    let i = 0;
    setDisplayedGreeting('');
    const interval = setInterval(() => {
      setDisplayedGreeting(greeting.substring(0, i + 1));
      i++;
      if (i >= greeting.length) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [greeting, messages.length]);

  useEffect(() => {
    if (isLoggedIn && realUser && currentSessionId && paramSessionId) {
      loadHistory(currentSessionId);
    }
  }, [isLoggedIn, realUser, currentSessionId, paramSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async (sid: string) => {
    if (!realUser) return;
    setLoading(true);
    try {
      const res = await getHistory(sid);
      if (res.messages && res.messages.length > 0) {
        const parsedMsgs = await Promise.all(
          res.messages.map(async (msg: any) => ({
            role: msg.role,
            content: msg.content,
            htmlContent: msg.role === 'ai' ? await marked.parse(msg.content) : undefined,
          }))
        );
        setMessages(parsedMsgs);
      } else {
        setMessages([]); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !isLoggedIn || loading || !currentSessionId) return;
    
    const question = input;
    setInput('');
    const isFirstMessage = messages.length === 0;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      // Use currentSessionId instead of user ID
      const res = await sendMessage(question, currentSessionId);
      const htmlContent = await marked.parse(res.answer || res.error || '');
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.error ? `⚠️ ${res.error}` : res.answer,
        htmlContent,
        sources: res.sources,
      }]);

      if (isFirstMessage) {
        window.dispatchEvent(new Event('recentChatsUpdated'));
        if (!paramSessionId) navigate(`/assistant/${currentSessionId}`, { replace: true });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Fatal error connecting to server' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (!isLoggedIn) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setLoading(true);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          processAudio(blob);
        };

        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Microphone access denied', err);
        alert('Please allow microphone permissions');
      }
    }
  };

  const processAudio = async (blob: Blob) => {
    if (!isLoggedIn || !currentSessionId) return;
    const isFirstMessage = messages.length === 0;

    try {
      const res = await sendAudioMessage(blob, currentSessionId);
      if (res.transcription) {
        setMessages(prev => [...prev, { role: 'user', content: '🎤 ' + res.transcription }]);
      }
      const htmlContent = await marked.parse(res.answer || res.error || '');
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.error ? `⚠️ ${res.error}` : res.answer,
        htmlContent,
        sources: res.sources,
      }]);

      if (isFirstMessage) {
        window.dispatchEvent(new Event('recentChatsUpdated'));
        if (!paramSessionId) navigate(`/assistant/${currentSessionId}`, { replace: true });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Fatal error processing audio' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto pt-16 px-8 pb-32 flex flex-col">
        
        {/* Conditional Rendering using early React Returns / Ternaries instead of Angular @if */}
        {isLoggedIn ? (
          <>
            {messages.length === 0 && displayedGreeting ? (
              <div className="flex-1 flex flex-col items-center justify-center pb-32">
                <h2 
                  className="text-5xl md:text-6xl text-stone-800 tracking-tight leading-snug text-center"
                  style={{ fontFamily: "'Playfair Display', 'Merriweather', Georgia, serif" }}
                >
                  {displayedGreeting}<span className="animate-pulse border-r-2 border-stone-800 ml-1"></span>
                </h2>
              </div>
            ) : (
              <div className="space-y-12">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'items-start space-x-6 max-w-3xl'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-stone-50 text-xs font-bold">AI</span>
                    </div>
                  )}
                  
                  {msg.role === 'user' ? (
                    <div className="bg-stone-100 rounded-3xl px-6 py-4 max-w-2xl text-stone-800">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="prose prose-stone max-w-none text-stone-800 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: msg.htmlContent || msg.content }} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {msg.sources.map((src, i) => (
                            <span key={i} className="text-xs border border-stone-200 bg-stone-50 rounded-md px-2 py-1 text-stone-500">
                              📎 {src}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex items-start space-x-6 max-w-3xl opacity-50">
                   <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-stone-50 text-xs font-bold">AI</span>
                    </div>
                    <div className="bg-stone-100 rounded-3xl px-6 py-4 max-w-2xl text-stone-800 animate-pulse">
                      Thinking...
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            )}
          </>
        ) : (
          /* State B (Not Logged In) */
          <div className="m-auto text-center flex flex-col items-center">
             <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-6">
               <Lock className="text-stone-400" size={32} />
             </div>
             <h2 className="text-2xl font-medium text-stone-800 mb-2">Welcome to BridgeAI</h2>
             <p className="text-stone-500 max-w-sm">Please sign in to start a secure session and access intelligent customs compliance.</p>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#Fdfdfc] via-[#Fdfdfc] to-transparent pt-10 pb-8 px-8">
        <div className="max-w-3xl mx-auto relative flex items-center group">
          
          {!isLoggedIn && (
            <div className="absolute inset-0 bg-stone-100/60 backdrop-blur-[2px] rounded-full z-20 flex items-center justify-center cursor-not-allowed">
              <span className="text-sm font-medium text-stone-600 flex items-center gap-2">
                <Lock size={14} /> Sign In to Chat
              </span>
            </div>
          )}

          <button 
            onClick={toggleRecording}
            disabled={!isLoggedIn}
            className="absolute left-3 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors z-10 disabled:opacity-50"
          >
            {isRecording ? <StopCircle size={20} className="text-red-500 animate-pulse" /> : <Mic size={20} />}
          </button>
          
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading || !isLoggedIn}
            placeholder={isRecording ? "Recording audio..." : "Reply to BridgeAI..."} 
            className="w-full bg-white border border-stone-200 rounded-full py-4 pl-14 pr-14 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-transparent transition-all placeholder:text-stone-400 text-stone-800 disabled:opacity-50"
          />
          
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading || !isLoggedIn}
            className="absolute right-3 w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white hover:bg-stone-700 transition-colors disabled:opacity-50 z-10"
          >
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="text-center mt-3 text-xs text-stone-400">
          BridgeAI can make mistakes. Please verify critical customs decisions.
        </div>
      </div>
    </div>
  );
}

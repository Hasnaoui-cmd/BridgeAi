import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, ArrowUp, StopCircle, Lock, Paperclip, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getHistory, streamChat, streamAudioChat, streamDocumentChat, transcribeAudio } from '../lib/api';
import { useAuth } from '../lib/auth';


interface Message {
  role: 'user' | 'ai' | 'admin';
  content: string;
  sources?: string[];
  isStreaming?: boolean;    // true while tokens are still arriving
  statusText?: string;     // e.g. "📊 Querying Enterprise Database..."
  attachedFiles?: { name: string; type: string; url: string }[];
}

// ── Role badge helper ──────────────────────────────────────────────────────
const getRoleBadge = (role: Message['role'] | undefined) => {
  const r = role ?? 'user';
  if (r === 'admin') {
    return (
      <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-2 border border-amber-200 inline-flex items-center">
        🛡️ ADMIN
      </span>
    );
  }
  if (r === 'user') {
    return (
      <span className="bg-stone-100 text-stone-500 text-[10px] px-1.5 py-0.5 rounded-md font-medium ml-2 inline-flex items-center">
        USER
      </span>
    );
  }
  // 'ai' — subtle stone-800 badge
  return (
    <span className="bg-stone-800 text-stone-100 text-[10px] px-1.5 py-0.5 rounded-md font-bold ml-2 inline-flex items-center">
      AI
    </span>
  );
};

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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Multi-document upload state ──
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [displayedGreeting, setDisplayedGreeting] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Accumulator ref — survives across re-renders during streaming
  const streamAccRef = useRef<string>('');

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

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => {
        if (url && url !== 'pdf') URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ─────────────────────────────────────────────────────────────
  // Helper: Appends a streaming AI placeholder and wires up
  // the SSE callbacks to update it token-by-token.
  // Returns the StreamCallbacks object.
  // ─────────────────────────────────────────────────────────────
  const buildStreamCallbacks = useCallback((isFirstMessage: boolean) => {
    // Reset the accumulator
    streamAccRef.current = '';

    // Push an empty AI message placeholder (streaming state)
    setMessages(prev => [...prev, {
      role: 'ai',
      content: '',
      isStreaming: true,
    }]);

    return {
      onToken: (text: string) => {
        streamAccRef.current += text;
        const current = streamAccRef.current;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'ai' && last.isStreaming) {
            updated[updated.length - 1] = {
              ...last,
              content: current,
              statusText: undefined,
            };
          }
          return updated;
        });
      },

      onStatus: (status: string) => {
        setStatusText(status);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'ai' && last.isStreaming) {
            updated[updated.length - 1] = { ...last, statusText: status };
          }
          return updated;
        });
      },

      onDone: async (sources: string[], _agents: string) => {
        const finalContent = streamAccRef.current;

        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'ai') {
            updated[updated.length - 1] = {
              ...last,
              content: finalContent,
              sources: sources.length > 0 ? sources : undefined,
              isStreaming: false,
              statusText: undefined,
            };
          }
          return updated;
        });

        setStatusText('');
        setLoading(false);

        if (isFirstMessage) {
          window.dispatchEvent(new Event('recentChatsUpdated'));
        }
      },

      onError: (error: string) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'ai' && last.isStreaming) {
            updated[updated.length - 1] = {
              ...last,
              content: `⚠️ ${error}`,
              isStreaming: false,
              statusText: undefined,
            };
          }
          return updated;
        });
        setStatusText('');
        setLoading(false);
      },
    };
  }, []);

  // ─────────────────────────────────────────────
  // Text Chat Handler — SSE streaming
  // ─────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !isLoggedIn || loading || !currentSessionId) return;

    const question = input;
    // Capture and clear vision state before any async work
    const filesToSend = [...selectedFiles];
    const capturedPreviews = [...previewUrls];

    setInput('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const isFirstMessage = messages.length === 0;

    // Push user bubble — include the image preview URL if present
    setMessages(prev => [...prev, {
      role: 'user',
      content: question,
      ...(filesToSend.length > 0 ? {
        attachedFiles: filesToSend.map((f, i) => ({ name: f.name, type: f.type, url: capturedPreviews[i] }))
      } : {}),
    }]);
    setLoading(true);

    try {
      const callbacks = buildStreamCallbacks(isFirstMessage);

      if (filesToSend.length > 0) {
        // ── Vision path: multipart/form-data with image ──
        await streamDocumentChat(filesToSend, question, currentSessionId, callbacks);
      } else {
        // ── Standard text path ──
        await streamChat(question, currentSessionId, callbacks);
      }

      if (isFirstMessage && !paramSessionId) {
        navigate(`/assistant/${currentSessionId}`, { replace: true });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Fatal error connecting to server' }]);
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Voice Recording Toggle
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // Audio Processing — Transcribe Only
  // ─────────────────────────────────────────────
  const processAudio = async (blob: Blob) => {
    if (!isLoggedIn || !currentSessionId) return;
    
    setIsTranscribing(true);
    try {
      const text = await transcribeAudio(blob);
      setInput(prev => {
        const newText = prev ? `${prev} ${text}`.trim() : text;
        return newText;
      });
      // Auto-focus the input
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Transcription failed:', err);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
      setLoading(false); // Clear the loading state set in toggleRecording
    }
  };

  //---------------------------------------------------
  //The File Selection Logic
  //--------------------------------------------------- 

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedFiles.length + files.length > 3) {
      alert("You can only upload up to 3 files.");
      return;
    }

    const newSelected = [...selectedFiles];
    const newPreviews = [...previewUrls];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        newSelected.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else if (file.type === 'application/pdf') {
        newSelected.push(file);
        newPreviews.push('pdf');
      } else {
        alert(`File ${file.name} is not supported. Please select an image (JPEG/PNG) or a PDF.`);
      }
    });

    setSelectedFiles(newSelected);
    setPreviewUrls(newPreviews);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const newSelected = [...selectedFiles];
    const newPreviews = [...previewUrls];
    
    if (newPreviews[index] !== 'pdf') {
      URL.revokeObjectURL(newPreviews[index]);
    }
    
    newSelected.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setSelectedFiles(newSelected);
    setPreviewUrls(newPreviews);
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto pt-16 px-8 pb-32 flex flex-col scrollbar-thin">

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
              <div className="space-y-16">
                {messages.map((msg, idx) => {
                  const role = (msg.role ?? 'user') as Message['role'];
                  const isUser = role === 'user' || role === 'admin';

                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'items-start space-x-5 max-w-[85%]'}`}>

                      {/* AI avatar icon */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 mt-6">
                          <span className="text-stone-50 text-xs font-bold">AI</span>
                        </div>
                      )}

                      {isUser ? (
                        <div className="flex flex-col items-end gap-1 max-w-[85%]">
                          {/* ── User message header: name + role badge ── */}
                          <div className="flex items-center justify-end pr-1">
                            <span className="text-xs font-medium text-stone-500">{userName}</span>
                            {getRoleBadge(role)}
                          </div>

                          {/* ── User bubble ── */}
                          <div className={`rounded-3xl px-8 py-5 text-stone-800 text-lg leading-[1.75] ${
                            role === 'admin' ? 'bg-amber-50 border border-amber-200' : 'bg-stone-100'
                          }`}>
                            {/* Attached files */}
                            {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-3">
                                {msg.attachedFiles.map((f, i) => (
                                  f.type.startsWith('image/') ? (
                                    <div key={i} className="flex flex-col">
                                      <img
                                        src={f.url}
                                        alt={`Attached ${f.name}`}
                                        className="h-24 w-auto rounded-xl object-cover shadow-md border border-stone-200 transition-all duration-300"
                                      />
                                    </div>
                                  ) : (
                                    <div key={i} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-xl shadow-sm text-sm text-stone-600">
                                      <FileText size={16} className="text-red-500" />
                                      <span className="truncate max-w-[150px]" title={f.name}>{f.name}</span>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 w-full max-w-full">
                          {/* ── AI message header: BridgeAI + badge ── */}
                          <div className="flex items-center pl-1">
                            <span className="text-xs font-medium text-stone-500">BridgeAI</span>
                            {getRoleBadge('ai')}
                          </div>

                          <div className="prose prose-lg prose-stone max-w-none text-stone-800 text-lg leading-[1.75] overflow-hidden">
                            {/* Status badge — shown while agents are working */}
                            {msg.statusText && (
                              <div className="mb-3 inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 animate-pulse">
                                {msg.statusText}
                              </div>
                            )}

                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-6 rounded-xl border border-stone-200 shadow-sm w-full">
                                    <table className="w-full text-left border-collapse" {...props} />
                                  </div>
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead className="bg-stone-100 text-stone-500 uppercase text-xs font-bold" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                  <th className="px-4 py-3 border-b border-stone-200 whitespace-nowrap" {...props} />
                                ),
                                td: ({ node, children, ...props }) => {
                                  // Helper to check for percentages/numbers
                                  const checkPercentage = (child: any): boolean => {
                                    if (typeof child === 'string') {
                                      if (child.includes('%')) return true;
                                      if (/^\d{1,3}\.\d+$/.test(child.trim())) return true; // matches e.g. 30.0
                                    } else if (Array.isArray(child)) {
                                      return child.some(checkPercentage);
                                    } else if (child?.props?.children) {
                                      return checkPercentage(child.props.children);
                                    }
                                    return false;
                                  };
                                  
                                  const isPercentage = checkPercentage(children);
                                  
                                  return (
                                    <td className={`px-4 py-3 text-sm ${isPercentage ? 'font-bold text-amber-700' : ''}`} {...props}>
                                      {children}
                                    </td>
                                  );
                                },
                                tr: ({ node, ...props }) => (
                                  <tr className="border-b border-stone-100 last:border-0 hover:bg-amber-50/30 even:bg-stone-50/50 transition-colors" {...props} />
                                ),
                                p: ({ node, children, ...props }) => {
                                  // We can attach the blinking cursor to the last paragraph if streaming
                                  return <p className="mb-4 last:mb-0" {...props}>{children}</p>;
                                }
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>

                            {/* Streaming Cursor placed directly after content */}
                            {msg.isStreaming && (
                              <span className="inline-block w-2.5 h-5 bg-stone-400 ml-1 translate-y-1 animate-pulse rounded-[1px]" />
                            )}

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
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading indicator — shown before the first token arrives */}
                {loading && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
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
        <div className="max-w-3xl mx-auto">

          {/* ── Image preview strip — visible only when files are staged ── */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap items-start gap-3">
              {selectedFiles.map((file, i) => (
                <div key={i} className="relative group/thumb inline-block">
                  {file.type === 'application/pdf' ? (
                    <div className="h-16 w-16 bg-white rounded-xl shadow-sm border border-amber-200 ring-1 ring-amber-100 flex flex-col items-center justify-center transition-all duration-300 relative">
                      <FileText size={20} className="text-red-500 mb-1" />
                      <span className="text-[9px] text-stone-500 truncate w-14 text-center px-1">{file.name}</span>
                    </div>
                  ) : (
                    <img
                      src={previewUrls[i]}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl object-cover shadow-sm border border-amber-200 ring-1 ring-amber-100 transition-all duration-300"
                    />
                  )}
                  {/* X remove button — appears on hover */}
                  <button
                    onClick={() => removeFile(i)}
                    title="Remove file"
                    className="absolute -top-2 -right-2 w-5 h-5 bg-stone-800 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-500 transition-colors duration-200 opacity-0 group-hover/thumb:opacity-100"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <span className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center gap-1 self-start">
                <Paperclip size={10} /> {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* ── Input row ── */}
          <div className="relative flex items-center group">

            {!isLoggedIn && (
              <div className="absolute inset-0 bg-stone-100/60 backdrop-blur-[2px] rounded-full z-20 flex items-center justify-center cursor-not-allowed">
                <span className="text-sm font-medium text-stone-600 flex items-center gap-2">
                  <Lock size={14} /> Sign In to Chat
                </span>
              </div>
            )}

            {/* Hidden file input — triggered by Paperclip button */}
            <input
              ref={fileInputRef}
              id="vision-file-input"
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Mic button */}
            <button
              onClick={toggleRecording}
              disabled={!isLoggedIn || isTranscribing}
              className="absolute left-3 w-10 h-10 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors z-10 disabled:opacity-50"
            >
              {isRecording ? <StopCircle size={20} className="text-red-500 animate-pulse" /> : <Mic size={20} />}
            </button>

            {/* Paperclip / attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isLoggedIn || loading || isTranscribing || selectedFiles.length >= 3}
              title="Attach documents"
              className={`absolute left-14 w-8 h-8 flex items-center justify-center rounded-full transition-colors z-10 disabled:opacity-50
                ${selectedFiles.length > 0
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  : 'text-stone-400 hover:text-amber-600'
                }`}
            >
              <Paperclip size={17} />
            </button>

            {/* Text input — left padding widened to accommodate both left buttons */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading || !isLoggedIn || isTranscribing}
              placeholder={
                isTranscribing
                  ? '✨ Transcribing...'
                  : isRecording
                    ? 'Recording audio...'
                    : selectedFiles.length > 1
                      ? 'Analyze these documents...'
                      : selectedFiles.length === 1 && selectedFiles[0].type === 'application/pdf'
                        ? 'Ask about this PDF document...'
                        : selectedFiles.length === 1
                          ? 'Ask about this invoice...'
                          : 'Reply to BridgeAI...'
              }
              className="w-full bg-white border border-stone-200 rounded-full py-4 pl-24 pr-14 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-transparent transition-all placeholder:text-stone-400 text-stone-800 disabled:opacity-50"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !isLoggedIn}
              className="absolute right-3 w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white hover:bg-stone-700 transition-colors disabled:opacity-50 z-10"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
        <div className="text-center mt-3 text-xs text-stone-400">
          BridgeAI can make mistakes. Please verify critical customs decisions.
        </div>
      </div>
    </div>
  );
}

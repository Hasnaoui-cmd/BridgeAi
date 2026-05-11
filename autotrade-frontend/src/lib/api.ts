export interface ChatResponse {
  answer: string;
  sources?: string[];
  error?: string;
  agent?: string;
}

export const API_URL = 'http://localhost:8000';

export async function getHistory(sessionId: string) {
  const res = await fetch(`${API_URL}/history/${sessionId}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function getSession() {
  const res = await fetch(`${API_URL}/api/auth/session`);
  if (!res.ok) throw new Error('Failed to get session');
  return res.json();
}

export async function getRecentSessions(userId: string) {
  const res = await fetch(`${API_URL}/sessions/${userId}`);
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

export async function clearHistory(sessionId: string) {
  const res = await fetch(`${API_URL}/history/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
  return res.json();
}

export async function sendMessage(question: string, sessionId: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function sendAudioMessage(audioBlob: Blob, sessionId: string) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_memo.webm');
  formData.append('session_id', sessionId);
  const res = await fetch(`${API_URL}/audio-chat`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to send audio');
  return res.json();
}

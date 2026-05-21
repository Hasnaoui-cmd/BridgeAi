// ─────────────────────────────────────────────────────────────────
// API Service Layer — Aligned with FastAPI SSE Backend
//
// The backend streams Server-Sent Events for /chat and /audio-chat/stream.
// This module provides:
//   1. Helper types for the SSE event payloads
//   2. streamChat()      — SSE streaming for text chat
//   3. streamAudioChat() — SSE streaming for voice chat
//   4. getHistory()      — JSON fetch for chat history
//   5. getRecentSessions() / clearHistory() — unchanged helpers
// ─────────────────────────────────────────────────────────────────

export const API_URL = 'http://localhost:8000';

// ── SSE Event Types emitted by the backend ──
export interface SSETokenEvent {
  type: 'token';
  content: string;
}

export interface SSEStatusEvent {
  type: 'status';
  content: string;
}

export interface SSEDoneEvent {
  type: 'done';
  sources: string[];
  agents: string;
}

export interface SSETranscriptionEvent {
  type: 'transcription';
  content: string;
}

export type SSEEvent = SSETokenEvent | SSEStatusEvent | SSEDoneEvent | SSETranscriptionEvent;

// ── Callbacks for the streaming consumer ──
export interface StreamCallbacks {
  onToken: (text: string) => void;
  onStatus: (status: string) => void;
  onDone: (sources: string[], agents: string) => void;
  onTranscription?: (text: string) => void;
  onError: (error: string) => void;
}

// ── Internal SSE line parser ──
async function consumeSSEStream(response: Response, callbacks: StreamCallbacks) {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('Response body is empty — no stream available.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newlines
      const parts = buffer.split('\n\n');
      // The last element may be an incomplete frame — keep it in the buffer
      buffer = parts.pop() || '';

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data: SSEEvent = JSON.parse(jsonStr);

            switch (data.type) {
              case 'token':
                callbacks.onToken(data.content);
                break;
              case 'status':
                callbacks.onStatus(data.content);
                break;
              case 'done':
                callbacks.onDone(data.sources || [], data.agents || '');
                break;
              case 'transcription':
                callbacks.onTranscription?.(data.content);
                break;
            }
          } catch {
            // Skip malformed JSON chunks silently
          }
        }
      }
    }
  } catch (err: any) {
    callbacks.onError(err.message || 'Stream reading failed');
  } finally {
    reader.releaseLock();
  }
}

// ─────────────────────────────────────────────
// 1. Text Chat — POST /chat (SSE stream)
// ─────────────────────────────────────────────
export async function streamChat(
  question: string,
  sessionId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, session_id: sessionId }),
  });

  if (!res.ok) {
    callbacks.onError(`Server responded with ${res.status}`);
    return;
  }

  await consumeSSEStream(res, callbacks);
}

// ─────────────────────────────────────────────
// 2. Audio Transcribe — POST /audio-chat/transcribe (JSON)
// ─────────────────────────────────────────────
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_memo.webm');

  const res = await fetch(`${API_URL}/audio-chat/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.transcription;
}

// ─────────────────────────────────────────────
// 2.b Audio Chat — POST /audio-chat/stream (SSE stream)
// ─────────────────────────────────────────────
export async function streamAudioChat(
  audioBlob: Blob,
  sessionId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_memo.webm');
  formData.append('session_id', sessionId);

  const res = await fetch(`${API_URL}/audio-chat/stream`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    callbacks.onError(`Server responded with ${res.status}`);
    return;
  }

  await consumeSSEStream(res, callbacks);
}

// ─────────────────────────────────────────────
// 3. History — GET /history/{session_id} (JSON)
// ─────────────────────────────────────────────
export async function getHistory(sessionId: string) {
  const res = await fetch(`${API_URL}/history/${sessionId}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function getPredictionHistory() {
  const res = await fetch(`${API_URL}/api/predict/history`);
  if (!res.ok) throw new Error('Failed to load prediction history');
  return res.json();
}

// ─────────────────────────────────────────────
// 4. Recent Sessions — GET /sessions/{userId} (JSON)
// ─────────────────────────────────────────────
export async function getRecentSessions(userId: string) {
  const res = await fetch(`${API_URL}/sessions/${userId}`);
  if (!res.ok) throw new Error('Failed to load sessions');
  return res.json();
}

// ─────────────────────────────────────────────
// 5. Clear History — DELETE /history/{session_id}
// ─────────────────────────────────────────────
export async function clearHistory(sessionId: string) {
  const res = await fetch(`${API_URL}/history/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
  return res.json();
}

// ─────────────────────────────────────────────
// 7. Prediction Chat — POST /api/predict/chat (JSON)
// ─────────────────────────────────────────────
export interface PredictionShapCause {
  factor: string;
  impact_days: number;
  direction: string;
}

export interface PredictionData {
  delay_days: number;
  shap_causes: PredictionShapCause[];
  detailed_analysis?: string | null;
  document_warning: string | null;
  variables: {
    direction: string;
    transport_mode: string;
    weight: number;
    origin: string;
    destination: string;
  } | null;
}

export interface PredictionResponse {
  status: 'waiting_for_info' | 'success';
  message: string;
  prediction_data: PredictionData | null;
}

export async function predictChat(
  conversationHistory: { role: string; content: string }[],
  message: string,
  currentPrediction?: PredictionData | null
): Promise<PredictionResponse> {
  const res = await fetch(`${API_URL}/api/predict/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_history: conversationHistory,
      message,
      current_prediction: currentPrediction || null,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Server responded with ${res.status}: ${errText}`);
  }

  return res.json();
}

// ─────────────────────────────────────────────
// 8. Vision Chat — POST /chat/vision (SSE stream, multipart/form-data)
//    Expects: { file: File, question: string, session_id: string }
// ─────────────────────────────────────────────
export async function streamVisionChat(
  file: File,
  question: string,
  sessionId: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('question', question);
  formData.append('session_id', sessionId);

  // NOTE: Do NOT set Content-Type header — the browser must set it automatically
  // so the multipart boundary is included correctly.
  const res = await fetch(`${API_URL}/chat/vision`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    callbacks.onError(`Server responded with ${res.status}`);
    return;
  }

  await consumeSSEStream(res, callbacks);
}
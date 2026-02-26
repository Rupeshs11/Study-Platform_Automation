import client from './client';
import type { ApiResponse, ChatSession, ChatMessage, ChatMessageRequest } from '../types';

export const chatApi = {
  getSessions: () =>
    client.get<ApiResponse<ChatSession[]>>('/chat/sessions'),

  getMessages: (sessionId: string) =>
    client.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`),

  deleteSession: (sessionId: string) =>
    client.delete<ApiResponse<void>>(`/chat/sessions/${sessionId}`),

  updateSession: (sessionId: string, title: string) =>
    client.patch<ApiResponse<ChatSession>>(`/chat/sessions/${sessionId}`, { title }),
};

// ── SSE streaming helper ──

export interface StreamCallbacks {
  onSession: (data: { sessionId: string; isNew: boolean }) => void;
  onContent: (content: string) => void;
  onThinking: (content: string) => void;
  onDone: (data: { sessionId: string; model: string }) => void;
  onError: (message: string) => void;
}

export async function streamChatMessage(
  request: ChatMessageRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    callbacks.onError(`Request failed: ${response.status}`);
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || ''; // keep incomplete event in buffer

    for (const part of parts) {
      const lines = part.split('\n');
      let eventType = '';
      let data = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          data = line.slice(5).trim();
        }
      }

      if (eventType && data) {
        try {
          const parsed = JSON.parse(data);
          switch (eventType) {
            case 'session':
              callbacks.onSession(parsed);
              break;
            case 'content':
              callbacks.onContent(parsed.content);
              break;
            case 'thinking':
              callbacks.onThinking(parsed.content);
              break;
            case 'done':
              callbacks.onDone(parsed);
              break;
            case 'error':
              callbacks.onError(parsed.message);
              break;
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  }
}

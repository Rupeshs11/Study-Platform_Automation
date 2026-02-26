import client from './client';
import type { ApiResponse, RoadmapRequest, RoadmapResponse, ContentResponse } from '../types';

export const roadmapApi = {
  create: (data: RoadmapRequest) =>
    client.post<ApiResponse<RoadmapResponse>>('/roadmaps', data),

  createStreaming: async (
    data: RoadmapRequest,
    onThinking: (content: string) => void,
    onTopic: (topic: any) => void,
    onComplete: (data: { roadmapId: string; totalTopics: number }) => void,
    onError: (error: Error) => void
  ) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/roadmaps/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          let eventMatch;
          while ((eventMatch = buffer.match(/^event: (.+)\ndata: (.+)\n\n/m))) {
            const fullMatch = eventMatch[0];
            const event = eventMatch[1];
            const eventData = eventMatch[2];
            
            try {
              const parsedData = JSON.parse(eventData);
              if (event === 'thinking') {
                onThinking(parsedData.content);
              } else if (event === 'topic') {
                onTopic(parsedData);
              } else if (event === 'complete') {
                onComplete(parsedData);
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
            
            buffer = buffer.slice(eventMatch.index! + fullMatch.length);
          }
        }
      }
    } catch (err: any) {
      onError(err);
    }
  },

  getAll: () =>
    client.get<ApiResponse<RoadmapResponse[]>>('/roadmaps'),

  getById: (id: string) =>
    client.get<ApiResponse<RoadmapResponse>>(`/roadmaps/${id}`),

  start: (id: string) =>
    client.post<ApiResponse<RoadmapResponse>>(`/roadmaps/${id}/start`),

  delete: (id: string) =>
    client.delete<ApiResponse<void>>(`/roadmaps/${id}`),

  generateContent: (topicId: string, contentType: string = 'THEORY') =>
    client.post<ApiResponse<ContentResponse>>(`/roadmaps/topics/${topicId}/generate-content?contentType=${contentType}`),
};

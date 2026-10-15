import { deleteFetcher, getFetcher, postFetcher } from '@/api/global-fetcher';
import type { ApiResult } from '@/types/api';

export interface AiConfig {
  configured: boolean;
  provider: string;
  model: string;
  capabilities: string[];
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const getAiConfig = (): Promise<ApiResult<AiConfig>> => getFetcher('/ai/config');
export const getConversations = (): Promise<ApiResult<Conversation[]>> =>
  getFetcher('/ai/conversations');
export const createConversation = (title: string): Promise<ApiResult<Conversation>> =>
  postFetcher('/ai/conversations', { title });
export const deleteConversation = (id: number): Promise<ApiResult<void>> =>
  deleteFetcher(`/ai/conversations/${id}`);
export const getMessages = (id: number): Promise<ApiResult<ChatMessage[]>> =>
  getFetcher(`/ai/conversations/${id}/messages`);
export const sendMessage = (
  id: number,
  content: string,
): Promise<
  ApiResult<{ userMessage: ChatMessage; assistantMessage: ChatMessage; conversation: Conversation }>
> => postFetcher(`/ai/conversations/${id}/messages`, { content });

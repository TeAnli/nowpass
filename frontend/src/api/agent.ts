import { apiRequest } from '@/lib/api'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentPendingAction {
  tool: string
  title: string
  summary: string
  args: Record<string, unknown>
}

export interface AgentReply {
  reply: string
  provider: string
  pendingActions: AgentPendingAction[]
}

export interface AgentExecuteResult {
  tool: string
  success: boolean
  message: string
}

export const agentApi = {
  chat: (message: string, history: AgentMessage[]) =>
    apiRequest<AgentReply>('/api/admin/agent/chat', {
      method: 'POST',
      body: { message, history: history.slice(-8) },
    }),
  execute: (actions: AgentPendingAction[]) =>
    apiRequest<{ results: AgentExecuteResult[] }>('/api/admin/agent/execute', {
      method: 'POST',
      body: { actions },
    }),
}

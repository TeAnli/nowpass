import { apiRequest, apiStream } from '@/lib/api'

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

export interface AgentStep {
  index: number
  round: number
  tool: string
  write: boolean
  args: string
  result: string
  durationMs: number
  success: boolean
  status: 'running' | 'done'
}

export interface AgentTable {
  title: string
  columns: string[]
  rows: string[][]
}

export interface AgentReply {
  reply: string
  provider: string
  pendingActions: AgentPendingAction[]
  steps: AgentStep[]
  tables: AgentTable[]
}

export interface AgentRunSnapshot {
  id: string
  status: 'running' | 'done' | 'error'
  reply: string
  provider: string
  error: string | null
  currentTool: string | null
  steps: AgentStep[]
  tables: AgentTable[]
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
  startRun: (message: string, history: AgentMessage[]) =>
    apiRequest<{ runId: string }>('/api/admin/agent/runs', {
      method: 'POST',
      body: { message, history: history.slice(-8) },
    }),
  stream: (
    message: string,
    history: AgentMessage[],
    onEvent: (event: string, data: unknown) => void,
    signal?: AbortSignal,
  ) =>
    apiStream(
      '/api/admin/agent/stream',
      { method: 'POST', body: { message, history: history.slice(-8) }, signal },
      onEvent,
    ),
  runSnapshot: (runId: string) => apiRequest<AgentRunSnapshot>(`/api/admin/agent/runs/${runId}`),
  execute: (actions: AgentPendingAction[]) =>
    apiRequest<{ results: AgentExecuteResult[] }>('/api/admin/agent/execute', {
      method: 'POST',
      body: { actions },
    }),
}

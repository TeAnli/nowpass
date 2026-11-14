import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AgentExecuteResult, AgentPendingAction, AgentStep, AgentTable } from '@/api/agent'

export interface AgentTurn {
  id: number
  role: 'user' | 'assistant'
  content: string
  steps: AgentStep[]
  tables: AgentTable[]
  pending: AgentPendingAction[]
  results?: AgentExecuteResult[]
  streaming?: boolean
  currentTool?: string | null
  error?: string
}

interface AgentChatState {
  turns: AgentTurn[]
  busy: boolean
  seq: number
  appendTurn: (turn: Omit<AgentTurn, 'id'>) => number
  patchTurn: (id: number, updater: (turn: AgentTurn) => AgentTurn) => void
  setBusy: (busy: boolean) => void
  clear: () => void
}

const MAX_TURNS = 40

/**
 * 智能体会话状态。
 *
 * 放在 store 而不是页面 state：切路由时页面会卸载，但对话要保留。
 * 持久化到 sessionStorage：刷新后还在，关标签页后清空。
 */
export const useAgentChat = create<AgentChatState>()(
  persist(
    (set, get) => ({
      turns: [],
      busy: false,
      seq: 0,

      appendTurn: (turn) => {
        const id = get().seq + 1
        set((state) => ({
          seq: id,
          turns: [...state.turns, { ...turn, id }].slice(-MAX_TURNS),
        }))
        return id
      },

      patchTurn: (id, updater) => {
        set((state) => ({
          turns: state.turns.map((turn) => (turn.id === id ? updater(turn) : turn)),
        }))
      },

      setBusy: (busy) => set({ busy }),

      clear: () => set({ turns: [], busy: false, seq: 0 }),
    }),
    {
      name: 'nowpass.agent.chat',
      storage: createJSONStorage(() => sessionStorage),
      // busy 不持久化：刷新后不可能还有正在跑的流
      partialize: (state) => ({ turns: state.turns, seq: state.seq }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // 刷新会中断流式请求，把残留的「进行中」标记清掉，避免一直转圈
        state.turns = state.turns.map((turn) =>
          turn.streaming ? { ...turn, streaming: false, currentTool: null } : turn,
        )
        state.busy = false
      },
    },
  ),
)

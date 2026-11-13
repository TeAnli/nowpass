import { useEffect, useState } from 'react'
import { App as AntApp, Button, Input, Skeleton, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AiUsageItem } from '@nowpass/api-contracts'
import { adminAiApi } from '@/api/ai'
import { AppIcon } from '@/components/AppIcon'
import { ErrorState } from '@/components/ErrorState'
import { formatDate } from '@/lib/format'
import { AdminPageHeader } from './AdminPageHeader'

const SCENE_LABEL: Record<string, string> = { interview: 'AI 面试', support: 'AI 客服' }

export function AdminAiPage() {
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const overview = useQuery({ queryKey: ['admin-ai-overview'], queryFn: adminAiApi.overview })
  const prompts = useQuery({ queryKey: ['admin-ai-prompts'], queryFn: adminAiApi.prompts })
  const usage = useQuery({ queryKey: ['admin-ai-usage'], queryFn: () => adminAiApi.usage(1, 20) })

  const activePrompt = prompts.data?.find((item) => item.key === selectedKey) ?? prompts.data?.[0] ?? null

  useEffect(() => {
    if (activePrompt) setDraft(activePrompt.content)
  }, [activePrompt])

  const savePrompt = useMutation({
    mutationFn: () => adminAiApi.updatePrompt(activePrompt!.key, draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] })
      message.success('提示词已保存')
    },
    onError: (error) => message.error(error instanceof Error ? error.message : '保存失败'),
  })

  const columns: ColumnsType<AiUsageItem> = [
    { title: '时间', dataIndex: 'createTime', width: 160, render: (value: string) => formatDate(value) },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 100,
      render: (value: string) => <Tag bordered={false} className="tag-plain">{SCENE_LABEL[value] ?? value}</Tag>,
    },
    { title: '模型', dataIndex: 'provider', width: 120, render: (value: string | null) => value ?? '—' },
    { title: '用户', dataIndex: 'userId', width: 90, render: (value: number | null) => value ?? '—' },
    {
      title: '结果',
      dataIndex: 'success',
      width: 90,
      render: (value: boolean) => (value
        ? <Tag bordered={false} color="green">成功</Tag>
        : <Tag bordered={false} color="red">失败</Tag>),
    },
    { title: '输入字数', dataIndex: 'promptChars', width: 100 },
    { title: '回复字数', dataIndex: 'replyChars', width: 100 },
    { title: '耗时', dataIndex: 'latencyMs', width: 100, render: (value: number) => `${value} ms` },
  ]

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
  }

  const data = overview.data

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="AI / OPERATIONS"
        title="AI 管理"
        description="查看模型与语音状态、编辑提示词、观察调用用量。密钥不会在这里显示。"
      />

      {overview.isPending ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : (
        <div className="ai-cards">
          <div className="ai-card">
            <p className="eyebrow">INTERVIEW MODEL</p>
            <strong>{data?.interviewConfigured ? (data.interviewModel ?? '已配置') : '未配置'}</strong>
            <span>provider：{data?.interviewProvider ?? '—'}</span>
            <Tag bordered={false} color={data?.interviewConfigured ? 'green' : 'default'}>
              {data?.interviewConfigured ? '可用' : '本地降级'}
            </Tag>
          </div>
          <div className="ai-card">
            <p className="eyebrow">VOICE (TTS)</p>
            <strong>{data?.ttsEnabled ? '已启用' : '未启用'}</strong>
            <span>provider：{data?.ttsProvider ?? '—'} · voice：{data?.ttsVoice ?? '—'}</span>
            <Tag bordered={false} color={data?.ttsEnabled ? 'green' : 'default'}>
              {data?.ttsEnabled ? 'AI 人声' : '浏览器语音'}
            </Tag>
          </div>
          <div className="ai-card">
            <p className="eyebrow">USAGE</p>
            <strong>{data?.usage.totalCalls ?? 0} 次调用</strong>
            <span>
              面试 {data?.usage.interviewCalls ?? 0} · 客服 {data?.usage.supportCalls ?? 0} ·
              失败 {data?.usage.failedCalls ?? 0}
            </span>
            <span>平均耗时 {data?.usage.avgLatencyMs ?? 0} ms</span>
          </div>
        </div>
      )}

      <section className="ai-section">
        <div className="ai-section__head">
          <div>
            <p className="eyebrow">PROMPTS</p>
            <h2>提示词</h2>
          </div>
          <Button
            type="primary"
            icon={<AppIcon icon="lucide:save" size={15} />}
            loading={savePrompt.isPending}
            disabled={!activePrompt || draft.trim() === activePrompt.content.trim()}
            onClick={() => savePrompt.mutate()}
          >
            保存
          </Button>
        </div>
        {prompts.isPending ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <>
            <div className="ai-prompt-tabs">
              {prompts.data?.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activePrompt?.key === item.key ? 'ai-prompt-tab is-active' : 'ai-prompt-tab'}
                  onClick={() => setSelectedKey(item.key)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {activePrompt?.description && <p className="ai-prompt-hint">{activePrompt.description}</p>}
            <Input.TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoSize={{ minRows: 12, maxRows: 24 }}
              className="ai-prompt-editor"
              aria-label="提示词内容"
            />
          </>
        )}
      </section>

      <section className="ai-section">
        <div className="ai-section__head">
          <div>
            <p className="eyebrow">CALL LOG</p>
            <h2>最近调用</h2>
          </div>
          <Button icon={<AppIcon icon="lucide:refresh-cw" size={15} />} onClick={() => void usage.refetch()}>
            刷新
          </Button>
        </div>
        <Table
          rowKey="id"
          size="small"
          loading={usage.isPending}
          columns={columns}
          dataSource={usage.data?.rows ?? []}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </section>
    </div>
  )
}

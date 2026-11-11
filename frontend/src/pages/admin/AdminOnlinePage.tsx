import { App as AntApp, Button, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { OnlineSession } from '@nowpass/api-contracts'
import { formatDateTime } from '@/lib/format'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

export function AdminOnlinePage() {
  const user = useAuthStore((state) => state.user)
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const sessions = useQuery({
    queryKey: ['admin-online'],
    queryFn: adminApi.listOnlineSessions,
    refetchInterval: 30_000,
  })
  const kickMutation = useMutation({
    mutationFn: adminApi.forceLogout,
    onSuccess: () => {
      message.success('该会话已强制下线')
      void queryClient.invalidateQueries({ queryKey: ['admin-online'] })
    },
  })

  const columns: ColumnsType<OnlineSession> = [
    {
      title: '用户',
      dataIndex: 'username',
      render: (username: string, record) => (
        <div className="table-title-cell">
          <strong>{record.nickname || username}</strong>
          <span className="mono">@{username} · ID {record.userId}</span>
        </div>
      ),
    },
    { title: '登录 IP', dataIndex: 'loginIp', width: 160, render: (ip: string) => <span className="mono">{ip}</span> },
    { title: '登录时间', dataIndex: 'loginTime', width: 180, render: (value: number) => formatDateTime(value) },
    { title: '过期时间', dataIndex: 'expireAt', width: 180, render: (value: number) => formatDateTime(value) },
    {
      title: '会话',
      dataIndex: 'tokenId',
      width: 150,
      render: (tokenId: string) => <span className="mono muted">{tokenId.slice(0, 8)}…</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) =>
        hasPermission(user, PERMISSIONS.onlineForceLogout) ? (
          <Button
            danger
            type="link"
            size="small"
            loading={kickMutation.isPending && kickMutation.variables === record.tokenId}
            onClick={() => kickMutation.mutate(record.tokenId)}
          >
            强制下线
          </Button>
        ) : (
          <span className="muted">只读</span>
        ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="SESSIONS / 在线"
        title="在线会话"
        description="每行代表一个有效 Redis 会话。强制下线会立即删除该会话，用户下一次请求就会收到 401。"
      />
      {sessions.isError ? (
        <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
      ) : (
        <div className="table-scroll surface-card">
          <Table<OnlineSession>
            rowKey="tokenId"
            columns={columns}
            dataSource={sessions.data ?? []}
            loading={sessions.isPending}
            pagination={false}
            locale={{ emptyText: '当前没有在线会话' }}
          />
        </div>
      )}
      <Space className="admin-footnote">
        <Tag bordered={false}>每 30 秒刷新</Tag>
        <span className="muted">会话 token 只显示前 8 位，完整值不会进入页面日志。</span>
      </Space>
    </div>
  )
}

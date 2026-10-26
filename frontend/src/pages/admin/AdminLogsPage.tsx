import { useMemo, useState } from 'react'
import { Input, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { OperLogItem } from '@/types/api'
import { formatDateTime, formatDuration } from '@/lib/format'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

export function AdminLogsPage() {
  const [page, setPage] = useState(1)
  const [title, setTitle] = useState('')
  const [operName, setOperName] = useState('')
  const [status, setStatus] = useState<string | undefined>()

  const query = useMemo(
    () => ({ page, pageSize: 10, title: title || null, operName: operName || null, status: status || null }),
    [operName, page, status, title],
  )
  const logs = useQuery({ queryKey: ['admin-logs', query], queryFn: () => adminApi.listOperLogs(query) })

  const columns: ColumnsType<OperLogItem> = [
    {
      title: '操作',
      dataIndex: 'title',
      render: (value: string, record) => (
        <div className="table-title-cell">
          <strong>{value}</strong>
          <span className="mono">{record.requestMethod ?? '—'} · {record.businessType}</span>
        </div>
      ),
    },
    { title: '操作人', dataIndex: 'operName', width: 120, render: (value: string | null) => value ?? '—' },
    { title: 'IP', dataIndex: 'operIp', width: 140, render: (value: string | null) => <span className="mono">{value ?? '—'}</span> },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: OperLogItem['status']) => (
        <Tag color={value === 'success' ? 'green' : 'red'} bordered={false}>
          {value === 'success' ? '成功' : '失败'}
        </Tag>
      ),
    },
    { title: '耗时', dataIndex: 'costTime', width: 100, render: (value: number | null) => formatDuration(value) },
    { title: '时间', dataIndex: 'operTime', width: 170, render: (value: string | null) => formatDateTime(value) },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="AUDIT TRAIL / 日志"
        title="操作日志"
        description="所有后台写操作都会异步落库。失败记录展开可以看到错误摘要，方便定位接口问题。"
      />
      <section className="admin-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined aria-hidden="true" />}
          placeholder="搜索操作名称…"
          aria-label="搜索操作名称"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setPage(1)
          }}
          className="admin-search"
        />
        <Input
          allowClear
          placeholder="操作人"
          aria-label="按操作人筛选"
          value={operName}
          onChange={(event) => {
            setOperName(event.target.value)
            setPage(1)
          }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          aria-label="按状态筛选"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={[
            { value: 'success', label: '成功' },
            { value: 'fail', label: '失败' },
          ]}
        />
      </section>

      {logs.isError ? (
        <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
      ) : (
        <div className="table-scroll surface-card">
          <Table<OperLogItem>
            rowKey="id"
            columns={columns}
            dataSource={logs.data?.rows ?? []}
            loading={logs.isPending}
            pagination={{
              current: logs.data?.page ?? page,
              pageSize: 10,
              total: logs.data?.total ?? 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            expandable={{
              rowExpandable: (record) => Boolean(record.errorMsg),
              expandedRowRender: (record) => (
                <pre className="log-error" tabIndex={0}>
                  {record.errorMsg}
                </pre>
              ),
            }}
            locale={{ emptyText: '没有匹配的操作日志' }}
          />
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AppIcon } from '@/components/AppIcon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { CreateUserCommand, UserListItem } from '@/types/api'
import { formatDate } from '@/lib/format'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

const STATUS_META = {
  active: { label: '正常', color: 'green' },
  pending: { label: '待审批', color: 'gold' },
  disabled: { label: '已停用', color: 'red' },
} as const

export function AdminUsersPage() {
  const currentUser = useAuthStore((state) => state.user)
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleUser, setRoleUser] = useState<UserListItem | null>(null)
  const [roleValue, setRoleValue] = useState<string>()
  const [resetUser, setResetUser] = useState<UserListItem | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null)
  const [createForm] = Form.useForm<CreateUserCommand>()
  const [passwordForm] = Form.useForm<{ newPassword: string }>()

  const query = useMemo(() => ({ page, pageSize: 10, keyword: keyword || null, status: status || null }), [keyword, page, status])
  const users = useQuery({ queryKey: ['admin-users', query], queryFn: () => adminApi.listUsers(query) })
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: adminApi.listRoles })
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: UserListItem['status'] }) => adminApi.changeUserStatus(id, next),
    onSuccess: () => {
      message.success('用户状态已更新')
      invalidate()
    },
  })
  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      message.success('账号已创建，可直接登录')
      setCreateOpen(false)
      createForm.resetFields()
      invalidate()
    },
  })
  const roleMutation = useMutation({
    mutationFn: () => adminApi.changeUserRole(roleUser!.id, roleValue!),
    onSuccess: () => {
      message.success('角色已更新，该用户旧会话已失效')
      setRoleUser(null)
      invalidate()
    },
  })
  const resetMutation = useMutation({
    mutationFn: () => adminApi.resetUserPassword(resetUser!.id, passwordForm.getFieldValue('newPassword')),
    onSuccess: () => {
      message.success('密码已重置，用户需要重新登录')
      setResetUser(null)
      passwordForm.resetFields()
      invalidate()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      message.success('账号已删除')
      setDeleteUser(null)
      invalidate()
    },
  })

  const columns: ColumnsType<UserListItem> = [
    {
      title: '用户',
      dataIndex: 'username',
      render: (username: string, record) => (
        <div className="table-title-cell">
          <strong>{record.nickname || username}</strong>
          <span className="mono">@{username}</span>
        </div>
      ),
    },
    { title: '邮箱', dataIndex: 'email', width: 220 },
    {
      title: '角色',
      dataIndex: 'roleKeys',
      width: 140,
      render: (keys: string[]) => keys?.map((key) => <Tag key={key} bordered={false}>{key}</Tag>) ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: UserListItem['status']) => (
        <Tag color={STATUS_META[value].color} bordered={false}>{STATUS_META[value].label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', width: 150, render: (value: string | null) => formatDate(value) },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      render: (_, record) => {
        const isSelf = record.id === currentUser?.id
        const isSuperadmin = record.roleKeys?.includes('superadmin')
        return (
          <Space size={2} wrap>
            {record.status === 'pending' && hasPermission(currentUser, PERMISSIONS.userApprove) && (
              <Button type="link" size="small" onClick={() => statusMutation.mutate({ id: record.id, next: 'active' })}>
                通过审批
              </Button>
            )}
            {record.status === 'active' && !isSelf && hasPermission(currentUser, PERMISSIONS.userApprove) && (
              <Button type="link" size="small" danger onClick={() => statusMutation.mutate({ id: record.id, next: 'disabled' })}>
                停用
              </Button>
            )}
            {record.status === 'disabled' && hasPermission(currentUser, PERMISSIONS.userApprove) && (
              <Button type="link" size="small" onClick={() => statusMutation.mutate({ id: record.id, next: 'active' })}>
                启用
              </Button>
            )}
            {hasPermission(currentUser, PERMISSIONS.userEdit) && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setRoleUser(record)
                  setRoleValue(record.roleKeys?.[0])
                }}
              >
                改角色
              </Button>
            )}
            {hasPermission(currentUser, PERMISSIONS.userResetPwd) && (
              <Button type="link" size="small" onClick={() => setResetUser(record)}>
                重置密码
              </Button>
            )}
            {hasPermission(currentUser, PERMISSIONS.userRemove) && (
              <Button
                type="link"
                size="small"
                danger
                disabled={isSelf || isSuperadmin}
                onClick={() => setDeleteUser(record)}
              >
                删除
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="PEOPLE / 用户"
        title="用户管理"
        description="开放注册但需要审批。停用、改角色和重置密码都会立即结束该用户的现有会话。"
        actions={
          hasPermission(currentUser, PERMISSIONS.userAdd) ? (
            <Button
              type="primary"
              icon={<AppIcon icon="lucide:plus" size={16} />}
              onClick={() => {
                createForm.resetFields()
                setCreateOpen(true)
              }}
            >
              新建账号
            </Button>
          ) : undefined
        }
      />

      <Tabs
        activeKey={status}
        onChange={(key) => {
          setStatus(key)
          setPage(1)
        }}
        items={[
          { key: '', label: '全部' },
          { key: 'pending', label: '待审批' },
          { key: 'active', label: '正常' },
          { key: 'disabled', label: '已停用' },
        ]}
      />

      <section className="admin-toolbar">
        <Input
          allowClear
          prefix={<AppIcon icon="lucide:search" size={17} />}
          placeholder="搜索用户名、昵称或邮箱…"
          aria-label="搜索用户"
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value)
            setPage(1)
          }}
          className="admin-search"
        />
      </section>

      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : (
        <div className="table-scroll surface-card">
          <Table<UserListItem>
            rowKey="id"
            columns={columns}
            dataSource={users.data?.rows ?? []}
            loading={users.isPending}
            pagination={{
              current: users.data?.page ?? page,
              pageSize: 10,
              total: users.data?.total ?? 0,
              showSizeChanger: false,
              onChange: setPage,
            }}
            locale={{ emptyText: '没有匹配的用户' }}
          />
        </div>
      )}

      <Modal
        open={createOpen}
        title="新建账号"
        okText="创建"
        cancelText="取消"
        confirmLoading={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void createForm.validateFields().then((values) => createMutation.mutate(values))}
      >
        <Form form={createForm} layout="vertical" requiredMark="optional" initialValues={{ roleKey: 'user' }}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, max: 30, message: '3~30 个字符' }]}>
            <Input autoComplete="username" spellCheck={false} />
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input autoComplete="nickname" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}>
            <Input type="email" autoComplete="email" spellCheck={false} />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入初始密码' }, { min: 8, max: 64, message: '8~64 位' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '需包含字母和数字' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="角色" name="roleKey" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={(roles.data ?? []).map((role) => ({ value: role.roleKey, label: role.roleName }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={roleUser !== null}
        title="修改用户角色"
        okText="保存"
        cancelText="取消"
        confirmLoading={roleMutation.isPending}
        onCancel={() => setRoleUser(null)}
        onOk={() => (roleValue ? roleMutation.mutate() : message.warning('请选择角色'))}
      >
        <p>修改角色会让该用户现有会话失效，需要重新登录。</p>
        <Select
          style={{ width: '100%' }}
          value={roleValue}
          onChange={setRoleValue}
          aria-label="选择新角色"
          options={(roles.data ?? []).map((role) => ({ value: role.roleKey, label: role.roleName }))}
        />
      </Modal>

      <Modal
        open={resetUser !== null}
        title="重置密码"
        okText="重置"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: resetMutation.isPending }}
        onCancel={() => setResetUser(null)}
        onOk={() => void passwordForm.validateFields().then(() => resetMutation.mutate())}
      >
        <p>为 <strong>{resetUser?.username}</strong> 设置新密码，旧会话会立刻失效。</p>
        <Form form={passwordForm} layout="vertical" requiredMark="optional">
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true, message: '请输入新密码' }, { min: 8, max: 64, message: '8~64 位' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '需包含字母和数字' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={deleteUser !== null}
        title="删除用户？"
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
        onCancel={() => setDeleteUser(null)}
        onOk={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
      >
        <p>删除后不可恢复。不能删除自己或超级管理员。</p>
        <p className="mono">@{deleteUser?.username}</p>
      </Modal>
    </div>
  )
}

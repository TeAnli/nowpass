import { useState } from 'react'
import { App as AntApp, Button, Form, Input, InputNumber, Modal, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminVideoApi } from '@/api/videos'
import { AppIcon } from '@/components/AppIcon'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth'
import type { VideoCategory } from '@nowpass/api-contracts'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

interface CategoryFormValues {
  name: string
  sort: number
}

export function AdminVideoCategoriesPage() {
  const user = useAuthStore((state) => state.user)
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<CategoryFormValues>()
  const [editing, setEditing] = useState<VideoCategory | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<VideoCategory | null>(null)

  const categories = useQuery({ queryKey: ['admin-video-categories'], queryFn: adminVideoApi.listCategories })
  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (editing) await adminVideoApi.updateCategory(editing.id, values.name, values.sort)
      else await adminVideoApi.createCategory(values.name, values.sort)
    },
    onSuccess: () => {
      message.success(editing ? '视频分类已更新' : '视频分类已创建')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-video-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['video-categories'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: adminVideoApi.deleteCategory,
    onSuccess: () => {
      message.success('视频分类已删除')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-video-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['video-categories'] })
    },
    onError: (error) => message.error(error instanceof Error ? error.message : '删除失败'),
  })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: (categories.data?.length ?? 0) + 1 })
    setModalOpen(true)
  }
  const openEdit = (category: VideoCategory) => {
    setEditing(category)
    form.setFieldsValue({ name: category.name, sort: category.sort })
    setModalOpen(true)
  }

  const columns: ColumnsType<VideoCategory> = [
    {
      title: '分类',
      dataIndex: 'name',
      render: (name: string, record) => (
        <div className="table-title-cell">
          <strong>{name}</strong>
          <span className="mono">SORT {record.sort}</span>
        </div>
      ),
    },
    { title: '视频数', dataIndex: 'videoCount', width: 100 },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space>
          {hasPermission(user, PERMISSIONS.videoCategoryEdit) && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          )}
          {hasPermission(user, PERMISSIONS.videoCategoryRemove) && (
            <Button type="link" size="small" danger onClick={() => setDeleting(record)}>删除</Button>
          )}
        </Space>
      ),
    },
  ]

  if (categories.isError) {
    return <ErrorState title="视频分类加载失败" onRetry={() => void categories.refetch()} />
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="VIDEO TAXONOMY"
        title="视频分类"
        description="独立于题目分类的视频内容分类。分类下仍有视频时不能删除。"
        actions={hasPermission(user, PERMISSIONS.videoCategoryAdd) ? (
          <Button type="primary" icon={<AppIcon icon="lucide:plus" size={16} />} onClick={openCreate}>新增分类</Button>
        ) : undefined}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={categories.data ?? []}
        loading={categories.isPending}
        pagination={false}
      />

      <Modal
        title={editing ? '编辑视频分类' : '新增视频分类'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void saveMutation.mutateAsync(values)}>
          <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入分类名称' }, { max: 50 }]}>
            <Input placeholder="例如：系统设计" />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序值' }]}>
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="删除视频分类"
        open={Boolean(deleting)}
        onCancel={() => setDeleting(null)}
        onOk={() => deleting && void deleteMutation.mutateAsync(deleting.id)}
        okButtonProps={{ danger: true }}
        confirmLoading={deleteMutation.isPending}
      >
        <p>确认删除「{deleting?.name}」？分类下仍有视频时服务端会拒绝删除。</p>
      </Modal>
    </div>
  )
}

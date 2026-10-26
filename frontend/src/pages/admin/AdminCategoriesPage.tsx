import { useState } from 'react'
import { App as AntApp, Button, Form, Input, InputNumber, Modal, Space, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { QuestionCategory } from '@/types/api'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

interface CategoryFormValues { name: string; sort: number }

export function AdminCategoriesPage() {
  const user = useAuthStore((state) => state.user)
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<CategoryFormValues>()
  const [editing, setEditing] = useState<QuestionCategory | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<QuestionCategory | null>(null)

  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.listCategories })
  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      if (editing) await adminApi.updateCategory(editing.id, values.name, values.sort)
      else await adminApi.createCategory(values.name, values.sort)
    },
    onSuccess: () => {
      message.success(editing ? '分类已更新' : '分类已创建')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      message.success('分类已删除')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: (categories.data?.length ?? 0) + 1 })
    setModalOpen(true)
  }
  const openEdit = (category: QuestionCategory) => {
    setEditing(category)
    form.setFieldsValue({ name: category.name, sort: category.sort })
    setModalOpen(true)
  }

  const columns: ColumnsType<QuestionCategory> = [
    {
      title: '分类',
      dataIndex: 'name',
      render: (name: string, record) => (
        <div className="table-title-cell"><strong>{name}</strong><span className="mono">SORT {record.sort}</span></div>
      ),
    },
    { title: '题目数', dataIndex: 'questionCount', width: 120, render: (count: number) => `${count} 道` },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          {hasPermission(user, PERMISSIONS.categoryEdit) && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>重命名</Button>
          )}
          {hasPermission(user, PERMISSIONS.categoryRemove) && (
            <Tooltip title={record.questionCount > 0 ? `该分类下还有 ${record.questionCount} 道题，先移走题目` : undefined}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} disabled={record.questionCount > 0} onClick={() => setDeleting(record)}>删除</Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="TAXONOMY / 分类"
        title="分类管理"
        description="分类是题库的目录。仍有题目的分类不能直接删除，避免误删整个主题。"
        actions={hasPermission(user, PERMISSIONS.categoryAdd) ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建分类</Button> : undefined}
      />
      {categories.isError ? (
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      ) : (
        <div className="table-scroll surface-card">
          <Table<QuestionCategory> rowKey="id" columns={columns} dataSource={categories.data ?? []} loading={categories.isPending} pagination={false} locale={{ emptyText: '还没有分类' }} />
        </div>
      )}
      <Modal open={modalOpen} title={editing ? '编辑分类' : '新建分类'} okText="保存" cancelText="取消" confirmLoading={saveMutation.isPending} onCancel={() => setModalOpen(false)} onOk={() => void form.validateFields().then((values) => saveMutation.mutate(values))}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }, { max: 40, message: '最多 40 个字符' }]}>
            <Input placeholder="例如 JVM / Kotlin / 数据库" />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序值' }]}>
            <InputNumber min={0} max={9999} style={{ width: '100%' }} aria-label="分类排序" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={deleting !== null} title="删除这个分类？" okText="删除" cancelText="取消" okButtonProps={{ danger: true, loading: deleteMutation.isPending }} onCancel={() => setDeleting(null)} onOk={() => deleting && deleteMutation.mutate(deleting.id)}>
        <p>删除后不可恢复。该分类目前没有题目。</p>
        <p className="mono">{deleting?.name}</p>
      </Modal>
    </div>
  )
}

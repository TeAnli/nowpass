import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminVideoApi } from '@/api/videos'
import { AppIcon } from '@/components/AppIcon'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { formatDate, formatVideoDuration } from '@/lib/format'
import { useAuthStore } from '@/store/auth'
import type { VideoAdminItem, VideoCategory, VideoUpsertCommand } from '@nowpass/api-contracts'
import { AdminPageHeader } from './AdminPageHeader'
import { ErrorState } from '@/components/ErrorState'

interface VideoFormValues {
  title: string
  description?: string
  speaker?: string
  categoryId: number
  questionId?: number
  tags?: string
}

function splitTags(value?: string): string[] {
  return (value ?? '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)
}

function uploadToMinio(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`上传失败（HTTP ${xhr.status}）`))
    }
    xhr.onerror = () => reject(new Error('上传失败，请检查 MinIO CORS 与网络连接'))
    xhr.send(file)
  })
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const element = document.createElement('video')
    element.preload = 'metadata'
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(Number.isFinite(element.duration) ? Math.round(element.duration) : 0)
    }
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(0)
    }
    element.src = objectUrl
  })
}

export function AdminVideosPage() {
  const user = useAuthStore((state) => state.user)
  const { message, modal } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<VideoFormValues>()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VideoAdminItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [mediaTarget, setMediaTarget] = useState<VideoAdminItem | null>(null)
  const [mediaVideo, setMediaVideo] = useState<File | null>(null)
  const [mediaCover, setMediaCover] = useState<File | null>(null)

  const categories = useQuery({ queryKey: ['admin-video-categories'], queryFn: adminVideoApi.listCategories })
  const videos = useQuery({
    queryKey: ['admin-videos', page, status],
    queryFn: () => adminVideoApi.list({ page, pageSize: 10, status }),
  })

  useEffect(() => {
    if (!uploading) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [uploading])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
    void queryClient.invalidateQueries({ queryKey: ['videos'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (values: VideoFormValues) => {
      if (!editing) return
      const command: VideoUpsertCommand = {
        title: values.title,
        description: values.description,
        speaker: values.speaker,
        categoryId: values.categoryId,
        questionId: values.questionId,
        tags: splitTags(values.tags),
      }
      await adminVideoApi.update(editing.id, command)
    },
    onSuccess: () => {
      message.success('视频信息已更新')
      setModalOpen(false)
      invalidate()
    },
  })

  const openCreate = () => {
    setEditing(null)
    setVideoFile(null)
    setCoverFile(null)
    setUploadPercent(0)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: VideoAdminItem) => {
    setEditing(record)
    setVideoFile(null)
    setCoverFile(null)
    setUploadPercent(0)
    form.setFieldsValue({
      title: record.title,
      description: record.description ?? undefined,
      speaker: record.speaker ?? undefined,
      categoryId: record.categoryId,
      questionId: record.questionId ?? undefined,
      tags: record.tags.join(', '),
    })
    setModalOpen(true)
  }

  const submitForm = async (values: VideoFormValues) => {
    setSaving(true)
    try {
      if (editing) {
        await saveMutation.mutateAsync(values)
        return
      }
      if (!videoFile) {
        message.warning('请选择 MP4 视频文件')
        return
      }
      if (videoFile.size > 500 * 1024 * 1024) {
        message.error('视频不能超过 500MB')
        return
      }
      if (coverFile && coverFile.size > 5 * 1024 * 1024) {
        message.error('封面不能超过 5MB')
        return
      }

      const command: VideoUpsertCommand = {
        title: values.title,
        description: values.description,
        speaker: values.speaker,
        categoryId: values.categoryId,
        questionId: values.questionId,
        tags: splitTags(values.tags),
      }
      const id = await adminVideoApi.create(command)
      setUploading(true)
      setUploadPercent(0)
      const duration = await readVideoDuration(videoFile)
      const videoTicket = await adminVideoApi.uploadUrl(id, 'video', 'video/mp4')
      await uploadToMinio(videoTicket.uploadUrl, videoFile, setUploadPercent)
      if (coverFile) {
        const coverTicket = await adminVideoApi.uploadUrl(id, 'cover', coverFile.type)
        await uploadToMinio(coverTicket.uploadUrl, coverFile, () => undefined)
      }
      await adminVideoApi.finalize(id, duration)
      message.success('视频已上传，当前为草稿，确认预览后发布')
      setModalOpen(false)
      invalidate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setUploading(false)
      setSaving(false)
      setUploadPercent(0)
    }
  }

  const uploadMedia = async () => {
    if (!mediaTarget || (!mediaVideo && !mediaCover)) {
      message.warning('请选择视频或封面文件')
      return
    }
    setUploading(true)
    setUploadPercent(0)
    try {
      let duration = mediaTarget.durationSeconds
      if (mediaVideo) {
        duration = await readVideoDuration(mediaVideo)
        const ticket = await adminVideoApi.uploadUrl(mediaTarget.id, 'video', 'video/mp4')
        await uploadToMinio(ticket.uploadUrl, mediaVideo, setUploadPercent)
      }
      if (mediaCover) {
        const ticket = await adminVideoApi.uploadUrl(mediaTarget.id, 'cover', mediaCover.type)
        await uploadToMinio(ticket.uploadUrl, mediaCover, () => undefined)
      }
      await adminVideoApi.finalize(mediaTarget.id, duration)
      message.success('媒体已更新，视频回到草稿状态')
      setMediaTarget(null)
      setMediaVideo(null)
      setMediaCover(null)
      invalidate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败，草稿已保留')
    } finally {
      setUploading(false)
      setUploadPercent(0)
    }
  }

  const publish = async (record: VideoAdminItem) => {
    try {
      await adminVideoApi.publish(record.id)
      message.success('视频已发布')
      invalidate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发布失败')
    }
  }

  const offline = async (record: VideoAdminItem) => {
    try {
      await adminVideoApi.offline(record.id)
      message.success('视频已下线')
      invalidate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '下线失败')
    }
  }

  const preview = async (record: VideoAdminItem) => {
    try {
      const result = await adminVideoApi.previewUrl(record.id)
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '预览地址生成失败')
    }
  }

  const remove = (record: VideoAdminItem) => {
    modal.confirm({
      title: '删除视频',
      content: `确认删除「${record.title}」？对象会在 24 小时后清理。`,
      okButtonProps: { danger: true },
      onOk: async () => {
        await adminVideoApi.remove(record.id)
        message.success('视频已删除')
        invalidate()
      },
    })
  }

  const cleanup = async () => {
    try {
      const result = await adminVideoApi.cleanup()
      message.success(`清理完成：草稿 ${result.deletedDrafts} 个，对象 ${result.deletedObjects} 个`)
      invalidate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清理失败')
    }
  }

  const columns: ColumnsType<VideoAdminItem> = [
    {
      title: '视频',
      dataIndex: 'title',
      render: (_title: string, record) => (
        <div className="admin-video-title">
          <span className="admin-video-thumb">
            {record.coverUrl ? <img src={record.coverUrl} alt="" /> : <AppIcon icon="lucide:clapperboard" size={18} />}
          </span>
          <div>
            <strong>{record.title}</strong>
            <span>{record.categoryName ?? '未分类'} · {record.speaker || '未填写讲师'}</span>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: VideoAdminItem['status']) => {
        const label = value === 'published' ? '已发布' : value === 'offline' ? '已下线' : '草稿'
        const color = value === 'published' ? 'green' : value === 'offline' ? 'default' : 'gold'
        return <Tag color={color}>{label}</Tag>
      },
    },
    {
      title: '时长 / 大小',
      width: 140,
      render: (_, record) => (
        <span className="mono admin-video-stat">
          {formatVideoDuration(record.durationSeconds)}<br />
          {record.sizeBytes > 0 ? `${(record.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '未上传'}
        </span>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      width: 130,
      render: (value: string | null) => formatDate(value),
    },
    {
      title: '操作',
      width: 230,
      render: (_, record) => (
        <Space size={2} wrap>
          <Tooltip title="预览">
            <Button type="text" size="small" icon={<AppIcon icon="lucide:play" size={15} />} onClick={() => void preview(record)} />
          </Tooltip>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          {hasPermission(user, PERMISSIONS.videoEdit) && (
            <Button type="link" size="small" onClick={() => { setMediaTarget(record); setMediaVideo(null); setMediaCover(null) }}>上传</Button>
          )}
          {hasPermission(user, PERMISSIONS.videoPublish) && (record.status === 'published' ? (
            <Button type="link" size="small" onClick={() => void offline(record)}>下线</Button>
          ) : (
            <Button type="link" size="small" onClick={() => void publish(record)}>发布</Button>
          ))}
          {hasPermission(user, PERMISSIONS.videoRemove) && (
            <Button type="link" size="small" danger onClick={() => remove(record)}>删除</Button>
          )}
        </Space>
      ),
    },
  ]

  const categoryOptions = useMemo(
    () => (categories.data ?? []).map((category: VideoCategory) => ({ value: category.id, label: category.name })),
    [categories.data],
  )

  if (videos.isError) return <ErrorState title="视频列表加载失败" onRetry={() => void videos.refetch()} />

  return (
    <div>
      <AdminPageHeader
        eyebrow="VIDEO LIBRARY"
        title="视频讲解"
        description="上传 MP4 到 MinIO 私有桶，维护封面、分类与发布状态。"
        actions={(
          <Space>
            <Select
              allowClear
              value={status}
              onChange={(value) => { setStatus(value); setPage(1) }}
              placeholder="全部状态"
              style={{ width: 120 }}
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
                { value: 'offline', label: '已下线' },
              ]}
            />
            {hasPermission(user, PERMISSIONS.videoEdit) && <Button onClick={() => void cleanup()}>清理孤儿</Button>}
            {hasPermission(user, PERMISSIONS.videoAdd) && (
              <Button type="primary" icon={<AppIcon icon="lucide:plus" size={16} />} onClick={openCreate}>新增视频</Button>
            )}
          </Space>
        )}
      />
      <Alert
        className="admin-video-hint"
        type="info"
        showIcon
        message="上传顺序：先创建草稿，再通过预签名直传 MinIO；确认对象后发布。单视频上限 500MB。"
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={videos.data?.rows ?? []}
        loading={videos.isPending}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: videos.data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Modal
        title={editing ? '编辑视频信息' : '新增视频'}
        open={modalOpen}
        onCancel={() => { if (!saving) setModalOpen(false) }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? '保存' : '创建并上传'}
        width={620}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submitForm(values)}>
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }, { max: 200 }]}>
            <Input placeholder="例如：JVM 垃圾回收器怎么选？" />
          </Form.Item>
          <Form.Item label="简介" name="description">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={2000} showCount />
          </Form.Item>
          <div className="admin-form-row">
            <Form.Item label="讲师" name="speaker">
              <Input placeholder="张老师 · 后端工程师" maxLength={100} />
            </Form.Item>
            <Form.Item label="视频分类" name="categoryId" rules={[{ required: true, message: '请选择分类' }]}>
              <Select options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
          </div>
          <div className="admin-form-row">
            <Form.Item label="关联题目 ID（可选）" name="questionId">
              <InputNumber min={1} style={{ width: '100%' }} placeholder="例如 12" />
            </Form.Item>
            <Form.Item label="标签（逗号分隔）" name="tags">
              <Input placeholder="JVM, GC, 面试高频" />
            </Form.Item>
          </div>
          {!editing && (
            <>
              <Form.Item label="视频文件（MP4，≤500MB）" required>
                <input
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                />
              </Form.Item>
              <Form.Item label="封面（JPG/PNG/WebP，≤5MB，可选）">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                />
              </Form.Item>
            </>
          )}
          {uploading && <Progress percent={uploadPercent} status="active" />}
        </Form>
      </Modal>

      <Modal
        title="上传 / 替换媒体"
        open={Boolean(mediaTarget)}
        onCancel={() => { if (!uploading) setMediaTarget(null) }}
        onOk={() => void uploadMedia()}
        confirmLoading={uploading}
        okText="上传并确认"
        destroyOnHidden
      >
        <p className="muted">替换视频或封面后，视频会回到草稿状态；发布前请重新预览。</p>
        <Form layout="vertical">
          <Form.Item label="替换视频（MP4，≤500MB）">
            <input type="file" accept="video/mp4,.mp4" onChange={(event) => setMediaVideo(event.target.files?.[0] ?? null)} />
          </Form.Item>
          <Form.Item label="替换封面（JPG/PNG/WebP，≤5MB）">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setMediaCover(event.target.files?.[0] ?? null)} />
          </Form.Item>
        </Form>
        {uploading && <Progress percent={uploadPercent} status="active" />}
      </Modal>
    </div>
  )
}

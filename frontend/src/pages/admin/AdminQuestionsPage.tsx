import { useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Drawer, Form, Input, Modal, Select, Skeleton, Space, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { AppIcon } from '@/components/AppIcon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { Difficulty, QuestionListItem, QuestionOption, QuestionUpsertCommand } from '@nowpass/api-contracts'
import { difficultyLabel } from '@/lib/format'
import { PERMISSIONS, hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth'
import { AdminPageHeader } from './AdminPageHeader'
import { MarkdownView } from '@/components/MarkdownView'
import { ErrorState } from '@/components/ErrorState'

interface EditorValues {
  title: string
  categoryId: number
  difficulty: Difficulty
  tags: string[]
  contentMd: string
  answerMd: string
  kind: 'short' | 'choice'
}

function QuestionEditor({ questionId, open, onClose, onSaved }: {
  questionId: number | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm<EditorValues>()
  const [options, setOptions] = useState<QuestionOption[]>([])
  const [answerKey, setAnswerKey] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { message } = AntApp.useApp()
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.listCategories })
  const detail = useQuery({
    queryKey: ['admin-question', questionId],
    queryFn: () => adminApi.getQuestion(questionId as number),
    enabled: open && questionId !== null,
  })
  const answer = useQuery({
    queryKey: ['admin-answer', questionId],
    queryFn: () => adminApi.getAnswer(questionId as number),
    enabled: open && questionId !== null,
  })
  const save = useMutation({
    mutationFn: async (values: QuestionUpsertCommand) => {
      if (questionId === null) await adminApi.createQuestion(values)
      else await adminApi.updateQuestion(questionId, values)
    },
    onSuccess: () => {
      message.success(questionId === null ? '题目已创建' : '题目已更新')
      onSaved()
    },
  })

  useEffect(() => {
    if (!open) return
    setErrorMessage(null)
    if (questionId === null) {
      form.resetFields()
      form.setFieldsValue({ kind: 'short', difficulty: 'easy', tags: [] })
      setOptions([])
      setAnswerKey('')
    }
  }, [form, open, questionId])

  useEffect(() => {
    if (!open || !detail.data) return
    form.setFieldsValue({
      title: detail.data.title,
      categoryId: detail.data.categoryId,
      difficulty: detail.data.difficulty,
      tags: detail.data.tags ?? [],
      contentMd: detail.data.contentMd,
      answerMd: answer.data?.answerMd ?? '',
      kind: detail.data.options?.length ? 'choice' : 'short',
    })
    setOptions(detail.data.options ?? [])
    setAnswerKey(answer.data?.answerKey ?? '')
  }, [answer.data, detail.data, form, open])

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    let normalizedOptions: QuestionOption[] | null = null
    let normalizedKey: string | null = null
    if (values.kind === 'choice') {
      const clean = options
        .map((option) => ({ key: option.key.trim().toUpperCase(), text: option.text.trim() }))
        .filter((option) => option.key && option.text)
      const keys = clean.map((option) => option.key)
      const key = answerKey.trim().toUpperCase()
      if (clean.length < 2) return setErrorMessage('选择题至少需要两个有内容的选项。')
      if (new Set(keys).size !== keys.length) return setErrorMessage('选项键不能重复。')
      if (!key || Array.from(key).some((char) => !keys.includes(char))) {
        return setErrorMessage('答案键必须非空，且每个字符都要对应已有选项。')
      }
      normalizedOptions = clean
      normalizedKey = key
    }
    setErrorMessage(null)
    save.mutate({
      categoryId: values.categoryId,
      difficulty: values.difficulty,
      title: values.title.trim(),
      contentMd: values.contentMd,
      answerMd: values.answerMd,
      options: normalizedOptions,
      answerKey: normalizedKey,
      tags: values.tags ?? [],
    })
  }

  const kind = Form.useWatch('kind', form)
  const contentMd = Form.useWatch('contentMd', form) ?? ''
  const updateOption = (index: number, field: keyof QuestionOption, value: string) => {
    setOptions((current) => current.map((option, i) => (i === index ? { ...option, [field]: value } : option)))
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      title={questionId === null ? '新建题目' : '编辑题目'}
      extra={<Space><Button onClick={onClose}>取消</Button><Button type="primary" loading={save.isPending} onClick={() => void submit()}>保存题目</Button></Space>}
      destroyOnHidden
    >
      {detail.isPending && questionId !== null ? <Skeleton active paragraph={{ rows: 12 }} /> : detail.isError ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional">
          {errorMessage && <div className="form-error-banner" role="alert">{errorMessage}</div>}
          <Form.Item label="题目标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如 Kotlin 中哪个关键字声明只读引用？" maxLength={200} showCount />
          </Form.Item>
          <div className="editor-two-col">
            <Form.Item label="分类" name="categoryId" rules={[{ required: true, message: '请选择分类' }]}>
              <Select options={(categories.data ?? []).map((item) => ({ value: item.id, label: item.name }))} placeholder="选择分类" />
            </Form.Item>
            <Form.Item label="难度" name="difficulty" rules={[{ required: true }]}>
              <Select options={[{ value: 'easy', label: '基础' }, { value: 'medium', label: '进阶' }, { value: 'hard', label: '深入' }]} />
            </Form.Item>
          </div>
          <Form.Item label="标签" name="tags"><Select mode="tags" tokenSeparators={[',', '，']} placeholder="输入标签后回车" /></Form.Item>
          <Form.Item label="题目类型" name="kind" rules={[{ required: true }]}>
            <Tabs size="small" activeKey={kind ?? 'short'} onChange={(next) => form.setFieldValue('kind', next)} items={[{ key: 'short', label: '简答 / 无选项' }, { key: 'choice', label: '选择题' }]} />
          </Form.Item>
          <div className="markdown-workbench">
            <div className="markdown-workbench__head"><span>题干 / Markdown 与预览</span></div>
            <div className="markdown-workbench__split">
              <Form.Item name="contentMd" noStyle rules={[{ required: true, message: '请输入题干' }]}>
                <Input.TextArea className="markdown-editor" rows={12} placeholder="支持 Markdown，代码块用三反引号包裹。" spellCheck={false} />
              </Form.Item>
              <div className="markdown-preview"><span className="eyebrow">PREVIEW</span><MarkdownView>{contentMd}</MarkdownView></div>
            </div>
          </div>
          <Form.Item label="标准答案 / Markdown" name="answerMd" rules={[{ required: true, message: '请输入答案' }]}>
            <Input.TextArea className="markdown-editor" rows={10} placeholder="把答案写清楚，支持 Markdown。" spellCheck={false} />
          </Form.Item>
          {kind === 'choice' && (
            <section className="choice-editor" aria-labelledby="choice-editor-title">
              <div className="choice-editor__head">
                <div><h3 id="choice-editor-title">选项与答案键</h3><p>选项与答案键必须成对出现；多选可填 AC。</p></div>
                <Button size="small" icon={<AppIcon icon="lucide:plus" size={15} />} onClick={() => setOptions((current) => [...current, { key: String.fromCharCode(65 + current.length), text: '' }])}>添加选项</Button>
              </div>
              {options.map((option, index) => (
                <div className="option-editor-row" key={index}>
                  <Input value={option.key} onChange={(event) => updateOption(index, 'key', event.target.value)} aria-label={`选项 ${index + 1} 的键`} maxLength={2} className="option-key-input" />
                  <Input value={option.text} onChange={(event) => updateOption(index, 'text', event.target.value)} placeholder={`选项 ${index + 1} 的内容`} aria-label={`选项 ${index + 1} 的内容`} />
                  <Button type="text" danger aria-label={`删除选项 ${index + 1}`} icon={<AppIcon icon="lucide:trash-2" size={15} />} onClick={() => setOptions((current) => current.filter((_, i) => i !== index))} />
                </div>
              ))}
              <Form.Item label="答案键" required style={{ marginTop: 16 }}>
                <Input value={answerKey} onChange={(event) => setAnswerKey(event.target.value.toUpperCase())} placeholder="例如 A 或 AC" maxLength={12} aria-label="答案键" />
              </Form.Item>
            </section>
          )}
        </Form>
      )}
    </Drawer>
  )
}

export function AdminQuestionsPage() {
  const user = useAuthStore((state) => state.user)
  const { message } = AntApp.useApp()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<QuestionListItem | null>(null)

  const query = useMemo(() => ({ page, pageSize: 10, keyword: keyword || null, categoryId, difficulty }), [categoryId, difficulty, keyword, page])
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: adminApi.listCategories })
  const questions = useQuery({ queryKey: ['admin-questions', query], queryFn: () => adminApi.listQuestions(query) })
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteQuestion,
    onSuccess: () => {
      message.success('题目已删除')
      setDeleting(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const columns: ColumnsType<QuestionListItem> = [
    { title: '题目', dataIndex: 'title', render: (title: string, record) => <div className="table-title-cell"><strong>{title}</strong><span className="mono">#{String(record.id).padStart(3, '0')}</span></div> },
    { title: '分类', dataIndex: 'categoryName', width: 130, render: (value: string | null) => value ?? '—' },
    { title: '难度', dataIndex: 'difficulty', width: 100, render: (value: Difficulty) => difficultyLabel(value) },
    { title: '标签', dataIndex: 'tags', width: 180, render: (tags: string[]) => tags.length ? tags.map((tag) => <Tag key={tag} bordered={false}>{tag}</Tag>) : '—' },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_, record) => (
        <Space size={4}>
          {hasPermission(user, PERMISSIONS.questionEdit) && <Button type="link" size="small" icon={<AppIcon icon="lucide:pencil" size={15} />} onClick={() => { setEditingId(record.id); setEditorOpen(true) }}>编辑</Button>}
          {hasPermission(user, PERMISSIONS.questionRemove) && <Button type="link" size="small" danger icon={<AppIcon icon="lucide:trash-2" size={15} />} onClick={() => setDeleting(record)}>删除</Button>}
        </Space>
      ),
    },
  ]

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="QUESTION BANK / 题目"
        title="题目管理"
        description="题目正文与答案分开维护。列表只显示摘要，编辑区支持 Markdown 预览。"
        actions={hasPermission(user, PERMISSIONS.questionAdd) ? <Button type="primary" icon={<AppIcon icon="lucide:plus" size={16} />} onClick={() => { setEditingId(null); setEditorOpen(true) }}>新建题目</Button> : undefined}
      />
      <section className="admin-toolbar" aria-label="题目筛选">
        <Input allowClear prefix={<AppIcon icon="lucide:search" size={17} />} placeholder="搜索题目标题…" aria-label="搜索题目标题" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} className="admin-search" />
        <Select allowClear placeholder="全部分类" aria-label="按分类筛选" value={categoryId ?? undefined} onChange={(value) => { setCategoryId(value ?? null); setPage(1) }} options={(categories.data ?? []).map((item) => ({ value: item.id, label: item.name }))} />
        <Select allowClear placeholder="全部难度" aria-label="按难度筛选" value={difficulty ?? undefined} onChange={(value) => { setDifficulty((value as Difficulty | undefined) ?? null); setPage(1) }} options={[{ value: 'easy', label: '基础' }, { value: 'medium', label: '进阶' }, { value: 'hard', label: '深入' }]} />
      </section>
      {questions.isError ? <ErrorState error={questions.error} onRetry={() => void questions.refetch()} /> : (
        <div className="table-scroll surface-card">
          <Table<QuestionListItem>
            rowKey="id"
            columns={columns}
            dataSource={questions.data?.rows ?? []}
            loading={questions.isPending}
            pagination={{ current: questions.data?.page ?? page, pageSize: 10, total: questions.data?.total ?? 0, showSizeChanger: false, onChange: setPage }}
            locale={{ emptyText: '没有匹配的题目' }}
          />
        </div>
      )}
      <QuestionEditor questionId={editingId} open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={() => {
        setEditorOpen(false)
        void queryClient.invalidateQueries({ queryKey: ['admin-questions'] })
        void queryClient.invalidateQueries({ queryKey: ['categories'] })
      }} />
      <Modal open={deleting !== null} title="删除这道题？" okText="删除" cancelText="取消" okButtonProps={{ danger: true, loading: deleteMutation.isPending }} onCancel={() => setDeleting(null)} onOk={() => deleting && deleteMutation.mutate(deleting.id)}>
        <p>题目会从题库和后台同时移除，操作不可撤销。</p>
        <p className="mono">{deleting?.title}</p>
      </Modal>
    </div>
  )
}

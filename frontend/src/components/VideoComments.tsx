import { useState } from 'react'
import { App as AntApp, Button, Empty, Input, Pagination, Popconfirm } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppIcon } from '@/components/AppIcon'
import { videoApi } from '@/api/videos'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 10

interface VideoCommentsProps {
  videoId: number
}

export function VideoComments({ videoId }: VideoCommentsProps) {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [page, setPage] = useState(1)
  const [content, setContent] = useState('')

  const comments = useQuery({
    queryKey: ['video-comments', videoId, page],
    queryFn: () => videoApi.comments(videoId, page, PAGE_SIZE),
  })

  const addComment = useMutation({
    mutationFn: (text: string) => videoApi.addComment(videoId, text),
    onSuccess: () => {
      setContent('')
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] })
      message.success('评论已发布')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '评论发布失败')
    },
  })

  const removeComment = useMutation({
    mutationFn: (commentId: number) => videoApi.removeComment(videoId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] })
      message.success('评论已删除')
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const submit = () => {
    const text = content.trim()
    if (!text) {
      message.warning('先写点什么再发布')
      return
    }
    addComment.mutate(text)
  }

  const rows = comments.data?.rows ?? []
  const total = comments.data?.total ?? 0

  return (
    <section className="video-comments" aria-labelledby="video-comments-title">
      <div className="video-comments__head">
        <div>
          <p className="eyebrow">DISCUSSION</p>
          <h2 id="video-comments-title">评论 <span className="mono">{total}</span></h2>
        </div>
      </div>

      {user ? (
        <div className="video-comment-form">
          <Input.TextArea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="说说你的理解、疑问或补充…"
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={500}
            showCount
          />
          <div className="video-comment-form__actions">
            <span className="mono">以 {user.nickname} 的身份评论</span>
            <Button type="primary" loading={addComment.isPending} onClick={submit}>
              发布评论
            </Button>
          </div>
        </div>
      ) : (
        <p className="video-comments__login">
          <Link to="/login">登录</Link> 后可以参与评论。
        </p>
      )}

      {comments.isPending && <p className="muted">正在读取评论…</p>}
      {comments.isError && <p className="muted">评论加载失败，请刷新重试。</p>}
      {!comments.isPending && rows.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有评论，来写第一条。" />
      )}

      <ol className="video-comment-list">
        {rows.map((comment) => {
          const canDelete = user?.id === comment.userId || user?.canEnterAdmin
          return (
            <li className="video-comment" key={comment.id}>
              <span className="video-comment__avatar" aria-hidden="true">
                {comment.nickname.slice(0, 1).toUpperCase()}
              </span>
              <div className="video-comment__body">
                <div className="video-comment__meta">
                  <strong>{comment.nickname}</strong>
                  <time>{formatDate(comment.createTime)}</time>
                  {canDelete && (
                    <Popconfirm
                      title="删除这条评论？"
                      okText="删除"
                      cancelText="保留"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => removeComment.mutate(comment.id)}
                    >
                      <Button type="text" size="small" className="video-comment__delete" aria-label="删除评论">
                        <AppIcon icon="lucide:trash-2" size={13} />
                      </Button>
                    </Popconfirm>
                  )}
                </div>
                <p>{comment.content}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {total > PAGE_SIZE && (
        <Pagination
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </section>
  )
}

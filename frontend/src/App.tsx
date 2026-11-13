import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { AuthGate, RequireAdmin } from '@/components/AuthGate'
import { PageLoader } from '@/components/PageLoader'
import { UserLayout } from '@/layouts/UserLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { AUTH_EXPIRED_EVENT } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
)
const QqCallbackPage = lazy(() =>
  import('@/pages/auth/QqCallbackPage').then((module) => ({ default: module.QqCallbackPage })),
)
const QuestionListPage = lazy(() =>
  import('@/pages/user/QuestionListPage').then((module) => ({ default: module.QuestionListPage })),
)
const HomePage = lazy(() => import('@/pages/user/HomePage').then((module) => ({ default: module.HomePage })))
const TopicsPage = lazy(() => import('@/pages/user/TopicsPage').then((module) => ({ default: module.TopicsPage })))
const VideoListPage = lazy(() =>
  import('@/pages/user/VideoListPage').then((module) => ({ default: module.VideoListPage })),
)
const VideoDetailPage = lazy(() =>
  import('@/pages/user/VideoDetailPage').then((module) => ({ default: module.VideoDetailPage })),
)
const RoadmapPage = lazy(() => import('@/pages/user/RoadmapPage').then((module) => ({ default: module.RoadmapPage })))
const InterviewPage = lazy(() =>
  import('@/pages/user/InterviewPage').then((module) => ({ default: module.InterviewPage })),
)
const QuestionDetailPage = lazy(() =>
  import('@/pages/user/QuestionDetailPage').then((module) => ({ default: module.QuestionDetailPage })),
)
const ProfilePage = lazy(() => import('@/pages/user/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const AdminQuestionsPage = lazy(() =>
  import('@/pages/admin/AdminQuestionsPage').then((module) => ({ default: module.AdminQuestionsPage })),
)
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })),
)
const AdminVideosPage = lazy(() =>
  import('@/pages/admin/AdminVideosPage').then((module) => ({ default: module.AdminVideosPage })),
)
const AdminAiPage = lazy(() =>
  import('@/pages/admin/AdminAiPage').then((module) => ({ default: module.AdminAiPage })),
)
const AdminVideoCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminVideoCategoriesPage').then((module) => ({ default: module.AdminVideoCategoriesPage })),
)
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })),
)
const AdminOnlinePage = lazy(() =>
  import('@/pages/admin/AdminOnlinePage').then((module) => ({ default: module.AdminOnlinePage })),
)
const AdminLogsPage = lazy(() =>
  import('@/pages/admin/AdminLogsPage').then((module) => ({ default: module.AdminLogsPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

function AuthExpiryBridge() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onExpired = () => {
      useAuthStore.getState().clear()
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { from: `${location.pathname}${location.search}`, expired: true },
        })
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [location.pathname, location.search, navigate])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthExpiryBridge />
          <Suspense fallback={<PageLoader label="正在加载界面…" />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/oauth/qq/callback" element={<QqCallbackPage />} />

              <Route element={<AuthGate />}>
                <Route element={<UserLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="questions" element={<QuestionListPage />} />
                  <Route path="videos" element={<VideoListPage />} />
                  <Route path="videos/:id" element={<VideoDetailPage />} />
                  <Route path="topics" element={<TopicsPage />} />
                  <Route path="questions/:id" element={<QuestionDetailPage />} />
                  <Route path="roadmap" element={<RoadmapPage />} />
                  <Route path="interview" element={<InterviewPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                <Route path="admin" element={<RequireAdmin />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="questions" replace />} />
                    <Route path="questions" element={<AdminQuestionsPage />} />
                    <Route path="categories" element={<AdminCategoriesPage />} />
                    <Route path="videos" element={<AdminVideosPage />} />
                    <Route path="video-categories" element={<AdminVideoCategoriesPage />} />
                    <Route path="ai" element={<AdminAiPage />} />
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="online" element={<AdminOnlinePage />} />
                    <Route path="logs" element={<AdminLogsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

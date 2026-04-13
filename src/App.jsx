import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { GroupProvider } from './context/GroupContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Feed from './pages/Feed'
import Market from './pages/Market'
import CreateMarket from './pages/CreateMarket'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Group from './pages/Group'

function AppRoutes() {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <GroupProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/market/:id" element={<Market />} />
          <Route path="/create" element={<CreateMarket />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/group" element={<Group />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </GroupProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

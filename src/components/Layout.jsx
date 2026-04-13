import { NavLink } from 'react-router-dom'
import { useGroup } from '../context/GroupContext'

const NAV = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/leaderboard', icon: TrophyIcon, label: 'Board' },
  { to: '/create', icon: PlusIcon, label: 'Bet' },
  { to: '/group', icon: GroupIcon, label: 'Group' },
  { to: '/profile', icon: UserIcon, label: 'Me' },
]

export default function Layout({ children }) {
  const { group } = useGroup()

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-lg">FamilyBets</span>
        </div>
        {group && (
          <span className="text-sm text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full">
            {group.name}
          </span>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-gray-950/95 backdrop-blur border-t border-gray-800 flex">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon className="w-6 h-6" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}
function TrophyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.175-1.125-1.175h-6.75c-.622 0-1.125.554-1.125 1.125V18.75m9.75-10.875c0 1.242-.612 2.34-1.546 2.99a3.655 3.655 0 01-1.328.697 3.75 3.75 0 01-1.054.15 3.75 3.75 0 01-3.75-3.75V5.625c0-1.036.84-1.875 1.875-1.875h4.5c1.035 0 1.875.84 1.875 1.875v2.625zM3 10.875c0 1.242.612 2.34 1.546 2.99.423.285.9.48 1.328.697A3.75 3.75 0 009 14.712V5.625C9 4.589 8.16 3.75 7.125 3.75h-2.25C3.84 3.75 3 4.589 3 5.625v5.25z" />
    </svg>
  )
}
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function GroupIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

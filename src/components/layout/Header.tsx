import React from 'react'
import { useHealth } from '../../hooks/useApi'
import { Badge } from '../ui/Badge'
import { Bell, Search, User } from 'lucide-react'

export const Header: React.FC = () => {
  const { data: health, isLoading } = useHealth()

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* API Status */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Badge variant="default">Checking...</Badge>
          ) : health?.status === 'healthy' ? (
            <Badge variant="success" dot>API Online</Badge>
          ) : (
            <Badge variant="danger" dot>API Offline</Badge>
          )}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-700">Admin</p>
            <p className="text-xs text-slate-400">admin@example.com</p>
          </div>
        </button>
      </div>
    </header>
  )
}
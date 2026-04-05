import React from 'react'
import { cn } from '../../utils/helpers'
import {
  LayoutDashboard,
  Database,
  Brain,
  BarChart3,
  Layers,
  Activity,
  Settings,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react'
import type { TabType } from '../../types'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'datasets' as TabType, label: 'Datasets', icon: Database },
  { id: 'prediction' as TabType, label: 'Prediction', icon: Brain },
  { id: 'eda' as TabType, label: 'EDA Analysis', icon: BarChart3 },
  { id: 'models' as TabType, label: 'Models', icon: Layers },
  { id: 'shap' as TabType, label: 'SHAP Analysis', icon: Activity },
]

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggle,
}) => {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-slate-900 text-white z-40 transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Accident AI</h1>
              <p className="text-xs text-slate-400">Predictor v2.0</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-white')} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all'
          )}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Help</span>}
        </button>
        <button
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg"
      >
        <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  )
}
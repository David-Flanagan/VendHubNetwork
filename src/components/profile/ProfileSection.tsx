'use client'

import { ReactNode, useState } from 'react'

interface ProfileSectionProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  isEnabled?: boolean
  isMandatory?: boolean
  onToggle?: (enabled: boolean) => void
  children: ReactNode
  className?: string
  dragHandleProps?: {
    attributes: any
    listeners: any
  }
}

export default function ProfileSection({
  id,
  title,
  description,
  icon,
  isEnabled = true,
  isMandatory = false,
  onToggle,
  children,
  className = '',
  dragHandleProps
}: ProfileSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${isCollapsed ? 'p-4' : 'p-8'} ${className} ${isCollapsed ? 'hover:shadow-lg transition-shadow' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {!isCollapsed && <p className="text-gray-600">{description}</p>}
            {isCollapsed && (
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500">Click to expand</span>
                <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title={isCollapsed ? "Expand section" : "Collapse section"}
          >
            <svg 
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Drag Handle */}
          {dragHandleProps && (
            <div 
              {...dragHandleProps.attributes} 
              {...dragHandleProps.listeners}
              className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Drag to reorder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          
          {!isMandatory && onToggle && (
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => onToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          )}
          
          {isMandatory && (
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Required
              </span>
            </div>
          )}
        </div>
      </div>

      {isEnabled && !isCollapsed && (
        <div className="space-y-6">
          {children}
        </div>
      )}

      {!isEnabled && !isMandatory && !isCollapsed && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-500">Enable this section to customize your profile</p>
        </div>
      )}
    </div>
  )
} 
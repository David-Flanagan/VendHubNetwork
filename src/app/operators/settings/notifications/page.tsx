'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

export default function NotificationsSettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    email_notifications: true,
    push_notifications: false,
    marketing_emails: false,
    order_updates: true,
    commission_alerts: true
  })

  const handleSave = async () => {
    if (!user) return

    try {
      setLoading(true)
      // TODO: Implement notification settings save
      showToast('Notification settings saved', 'success')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      showToast('Error saving settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-2">Manage your notification preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Order Updates</p>
                    <p className="text-sm text-gray-500">Get notified about order status changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.order_updates}
                    onChange={(e) => setSettings(prev => ({ ...prev, order_updates: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Commission Alerts</p>
                    <p className="text-sm text-gray-500">Get notified about commission earnings</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.commission_alerts}
                    onChange={(e) => setSettings(prev => ({ ...prev, commission_alerts: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Marketing</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Marketing Emails</p>
                  <p className="text-sm text-gray-500">Receive promotional emails and updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.marketing_emails}
                  onChange={(e) => setSettings(prev => ({ ...prev, marketing_emails: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 

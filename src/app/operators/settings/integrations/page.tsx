'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

export default function IntegrationsSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  // Form state
  const [lynxApiToken, setLynxApiToken] = useState('')
  const [existingToken, setExistingToken] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    if (user?.company_id) {
      fetchExistingToken()
    }
  }, [user])

  const fetchExistingToken = async () => {
    try {
      if (!user?.company_id) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('nayax_api_tokens')
        .select('lynx_api_token')
        .eq('company_id', user.company_id)
        .single()

      if (!error && data) {
        setExistingToken(data.lynx_api_token)
        setLynxApiToken('') // Clear input field
      }
    } catch (error) {
      console.error('Error fetching existing token:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!lynxApiToken.trim()) {
      showToast('Please enter your Nayax Lynx API token', 'error')
      return
    }

    setSaving(true)

    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const { error } = await supabase
        .from('nayax_api_tokens')
        .upsert({
          company_id: user.company_id,
          lynx_api_token: lynxApiToken.trim()
        })

      if (error) throw error

      showToast('Nayax Lynx API token saved successfully', 'success')
      setLynxApiToken('') // Clear input field
      fetchExistingToken() // Refresh existing token display
    } catch (error) {
      console.error('Error saving API token:', error)
      showToast('Error saving API token', 'error')
    } finally {
      setSaving(false)
    }
  }

  const maskToken = (token: string) => {
    if (token.length <= 4) return token
    return token.substring(0, 4) + '-****-****-****'
  }

  if (loading) {
    return (
      <RouteGuard requiredRoles={['operator']}>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded mb-6"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredRoles={['operator']}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Nayax Lynx API Integration</h1>
            <p className="text-gray-600">Connect your Nayax Lynx API token to enable machine data integration.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            {existingToken && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current API Token</h3>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-white px-3 py-1 rounded border">
                    {showToken ? existingToken : maskToken(existingToken)}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Token saved on {new Date().toLocaleDateString()}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="lynx_api_token" className="block text-sm font-medium text-gray-700 mb-2">
                  Nayax Lynx API Token
                </label>
                <input
                  type="text"
                  id="lynx_api_token"
                  value={lynxApiToken}
                  onChange={(e) => setLynxApiToken(e.target.value)}
                  placeholder="Enter your Nayax Lynx API token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {existingToken ? 'Enter a new token to update your existing one.' : 'This token will be securely stored and used for machine data integration.'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !lynxApiToken.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : existingToken ? 'Update Token' : 'Save Token'}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">About Nayax Lynx API</h3>
            <p className="text-sm text-blue-800">
              The Nayax Lynx API allows VendHub to integrate with your vending machines for real-time data, 
              sales reporting, and machine monitoring. Your API token is securely stored and encrypted.
            </p>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
}

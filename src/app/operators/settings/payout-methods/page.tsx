'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface PayoutMethod {
  id: string
  name: string
  display_name: string
  description: string
  is_active: boolean
}

interface OperatorPayoutSetting {
  id: string
  company_id: string
  payout_method_id: string
  is_enabled: boolean
  minimum_amount: number
  processing_fee_percentage: number
  processing_fee_fixed: number
  processing_time_days: number
  custom_fields: any
  payout_methods: PayoutMethod
}

export default function PayoutMethodsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([])
  const [operatorSettings, setOperatorSettings] = useState<OperatorPayoutSetting[]>([])
  const [companyId, setCompanyId] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get the operator's company ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      setCompanyId(userData.company_id)

      // Get all available payout methods
      const { data: methods, error: methodsError } = await supabase
        .from('payout_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_name')

      if (methodsError) throw methodsError
      setPayoutMethods(methods || [])

      // Get operator's current payout settings
      const { data: settings, error: settingsError } = await supabase
        .from('operator_payout_settings')
        .select(`
          *,
          payout_methods (*)
        `)
        .eq('company_id', userData.company_id)

      if (settingsError) throw settingsError

      // Create settings for all methods, even if not configured yet
      const allSettings: OperatorPayoutSetting[] = methods?.map(method => {
        const existingSetting = settings?.find(s => s.payout_method_id === method.id)
        return existingSetting || {
          id: '',
          company_id: userData.company_id,
          payout_method_id: method.id,
          is_enabled: false,
          minimum_amount: 0,
          processing_fee_percentage: 0,
          processing_fee_fixed: 0,
          processing_time_days: 3,
          custom_fields: {},
          payout_methods: method
        }
      }) || []

      setOperatorSettings(allSettings)

    } catch (error) {
      console.error('Error loading payout data:', error)
      showToast('Failed to load payout methods', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (methodId: string, field: string, value: any) => {
    setOperatorSettings(prev => prev.map(setting => 
      setting.payout_method_id === methodId 
        ? { ...setting, [field]: value }
        : setting
    ))
  }

  const saveSettings = async () => {
    if (!user || !companyId) return

    try {
      setSaving(true)

      // Save each setting
      for (const setting of operatorSettings) {
        if (setting.id) {
          // Update existing setting
          const { error } = await supabase
            .from('operator_payout_settings')
            .update({
              is_enabled: setting.is_enabled,
              minimum_amount: setting.minimum_amount,
              processing_fee_percentage: setting.processing_fee_percentage,
              processing_fee_fixed: setting.processing_fee_fixed,
              processing_time_days: setting.processing_time_days,
              custom_fields: setting.custom_fields
            })
            .eq('id', setting.id)

          if (error) throw error
        } else if (setting.is_enabled) {
          // Create new setting only if enabled
          const { error } = await supabase
            .from('operator_payout_settings')
            .insert({
              company_id: companyId,
              payout_method_id: setting.payout_method_id,
              is_enabled: setting.is_enabled,
              minimum_amount: setting.minimum_amount,
              processing_fee_percentage: setting.processing_fee_percentage,
              processing_fee_fixed: setting.processing_fee_fixed,
              processing_time_days: setting.processing_time_days,
              custom_fields: setting.custom_fields
            })

          if (error) throw error
        }
      }

      showToast('Payout settings saved successfully', 'success')
      await loadData() // Reload to get updated IDs

    } catch (error) {
      console.error('Error saving payout settings:', error)
      showToast('Failed to save payout settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payout Methods</h1>
        <p className="text-gray-600 mt-2">
          Configure payout methods and settings for your customers
        </p>
      </div>

      {/* Payout Methods */}
      <div className="space-y-6">
        {operatorSettings.map((setting) => (
          <div key={setting.payout_method_id} className="bg-white p-6 rounded-lg shadow-sm border">
            {/* Method Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {setting.payout_methods.display_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {setting.payout_methods.description}
                </p>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={setting.is_enabled}
                    onChange={(e) => updateSetting(setting.payout_method_id, 'is_enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {setting.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            {/* Settings Fields */}
            {setting.is_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Minimum Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Required Cashout
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={setting.minimum_amount}
                      onChange={(e) => updateSetting(setting.payout_method_id, 'minimum_amount', parseFloat(e.target.value) || 0)}
                      className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Processing Fee Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Fee (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={setting.processing_fee_percentage}
                      onChange={(e) => updateSetting(setting.payout_method_id, 'processing_fee_percentage', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                      %
                    </span>
                  </div>
                </div>

                {/* Fixed Processing Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Processing Fee
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={setting.processing_fee_fixed}
                      onChange={(e) => updateSetting(setting.payout_method_id, 'processing_fee_fixed', parseFloat(e.target.value) || 0)}
                      className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Processing Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Time (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={setting.processing_time_days}
                    onChange={(e) => updateSetting(setting.payout_method_id, 'processing_time_days', parseInt(e.target.value) || 3)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Enable payout methods you want to offer to customers</li>
          <li>• Set minimum cashout amounts to avoid small transactions</li>
          <li>• Configure processing fees (percentage and/or fixed amount)</li>
          <li>• Set processing time expectations for customers</li>
          <li>• Customers will see these settings when requesting cashouts</li>
        </ul>
      </div>
    </div>
  )
} 
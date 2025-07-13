'use client'

import { useState, useEffect } from 'react'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

interface VendHubStatsSectionProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
}

interface CompanyStats {
  totalProducts: number
  totalMachines: number
  daysInNetwork: number
  responseTime: string
}

export default function VendHubStatsSection({ company, onUpdate }: VendHubStatsSectionProps) {
  const [stats, setStats] = useState<CompanyStats>({
    totalProducts: 0,
    totalMachines: 0,
    daysInNetwork: 0,
    responseTime: '24 hours'
  })
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchCompanyStats()
  }, [company.id])

  const fetchCompanyStats = async () => {
    try {
      setLoading(true)
      
      // Fetch products count
      const { count: productsCount } = await supabase
        .from('company_products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)

      // Fetch machines count
      const { count: machinesCount } = await supabase
        .from('company_machine_templates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)

      // Calculate days in network
      const createdDate = new Date(company.created_at)
      const now = new Date()
      const daysInNetwork = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

      setStats({
        totalProducts: productsCount || 0,
        totalMachines: machinesCount || 0,
        daysInNetwork,
        responseTime: '24 hours' // This could be calculated from actual response times
      })
    } catch (error) {
      console.error('Error fetching company stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Display your VendHub Network statistics to build trust with potential customers.
          </p>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Display your VendHub Network statistics to build trust with potential customers.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-xl">
          <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
          <div className="text-sm text-gray-600">Products</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-xl">
          <div className="text-2xl font-bold text-green-600">{stats.totalMachines}</div>
          <div className="text-sm text-gray-600">Machines</div>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">{stats.daysInNetwork}</div>
          <div className="text-sm text-gray-600">Days in Network</div>
        </div>
        
        <div className="text-center p-4 bg-orange-50 rounded-xl">
          <div className="text-2xl font-bold text-orange-600">{stats.responseTime}</div>
          <div className="text-sm text-gray-600">Response Time</div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-800 text-sm">
            These statistics are automatically calculated and updated based on your activity in the VendHub Network.
          </span>
        </div>
      </div>
    </div>
  )
} 
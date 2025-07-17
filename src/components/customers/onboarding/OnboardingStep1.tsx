'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import MachineTemplateCard from '@/components/MachineTemplateCard'

interface MachineTemplate {
  id: string
  name: string
  category: string
  category_id: string
  image_url?: string
  dimensions: string
  slot_count: number
}

interface Company {
  id: string
  name: string
  description?: string
  slogan?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  website?: string
  logo_url?: string
  profile_image_url?: string
  latitude?: number
  longitude?: number
  incorporated_date?: string
  processing_fee_percentage?: number
  sales_tax_percentage?: number
  created_at: string
  updated_at: string
}

interface CompanyStats {
  totalMachines: number
  activeMachines: number
  totalCustomers: number
  yearsInBusiness: number
}

interface OnboardingStep1Props {
  companyId: string
  templateId?: string
  onNext: (templateId: string) => void
}

export default function OnboardingStep1({ companyId, templateId, onNext }: OnboardingStep1Props) {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null)
  const [machineTemplates, setMachineTemplates] = useState<MachineTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateId || null)
  const { showToast } = useToast()

  useEffect(() => {
    loadCompanyAndTemplates()
  }, [companyId])

  const loadCompanyStats = async (companyId: string): Promise<CompanyStats> => {
    try {
      // Get total machines
      const { count: totalMachines } = await supabase
        .from('customer_machines')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)

      // Get active machines
      const { count: activeMachines } = await supabase
        .from('customer_machines')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('approval_status', 'approved')

      // Get unique customers
      const { count: totalCustomers } = await supabase
        .from('customer_machines')
        .select('customer_id', { count: 'exact', head: true })
        .eq('company_id', companyId)

      // Calculate years in business (from company creation date)
      const companyData = await supabase
        .from('companies')
        .select('created_at, incorporated_date')
        .eq('id', companyId)
        .single()

      let yearsInBusiness = 0
      if (companyData.data) {
        const startDate = companyData.data.incorporated_date || companyData.data.created_at
        const startYear = new Date(startDate).getFullYear()
        const currentYear = new Date().getFullYear()
        yearsInBusiness = currentYear - startYear
      }

      return {
        totalMachines: totalMachines || 0,
        activeMachines: activeMachines || 0,
        totalCustomers: totalCustomers || 0,
        yearsInBusiness: Math.max(yearsInBusiness, 1) // Minimum 1 year
      }
    } catch (error) {
      console.error('Error loading company stats:', error)
      return {
        totalMachines: 0,
        activeMachines: 0,
        totalCustomers: 0,
        yearsInBusiness: 1
      }
    }
  }

  const loadCompanyAndTemplates = async () => {
    try {
      setLoading(true)
      console.log('Loading company and templates for company:', companyId)

      // Load company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (companyError) {
        console.error('Error loading company:', companyError)
        showToast('Error loading company information', 'error')
        return
      }

      setCompany(companyData)
      console.log('Company loaded:', companyData)

      // Load company stats
      const stats = await loadCompanyStats(companyId)
      setCompanyStats(stats)

      // Load machine templates using new schema - company_machine_templates now contain all data
      const { data: templateData, error: templateError } = await supabase
        .from('company_machine_templates')
        .select(`
          id,
          name,
          category_id,
          image_url,
          dimensions,
          slot_count,
          machine_category:machine_categories (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (templateError) {
        console.error('Error loading templates:', templateError)
        showToast('Error loading machine templates', 'error')
        return
      }

      console.log('Raw template data:', templateData)

      // Transform the data to match our interface
      const templates: MachineTemplate[] = (templateData || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.machine_category?.name || 'Unknown',
        category_id: item.category_id,
        image_url: item.image_url,
        dimensions: item.dimensions || 'N/A',
        slot_count: item.slot_count || 0
      }))

      console.log('Processed templates:', templates)
      setMachineTemplates(templates)

      // If templateId is provided, select it
      if (templateId && templates.some(t => t.id === templateId)) {
        setSelectedTemplate(templateId)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
  }

  const handleNext = () => {
    if (!selectedTemplate) {
      showToast('Please select a machine template', 'error')
      return
    }
    onNext(selectedTemplate)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading machine templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Your Vending Journey</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Let's get you set up with the perfect vending machine for your location. 
            Choose from our carefully curated selection of machines designed to maximize your success.
          </p>
        </div>
        
        {company && (
          <div className="inline-flex items-center px-6 py-3 bg-blue-50 rounded-full border border-blue-200">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-blue-800 font-medium">
              Partnering with {company.name}
            </span>
          </div>
        )}
      </div>

      {/* Company Info */}
      {company && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-200 p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Company Header */}
            <div className="lg:col-span-2">
              <div className="flex items-start space-x-4">
                {company.logo_url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={company.logo_url} 
                      alt={`${company.name} logo`}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h2>
                  {company.slogan && (
                    <p className="text-lg text-blue-600 font-medium mb-2">{company.slogan}</p>
                  )}
                  {company.description && (
                    <p className="text-gray-600 text-base leading-relaxed">{company.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Network Stats */}
            {companyStats && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Network Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Machines</span>
                    <span className="font-semibold text-gray-900">{companyStats.totalMachines}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Machines</span>
                    <span className="font-semibold text-green-600">{companyStats.activeMachines}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Customers Served</span>
                    <span className="font-semibold text-gray-900">{companyStats.totalCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Years in Business</span>
                    <span className="font-semibold text-blue-600">{companyStats.yearsInBusiness}+</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact & Location Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Information
              </h3>
              <div className="space-y-3">
                {company.contact_email && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${company.contact_email}`} className="hover:text-blue-600 transition-colors">
                      {company.contact_email}
                    </a>
                  </div>
                )}
                {company.contact_phone && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${company.contact_phone}`} className="hover:text-blue-600 transition-colors">
                      {company.contact_phone}
                    </a>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {company.address && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Location
                </h3>
                <div className="text-gray-600">
                  <p className="leading-relaxed">{company.address}</p>
                </div>
              </div>
            )}

            {/* Business Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Business Details
              </h3>
              <div className="space-y-3">
                {company.incorporated_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Established</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(company.incorporated_date).getFullYear()}
                    </span>
                  </div>
                )}
                {company.processing_fee_percentage && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="font-semibold text-gray-900">{company.processing_fee_percentage}%</span>
                  </div>
                )}
                {company.sales_tax_percentage && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Sales Tax</span>
                    <span className="font-semibold text-gray-900">{company.sales_tax_percentage}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Templates */}
      {machineTemplates.length > 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Choose Your Perfect Machine
            </h3>
            <p className="text-lg text-gray-600 mb-2">
              We have {machineTemplates.length} machine{machineTemplates.length !== 1 ? 's' : ''} available for your location
            </p>
            <p className="text-gray-500">Click on any machine below to see details and select it</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {machineTemplates.map((template) => (
              <MachineTemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplate === template.id}
                onClick={() => handleTemplateSelect(template.id)}
                showDetails={true}
                showTechnicalDetails={false}
              />
            ))}
          </div>

          {/* Next Button */}
          <div className="text-center pt-6">
            <button
              onClick={handleNext}
              disabled={!selectedTemplate}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
            >
              Continue with Selected Machine
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Machine Templates Available</h3>
          <p className="text-gray-600">
            This operator doesn't have any active machine templates available for onboarding.
          </p>
        </div>
      )}
    </div>
  )
} 
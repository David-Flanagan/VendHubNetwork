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
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
}

interface OnboardingStep1Props {
  companyId: string
  templateId?: string
  onNext: (templateId: string) => void
}

export default function OnboardingStep1({ companyId, templateId, onNext }: OnboardingStep1Props) {
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [machineTemplates, setMachineTemplates] = useState<MachineTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(templateId || null)
  const { showToast } = useToast()

  useEffect(() => {
    loadCompanyAndTemplates()
  }, [companyId])

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

      // Load machine templates
      const { data: templateData, error: templateError } = await supabase
        .from('company_machine_templates')
        .select(`
          machine_template:machine_templates (
            id,
            name,
            category_id,
            image_url,
            dimensions,
            slot_count
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

      // Get category names for the templates
      const templateIds = (templateData || []).map((item: any) => item.machine_template?.id).filter(Boolean)
      
      if (templateIds.length > 0) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('machine_templates')
          .select(`
            id,
            machine_category:machine_categories (
              id,
              name
            )
          `)
          .in('id', templateIds)

        if (categoryError) {
          console.error('Error loading categories:', categoryError)
        } else {
          console.log('Category data:', categoryData)
        }

        const categoryMap = new Map()
        categoryData?.forEach((item: any) => {
          if (item.machine_category) {
            categoryMap.set(item.id, item.machine_category.name)
          }
        })

        const templates: MachineTemplate[] = (templateData || []).map((item: any) => {
          const template = item.machine_template
          if (!template) return null
          
          return {
            id: template.id,
            name: template.name,
            category: categoryMap.get(template.id) || 'Unknown',
            category_id: template.category_id,
            image_url: template.image_url,
            dimensions: template.dimensions || 'N/A',
            slot_count: template.slot_count || 0
          }
        }).filter(Boolean) as MachineTemplate[]

        console.log('Processed templates:', templates)
        setMachineTemplates(templates)

        // If templateId is provided, select it
        if (templateId && templates.some(t => t.id === templateId)) {
          setSelectedTemplate(templateId)
        }
      } else {
        setMachineTemplates([])
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Select Your Machine</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the machine template that best fits your location and needs. 
          {company && (
            <span className="block mt-2 text-blue-600 font-medium">
              Available from {company.name}
            </span>
          )}
        </p>
      </div>

      {/* Company Info */}
      {company && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{company.name}</h2>
              {company.description && (
                <p className="text-gray-600 mt-1">{company.description}</p>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              {company.contact_email && (
                <div>📧 {company.contact_email}</div>
              )}
              {company.contact_phone && (
                <div>📞 {company.contact_phone}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Machine Templates */}
      {machineTemplates.length > 0 ? (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Available Machine Templates ({machineTemplates.length})
            </h3>
            <p className="text-gray-600">Click on a machine to select it</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {machineTemplates.map((template) => (
              <MachineTemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplate === template.id}
                onClick={() => handleTemplateSelect(template.id)}
                showDetails={true}
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
            This company doesn't have any machine templates available at the moment.
          </p>
        </div>
      )}
    </div>
  )
} 
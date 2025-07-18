'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import OnboardingStep1 from '@/components/customers/onboarding/OnboardingStep1'
import OnboardingStep2 from '@/components/customers/onboarding/OnboardingStep2'
import OnboardingStep3 from '@/components/customers/onboarding/OnboardingStep3'
import OnboardingStep4 from '@/components/customers/onboarding/OnboardingStep4'

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [onboardingData, setOnboardingData] = useState({
    company_id: '',
    company_machine_template_id: '',
    products: [],
    host_business_name: '',
    machine_placement_area: '',
    host_address: '',
    host_latitude: null,
    host_longitude: null,
    point_of_contact_name: '',
    point_of_contact_position: '',
    point_of_contact_email: '',
    point_of_contact_phone: '',
    processing_fee_percentage: 0,
    sales_tax_percentage: 0
  })

  // Get company_id from URL params
  const companyId = searchParams.get('company_id')
  const templateId = searchParams.get('template_id')

  // Redirect if not authenticated or not a customer
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) {
      router.push('/customers/login')
    }
  }, [user, authLoading, router])

  // Initialize onboarding data
  useEffect(() => {
    if (companyId) {
      setOnboardingData(prev => ({
        ...prev,
        company_id: companyId
      }))
      loadCompanySettings()
    }
  }, [companyId])

  // Load company settings for processing fees and sales tax
  const loadCompanySettings = async () => {
    if (!companyId) return

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('processing_fee_percentage, sales_tax_percentage')
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Error loading company settings:', error)
        return
      }

      setOnboardingData(prev => ({
        ...prev,
        processing_fee_percentage: data.processing_fee_percentage || 2.90,
        sales_tax_percentage: data.sales_tax_percentage || 8.25
      }))
    } catch (error) {
      console.error('Error loading company settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle step navigation
  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle template selection from Step 1
  const handleTemplateSelected = async (selectedTemplateId: string) => {
    try {
      console.log('Template selected in Step 1:', selectedTemplateId)
      console.log('Company ID:', companyId)
      
      // In the new schema, the selectedTemplateId IS the company_machine_template_id
      // since company_machine_templates now contain the actual template data
      console.log('Setting company_machine_template_id to:', selectedTemplateId)
      setOnboardingData(prev => ({
        ...prev,
        company_machine_template_id: selectedTemplateId
      }))
      handleNextStep()
    } catch (error) {
      console.error('Error handling template selection:', error)
      showToast('Error processing template selection', 'error')
    }
  }

  // Handle data updates from each step
  const handleDataUpdate = (newData: any) => {
    setOnboardingData(prev => ({ ...prev, ...newData }))
  }

  // Handle final submission
  const handleSubmit = async () => {
    if (!user) return

    setSaving(true)
    try {
      console.log('Submitting onboarding data:', onboardingData)
      console.log('User ID:', user.id)
      console.log('Company ID:', onboardingData.company_id)
      console.log('Template ID:', onboardingData.company_machine_template_id)

      // Create slot configuration JSON with all product data
      let slotConfiguration: any = { rows: [] };
      
      if (onboardingData.products && onboardingData.products.length > 0) {
        // Group products by row
        const productsByRow: { [row: string]: any[] } = {}
        onboardingData.products.forEach((product: any) => {
          if (!productsByRow[product.row_number]) {
            productsByRow[product.row_number] = []
          }
          productsByRow[product.row_number].push(product)
        })

        // Create slot configuration structure
        slotConfiguration = {
          rows: Object.keys(productsByRow).sort((a, b) => parseInt(a) - parseInt(b)).map(rowNum => ({
            row_number: parseInt(rowNum),
            slots: productsByRow[rowNum]
              .sort((a: any, b: any) => a.slot_number - b.slot_number)
              .map((product: any) => ({
                slot_number: product.slot_number,
                alias: product.alias,
                mdb_code: product.mdb_code,
                product_name: product.product_name,
                brand_name: product.brand_name,
                description: product.description,
                image_url: product.image_url,
                base_price: product.base_price ?? 0,
                commission_rate: product.commission_rate ?? 0,
                commission_amount: product.commission_amount ?? 0,
                final_price: product.final_price ?? 0,
                processing_fee_amount: product.processing_fee_amount ?? 0,
                sales_tax_amount: product.sales_tax_amount ?? 0,
                rounding_difference: product.rounding_difference ?? 0,
                company_product_id: product.company_product_id,
                product_type_id: product.product_type_id,
                // Add pricing settings at the slot level
                processing_fee_percentage: onboardingData.processing_fee_percentage || 0,
                sales_tax_percentage: onboardingData.sales_tax_percentage || 0
              }))
          }))
        }
      }

      // Create customer machine record
      const machinePayload = {
        customer_id: user.id,
        company_id: onboardingData.company_id,
        company_machine_template_id: onboardingData.company_machine_template_id,
        machine_name: 'Customer Machine', // We'll get this from the template
        machine_image_url: null, // We'll get this from the template
        machine_dimensions: null, // We'll get this from the template
        slot_count: onboardingData.products?.length || 0,
        slot_configuration: slotConfiguration, // Include slot configuration in initial insert
        host_business_name: onboardingData.host_business_name,
        machine_placement_area: onboardingData.machine_placement_area,
        host_address: onboardingData.host_address,
        host_latitude: onboardingData.host_latitude,
        host_longitude: onboardingData.host_longitude,
        point_of_contact_name: onboardingData.point_of_contact_name,
        point_of_contact_position: onboardingData.point_of_contact_position,
        point_of_contact_email: onboardingData.point_of_contact_email,
        point_of_contact_phone: onboardingData.point_of_contact_phone,
        approval_status: 'pending',
        onboarding_status: 'completed',
        current_step: 4
      };
      console.log('Machine payload:', machinePayload);
      const { data: machineData, error: machineError } = await supabase
        .from('customer_machines')
        .insert(machinePayload)
        .select()
        .single()

      console.log('Machine insert result:', { machineData, machineError })

      if (machineError) {
        console.error('Error creating customer machine:', machineError)
        console.error('Supabase error details:', machineError.details || machineError.message || machineError)
        throw machineError
      }

      showToast('Onboarding completed successfully! Your machine is pending approval.', 'success')
      router.push('/customers/dashboard')
    } catch (error) {
      console.error('Error submitting onboarding:', error)
      showToast('Error completing onboarding. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'customer') {
    return null // Will redirect
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Onboarding Link</h2>
          <p className="text-gray-600 mb-6">Please use a valid link to start the onboarding process.</p>
          <button
            onClick={() => router.push('/browse-operators')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Operators
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Machine Onboarding</h1>
          <p className="mt-2 text-gray-600">
            Complete the setup for your new vending machine
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of 4</span>
            <span>{Math.round((currentStep / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {currentStep === 1 && (
            <OnboardingStep1
              companyId={companyId}
              templateId={templateId || undefined}
              onNext={handleTemplateSelected}
            />
          )}
          {currentStep === 2 && (
            <OnboardingStep2
              data={onboardingData}
              onUpdate={handleDataUpdate}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}
          {currentStep === 3 && (
            <OnboardingStep3
              data={onboardingData}
              onUpdate={handleDataUpdate}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          )}
          {currentStep === 4 && (
            <OnboardingStep4
              data={onboardingData}
              onUpdate={handleDataUpdate}
              onSubmit={handleSubmit}
              onPrev={handlePrevStep}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function CustomerOnboarding() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  )
} 
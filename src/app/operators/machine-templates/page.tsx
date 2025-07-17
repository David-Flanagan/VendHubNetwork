'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatDate } from '@/lib/date-utils'

interface CompanyMachineTemplate {
  id: string
  custom_name: string | null
  custom_dimensions: string | null
  custom_image_url: string | null
  is_active: boolean
  created_at: string
  global_machine_template: {
    id: string
    name: string
    category: {
      id: string
      name: string
    }
    image_url: string | null
    dimensions: string | null
    slot_count: number
    model_number: string | null
    is_outdoor_rated: boolean | null
    technical_description: string | null
    created_by_company: {
      name: string
    } | null
  }
}

export default function CompanyMachineTemplatesPage() {
  const { loading: authLoading, isOperator, user } = useAuth()
  const { showToast } = useToast()
  const [companyTemplates, setCompanyTemplates] = useState<CompanyMachineTemplate[]>([])
  const [allCompanyTemplates, setAllCompanyTemplates] = useState<CompanyMachineTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [machineCategories, setMachineCategories] = useState<Array<{id: string, name: string}>>([])
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isOperator) {
      router.push('/auth/operators/login')
      return
    }
    if (isOperator) {
      loadCompanyTemplates()
    }
  }, [authLoading, isOperator, router])

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, selectedCategory, allCompanyTemplates])

  const filterTemplates = () => {
    let filtered = allCompanyTemplates

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(template => 
        (template.custom_name || template.global_machine_template.name).toLowerCase().includes(search) ||
        template.global_machine_template.category.name.toLowerCase().includes(search) ||
        (template.custom_dimensions || template.global_machine_template.dimensions || '').toLowerCase().includes(search) ||
        (template.global_machine_template.model_number || '').toLowerCase().includes(search)
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.global_machine_template.category.id === selectedCategory)
    }

    setCompanyTemplates(filtered)
  }

  const loadCompanyTemplates = async () => {
    try {
      // Get user's company_id first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user?.id)
        .single()

      if (userError || !userData?.company_id) {
        throw new Error('Company not found')
      }

      const { data, error } = await supabase
        .from('company_machine_templates')
        .select(`
          id,
          name,
          description,
          image_url,
          dimensions,
          slot_count,
          slot_configuration,
          is_active,
          created_at,
          category_id,
          global_machine_template_id
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get machine categories for lookup and filtering
      const { data: categories, error: categoriesError } = await supabase
        .from('machine_categories')
        .select('id, name')
        .order('name')

      if (categoriesError) throw categoriesError

      // Set machine categories for filtering
      setMachineCategories(categories || [])

      // Create a lookup map for categories
      const categoryMap = new Map(categories?.map(cat => [cat.id, cat.name]) || [])

      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        custom_name: item.name, // Use the company template name
        custom_dimensions: item.dimensions,
        custom_image_url: item.image_url,
        is_active: item.is_active,
        created_at: item.created_at,
        global_machine_template: {
          id: item.global_machine_template_id || item.id,
          name: item.name,
          image_url: item.image_url,
          dimensions: item.dimensions,
          category: {
            id: item.category_id,
            name: categoryMap.get(item.category_id) || 'Unknown'
          },
          slot_count: item.slot_count || 0,
          model_number: null, // Not stored in company templates
          is_outdoor_rated: null, // Not stored in company templates
          technical_description: item.description,
          created_by_company: null // Not needed for company templates
        }
      }))

      setCompanyTemplates(transformedData)
      setAllCompanyTemplates(transformedData)
    } catch (error: any) {
      setError('Failed to load company machine templates')
      console.error('Error loading company machine templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActiveStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('company_machine_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId)

      if (error) throw error

      showToast(`Template ${currentStatus ? 'deactivated' : 'activated'} successfully`, 'success')
      loadCompanyTemplates()
    } catch (error: any) {
      showToast('Failed to update template status: ' + error.message, 'error')
    }
  }

  const removeFromCompanyCatalog = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to remove "${templateName}" from your company catalog?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('company_machine_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      showToast(`"${templateName}" removed from company catalog`, 'success')
      loadCompanyTemplates()
    } catch (error: any) {
      showToast('Failed to remove template: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Company Machine Templates</h1>
            <p className="text-gray-600 mt-2">Manage your company's machine templates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/operators/global-machine-templates')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Browse Global Templates
            </button>
            <button
              onClick={() => router.push('/operators/machine-templates/builder')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create New Template
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Your Templates
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="Search by template name, category, model number, or dimensions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Machine Category Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🏭 Filter by Machine Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                All Categories ({allCompanyTemplates.length})
              </button>
              {machineCategories.map(category => {
                const count = allCompanyTemplates.filter(template => template.global_machine_template.category.id === category.id).length
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {category.name} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📊 Showing <span className="font-semibold text-gray-900">{companyTemplates.length}</span> of <span className="font-semibold text-gray-900">{allCompanyTemplates.length}</span> templates
              </div>
              {searchTerm && (
                <div className="text-sm text-blue-600">
                  🔍 Searching for: <span className="font-medium">"{searchTerm}"</span>
                </div>
              )}
              {selectedCategory !== 'all' && (
                <div className="text-sm text-green-600">
                  🏭 Category: <span className="font-medium">{machineCategories.find(c => c.id === selectedCategory)?.name}</span>
                </div>
              )}
            </div>
            {(searchTerm || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {companyTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-4">No machine templates in your company catalog.</p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => router.push('/operators/global-machine-templates')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Templates from Global Catalog
            </button>
            <button
              onClick={() => router.push('/operators/machine-templates/builder')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create New Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companyTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {(template.custom_image_url || template.global_machine_template.image_url) && (
                <div className="h-[400px] overflow-hidden">
                  <img
                    src={(template.custom_image_url || template.global_machine_template.image_url) || ''}
                    alt={template.custom_name || template.global_machine_template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {template.custom_name || template.global_machine_template.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      template.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Category:</strong> {template.global_machine_template.category.name}</p>
                  {template.global_machine_template.model_number && (
                    <p><strong>Model:</strong> {template.global_machine_template.model_number}</p>
                  )}
                  <p><strong>Dimensions:</strong> {template.custom_dimensions || template.global_machine_template.dimensions || 'Not specified'}</p>
                  <p><strong>Slots:</strong> {template.global_machine_template.slot_count}</p>
                  {template.global_machine_template.is_outdoor_rated && (
                    <p><strong>Outdoor Rated:</strong> Yes</p>
                  )}
                  {template.global_machine_template.created_by_company && (
                    <p><strong>Created by:</strong> {template.global_machine_template.created_by_company.name}</p>
                  )}
                  <p><strong>Added:</strong> {formatDate(template.created_at)}</p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/operators/machine-templates/${template.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => toggleActiveStatus(template.id, template.is_active)}
                    className={`flex-1 px-3 py-2 rounded-md transition-colors text-sm ${
                      template.is_active
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button
                    onClick={() => removeFromCompanyCatalog(template.id, template.custom_name || template.global_machine_template.name)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
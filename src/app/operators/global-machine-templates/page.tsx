'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface MachineTemplate {
  id: string
  name: string
  category: {
    id: string
    name: string
  }
  image_url: string | null
  dimensions: string | null
  slot_count: number
  created_at: string
  is_in_company_catalog: boolean
  created_by_company: {
    name: string
  } | null
  can_delete: boolean
}

export default function GlobalMachineTemplatesPage() {
  const { loading: authLoading, isOperator, user } = useAuth()
  const { showToast } = useToast()
  const [machineTemplates, setMachineTemplates] = useState<MachineTemplate[]>([])
  const [allMachineTemplates, setAllMachineTemplates] = useState<MachineTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [machineCategories, setMachineCategories] = useState<Array<{id: string, name: string}>>([])
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isOperator) {
      router.push('/operators/login')
      return
    }
    if (isOperator) {
      loadMachineTemplates()
    }
  }, [authLoading, isOperator, router])

  useEffect(() => {
    filterTemplates()
  }, [searchTerm, selectedCategory, allMachineTemplates])

  const filterTemplates = () => {
    let filtered = allMachineTemplates

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(search) ||
        template.category.name.toLowerCase().includes(search) ||
        (template.dimensions && template.dimensions.toLowerCase().includes(search))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category.id === selectedCategory)
    }

    setMachineTemplates(filtered)
  }

  const loadMachineTemplates = async () => {
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

      // Get all machine templates
      const { data: templates, error: templatesError } = await supabase
        .from('machine_templates')
        .select(`
          id,
          name,
          image_url,
          dimensions,
          created_at,
          category_id,
          slot_count:machine_template_slots(count),
          created_by_company:companies(name)
        `)
        .order('name')

      if (templatesError) throw templatesError

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

      // Get company's machine templates to check which ones are already added
      const { data: companyTemplates, error: companyError } = await supabase
        .from('company_machine_templates')
        .select('machine_template_id')
        .eq('company_id', userData.company_id)

      if (companyError) throw companyError

      const companyTemplateIds = new Set(companyTemplates?.map(ct => ct.machine_template_id) || [])

      // Transform the data to match our interface
      const transformedData = (templates || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        dimensions: item.dimensions,
        created_at: item.created_at,
        category: {
          id: item.category_id,
          name: categoryMap.get(item.category_id) || 'Unknown'
        },
        slot_count: item.slot_count?.[0]?.count || 0,
        is_in_company_catalog: companyTemplateIds.has(item.id),
        created_by_company: item.created_by_company?.[0] || null,
        can_delete: item.created_by_company?.[0]?.id === userData?.company_id
      }))

      setMachineTemplates(transformedData)
      setAllMachineTemplates(transformedData)
    } catch (error: any) {
      console.error('Error loading machine templates:', error)
      if (error.code === '42P01') {
        setError('Machine templates table not found. Please run the database setup first.')
      } else if (error.message && error.message.includes('image_url')) {
        setError('Database schema mismatch. Please run the fix script: fix-machine-templates.sql')
      } else {
        setError(`Failed to load machine templates: ${error.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const addToCompanyCatalog = async (templateId: string, templateName: string) => {
    try {
      const { error } = await supabase
        .from('company_machine_templates')
        .insert({
          company_id: user?.company_id,
          machine_template_id: templateId
        })

      if (error) throw error

      showToast(`"${templateName}" added to your company catalog`, 'success')
      loadMachineTemplates() // Refresh the list
    } catch (error: any) {
      showToast('Failed to add template to company catalog: ' + error.message, 'error')
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      // Delete slots first
      const { error: slotsError } = await supabase
        .from('machine_template_slots')
        .delete()
        .eq('machine_template_id', templateId)

      if (slotsError) throw slotsError

      // Delete from company catalogs
      const { error: companyError } = await supabase
        .from('company_machine_templates')
        .delete()
        .eq('machine_template_id', templateId)

      if (companyError) throw companyError

      // Delete the template
      const { error: templateError } = await supabase
        .from('machine_templates')
        .delete()
        .eq('id', templateId)

      if (templateError) throw templateError

      showToast('Template deleted successfully', 'success')
      loadMachineTemplates()
    } catch (error: any) {
      showToast('Failed to delete template: ' + error.message, 'error')
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
            <h1 className="text-3xl font-bold text-gray-900">Global Machine Templates</h1>
            <p className="text-gray-600 mt-2">Browse and add machine templates to your company catalog</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/operators/machine-templates/builder')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create Template
            </button>
            <button
              onClick={() => router.push('/operators/machine-templates')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              My Company Templates
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
              🔍 Search Templates
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="Search by template name, category, or dimensions..."
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
                All Categories ({allMachineTemplates.length})
              </button>
              {machineCategories.map(category => {
                const count = allMachineTemplates.filter(template => template.category.id === category.id).length
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
                📊 Showing <span className="font-semibold text-gray-900">{machineTemplates.length}</span> of <span className="font-semibold text-gray-900">{allMachineTemplates.length}</span> templates
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

      {machineTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No machine templates available in the global catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machineTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {template.image_url && (
                <div className="h-[400px] overflow-hidden">
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                  {template.is_in_company_catalog && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Added
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Category:</strong> {template.category.name}</p>
                  <p><strong>Dimensions:</strong> {template.dimensions || 'Not specified'}</p>
                  <p><strong>Slots:</strong> {template.slot_count}</p>
                  {template.created_by_company && (
                    <p><strong>Created by:</strong> {template.created_by_company.name}</p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/operators/machine-templates/${template.id}`)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    View Details
                  </button>
                  
                  {template.can_delete && (
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                      title="Delete template"
                    >
                      Delete
                    </button>
                  )}
                  
                  {!template.is_in_company_catalog ? (
                    <button
                      onClick={() => addToCompanyCatalog(template.id, template.name)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                      Add to Catalog
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/operators/machine-templates')}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
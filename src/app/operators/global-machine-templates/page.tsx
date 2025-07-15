'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import RouteGuard from '@/components/auth/RouteGuard'

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
  const { user } = useAuth()
  const { showToast } = useToast()
  const [machineTemplates, setMachineTemplates] = useState<MachineTemplate[]>([])
  const [allMachineTemplates, setAllMachineTemplates] = useState<MachineTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [machineCategories, setMachineCategories] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    if (user?.company_id) {
      loadMachineTemplates()
    }
  }, [user])

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
      if (!user?.company_id) {
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
          slot_count
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
        .eq('company_id', user.company_id)

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
        slot_count: item.slot_count || 0,
        is_in_company_catalog: companyTemplateIds.has(item.id),
        created_by_company: null,
        can_delete: false
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

  return (
    <RouteGuard requiredRoles={["admin", "operator"]} redirectTo="/operators/login">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Machine Templates</h1>
              <p className="text-gray-600 mt-2">Browse and manage vending machine templates</p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/operators/machine-templates/builder"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Template
              </a>
              <a
                href="/operators/machine-templates"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View My Templates
              </a>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Templates</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, category, or dimensions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {machineCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Templates ({machineTemplates.length} of {allMachineTemplates.length})
              </h3>
            </div>
            {machineTemplates.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                {allMachineTemplates.length === 0 ? 'No machine templates found.' : 'No templates match your search criteria.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {machineTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Template Image */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {template.image_url ? (
                        <img
                          src={template.image_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Template Info */}
                    <div className="p-4">
                      <div className="mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {template.name}
                        </h3>
                        <p className="text-gray-600 text-xs truncate">
                          {template.category.name}
                        </p>
                      </div>

                      {template.dimensions && (
                        <p className="text-gray-500 text-xs mb-3">
                          {template.dimensions}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.slot_count} slots
                        </span>
                        
                        <div className="flex space-x-2">
                          {template.is_in_company_catalog ? (
                            <span className="text-green-600 text-xs font-medium">
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => addToCompanyCatalog(template.id, template.name)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              Add
                            </button>
                          )}
                          
                          {template.can_delete && (
                            <button
                              onClick={() => deleteTemplate(template.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RouteGuard>
  )
} 
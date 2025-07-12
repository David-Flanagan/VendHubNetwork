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
}

export default function MachineTemplatesPage() {
  const { loading: authLoading, isAdmin } = useAuth()
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
    if (!authLoading && !isAdmin) {
      router.push('/admin/login')
      return
    }
    if (isAdmin) {
      loadMachineTemplates()
    }
  }, [authLoading, isAdmin, router])

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
      const { data, error } = await supabase
        .from('machine_templates')
        .select(`
          id,
          name,
          image_url,
          dimensions,
          created_at,
          category_id,
          slot_count:machine_template_slots(count)
        `)
        .order('name')

      if (error) throw error

      // Get machine categories for lookup
      const { data: categories, error: categoriesError } = await supabase
        .from('machine_categories')
        .select('id, name')
        .order('name')

      if (categoriesError) throw categoriesError

      // Create a lookup map for categories
      const categoryMap = new Map(categories?.map(cat => [cat.id, cat.name]) || [])
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        dimensions: item.dimensions,
        created_at: item.created_at,
        category: {
          id: item.category_id,
          name: categoryMap.get(item.category_id) || 'Unknown'
        },
        slot_count: item.slot_count?.[0]?.count || 0
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the machine template "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Check if any companies are using this template
      const { data: companyTemplates, error: checkError } = await supabase
        .from('company_machine_templates')
        .select('id')
        .eq('machine_template_id', id)

      if (checkError) throw checkError

      if (companyTemplates && companyTemplates.length > 0) {
        showToast(`Cannot delete: This template is used by ${companyTemplates.length} company(ies)`, 'error')
        return
      }

      const { error } = await supabase
        .from('machine_templates')
        .delete()
        .eq('id', id)

      if (error) throw error

      showToast('Machine template deleted successfully', 'success')
      loadMachineTemplates()
    } catch (error: any) {
      showToast('Failed to delete machine template: ' + error.message, 'error')
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
            <h1 className="text-3xl font-bold text-gray-900">Machine Templates</h1>
            <p className="text-gray-600 mt-2">Manage global machine templates for operators</p>
          </div>
          <button
            onClick={() => router.push('/admin/machine-templates/builder')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Template
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Machine Templates ({machineTemplates.length})</h3>
        </div>
        
        {machineTemplates.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p className="mb-4">No machine templates found.</p>
            <button
              onClick={() => router.push('/admin/machine-templates/builder')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First Template
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dimensions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slots
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {machineTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {template.image_url && (
                          <img
                            src={template.image_url}
                            alt={template.name}
                            className="w-16 h-20 object-cover rounded-md mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.category?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.dimensions || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.slot_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/admin/machine-templates/${template.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(template.id, template.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 
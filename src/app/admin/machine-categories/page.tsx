'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface MachineCategory {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function MachineCategoriesPage() {
  const { loading: authLoading, isAdmin } = useAuth()
  const [machineCategories, setMachineCategories] = useState<MachineCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/admin/login')
      return
    }
    if (isAdmin) {
      loadMachineCategories()
    }
  }, [authLoading, isAdmin, router])

  const loadMachineCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setMachineCategories(data || [])
    } catch (error: any) {
      setError('Failed to load machine categories')
      console.error('Error loading machine categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    try {
      if (editingId) {
        // Update existing machine category
        const { error } = await supabase
          .from('machine_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create new machine category
        const { error } = await supabase
          .from('machine_categories')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null
          })

        if (error) throw error
      }

      setFormData({ name: '', description: '' })
      setShowAddForm(false)
      setEditingId(null)
      loadMachineCategories()
    } catch (error: any) {
      setError(error.message || 'Failed to save machine category')
    }
  }

  const handleEdit = (machineCategory: MachineCategory) => {
    setEditingId(machineCategory.id)
    setFormData({
      name: machineCategory.name,
      description: machineCategory.description || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine category?')) return

    try {
      // Check if any machine templates use this category
      const { data: templates, error: checkError } = await supabase
        .from('machine_templates')
        .select('id')
        .eq('category_id', id)

      if (checkError) throw checkError

      if (templates && templates.length > 0) {
        setError('Cannot delete: This machine category is used by existing machine templates')
        return
      }

      const { error } = await supabase
        .from('machine_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadMachineCategories()
    } catch (error: any) {
      setError(error.message || 'Failed to delete machine category')
    }
  }

  const cancelForm = () => {
    setFormData({ name: '', description: '' })
    setShowAddForm(false)
    setEditingId(null)
    setError('')
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
            <h1 className="text-3xl font-bold text-gray-900">Machine Categories</h1>
            <p className="text-gray-600 mt-2">Manage vending machine categories for templates</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Machine Category
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Machine Category' : 'Add New Machine Category'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter machine category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter description (optional)"
                  rows={1}
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Machine Categories ({machineCategories.length})</h3>
        </div>
        {machineCategories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No machine categories found. Create your first machine category to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {machineCategories.map((machineCategory) => (
                  <tr key={machineCategory.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {machineCategory.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {machineCategory.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(machineCategory.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(machineCategory)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(machineCategory.id)}
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
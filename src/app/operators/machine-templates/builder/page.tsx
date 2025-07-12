'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'

interface MachineCategory {
  id: string
  name: string
  description: string | null
}

interface ProductType {
  id: string
  name: string
  description: string | null
}

interface Slot {
  rowNumber: number
  slotNumber: number
  productTypeId: string
  mdbCode: string
}

export default function OperatorMachineTemplateBuilderPage() {
  const { loading: authLoading, isOperator, user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    dimensions: '',
    imageFile: null as File | null
  })

  // Dynamic slots state
  const [rows, setRows] = useState<number[][]>([[1]]) // Each row contains slot numbers
  const [slots, setSlots] = useState<Slot[]>([])

  // Data loading state
  const [machineCategories, setMachineCategories] = useState<MachineCategory[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !isOperator) {
      router.push('/operators/login')
      return
    }
    if (isOperator) {
      loadData()
    }
  }, [authLoading, isOperator, router])

  const loadData = async () => {
    try {
      const [categoriesResult, typesResult] = await Promise.all([
        supabase.from('machine_categories').select('*').order('name'),
        supabase.from('product_types').select('*').order('name')
      ])

      if (categoriesResult.error) throw categoriesResult.error
      if (typesResult.error) throw typesResult.error

      setMachineCategories(categoriesResult.data || [])
      setProductTypes(typesResult.data || [])
    } catch (error: any) {
      showToast('Failed to load data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const addRow = () => {
    const newRowNumber = rows.length + 1
    setRows([...rows, [1]]) // Add new row with 1 slot
  }

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return // Keep at least one row
    
    const newRows = rows.filter((_, index) => index !== rowIndex)
    setRows(newRows)
    
    // Remove slots for this row
    const newSlots = slots.filter(slot => slot.rowNumber !== rowIndex + 1)
    setSlots(newSlots)
  }

  const updateSlotsInRow = (rowIndex: number, slotCount: number) => {
    const newRows = [...rows]
    newRows[rowIndex] = Array.from({ length: slotCount }, (_, i) => i + 1)
    setRows(newRows)
    
    // Update slots for this row
    const newSlots = slots.filter(slot => slot.rowNumber !== rowIndex + 1)
    for (let i = 1; i <= slotCount; i++) {
      const existingSlot = slots.find(s => s.rowNumber === rowIndex + 1 && s.slotNumber === i)
      if (existingSlot) {
        newSlots.push(existingSlot)
      } else {
        newSlots.push({
          rowNumber: rowIndex + 1,
          slotNumber: i,
          productTypeId: '',
          mdbCode: ''
        })
      }
    }
    setSlots(newSlots)
  }

  const updateSlot = (rowNumber: number, slotNumber: number, field: 'productTypeId' | 'mdbCode', value: string) => {
    const newSlots = [...slots]
    const slotIndex = newSlots.findIndex(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
    
    if (slotIndex >= 0) {
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
    } else {
      newSlots.push({
        rowNumber,
        slotNumber,
        productTypeId: field === 'productTypeId' ? value : '',
        mdbCode: field === 'mdbCode' ? value : ''
      })
    }
    
    setSlots(newSlots)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image file size must be less than 5MB', 'error')
        return
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error')
        return
      }
      setFormData({ ...formData, imageFile: file })
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      showToast('Machine template name is required', 'error')
      return false
    }
    if (!formData.categoryId) {
      showToast('Please select a machine category', 'error')
      return false
    }
    if (!formData.dimensions.trim()) {
      showToast('Dimensions are required (format: LxWxH)', 'error')
      return false
    }
    
    // Check if all slots have both product type and MDB code
    const invalidSlots = slots.filter(slot => !slot.productTypeId || !slot.mdbCode.trim())
    if (invalidSlots.length > 0) {
      showToast('All slots must have both product type and MDB code', 'error')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setSaving(true)
    
    try {
      // Debug: Log user info
      console.log('Current user:', user)
      
      // Get user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user?.id)
        .single()

      console.log('User data result:', { userData, userError })

      if (userError || !userData?.company_id) {
        throw new Error('Company not found')
      }

      let imageUrl = null
      
      // Upload image if provided
      if (formData.imageFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('machine-images')
          .upload(fileName, formData.imageFile)
        
        if (uploadError) throw uploadError
        
        const { data: urlData } = supabase.storage
          .from('machine-images')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
      }
      
      // Calculate total slot count
      const totalSlotCount = rows.reduce((sum, row) => sum + row.length, 0)
      
      // Debug: Log the data we're trying to insert
      const templateData = {
        name: formData.name.trim(),
        category_id: formData.categoryId,
        image_url: imageUrl,
        dimensions: formData.dimensions.trim(),
        created_by_company_id: userData.company_id,
        slot_count: totalSlotCount
      }
      console.log('Attempting to insert template data:', templateData)
      
      // Create machine template
      const { data: template, error: templateError } = await supabase
        .from('machine_templates')
        .insert(templateData)
        .select()
        .single()
      
      console.log('Template creation result:', { template, templateError })
      
      if (templateError) throw templateError
      
      // Create slots
      if (slots.length > 0) {
        const slotData = slots.map(slot => ({
          machine_template_id: template.id,
          row_number: slot.rowNumber,
          slot_number: slot.slotNumber,
          product_type_id: slot.productTypeId,
          mdb_code: slot.mdbCode.trim()
        }))
        
        const { error: slotsError } = await supabase
          .from('machine_template_slots')
          .insert(slotData)
        
        if (slotsError) throw slotsError
      }
      
      showToast('Machine template created successfully!', 'success')
      router.push('/operators/global-machine-templates')
      
    } catch (error: any) {
      showToast('Failed to create machine template: ' + error.message, 'error')
    } finally {
      setSaving(false)
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
        <h1 className="text-3xl font-bold text-gray-900">Create Machine Template</h1>
        <p className="text-gray-600 mt-2">Create a new machine template for the global catalog</p>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
        {/* Left Side - Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            {machineCategories.length === 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  <strong>No machine categories found.</strong> Please contact an admin to create machine categories.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter template name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  {machineCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions (LxWxH in inches) *
                </label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 72x36x84"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Slot Configuration</h2>
              <button
                type="button"
                onClick={addRow}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Add Row
              </button>
            </div>

            {productTypes.length === 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  <strong>No product types found.</strong> Please contact an admin to create product types.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {rows.map((rowSlots, rowIndex) => (
                <div key={rowIndex} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium text-gray-900">Row {rowIndex + 1}</h3>
                    <div className="flex items-center space-x-2">
                      <select
                        value={rowSlots.length}
                        onChange={(e) => updateSlotsInRow(rowIndex, parseInt(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num} slot{num !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(rowIndex)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Remove Row
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {rowSlots.map((_, slotIndex) => {
                      const slotNumber = slotIndex + 1
                      const rowNumber = rowIndex + 1
                      const slot = slots.find(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber) || {
                        rowNumber,
                        slotNumber,
                        productTypeId: '',
                        mdbCode: ''
                      }

                      return (
                        <div key={slotIndex} className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Slot {slotNumber}</h4>
                          
                          <select
                            value={slot.productTypeId}
                            onChange={(e) => updateSlot(rowNumber, slotNumber, 'productTypeId', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            required
                          >
                            <option value="">Select product type</option>
                            {productTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.name}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={slot.mdbCode}
                            onChange={(e) => updateSlot(rowNumber, slotNumber, 'mdbCode', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="MDB Code"
                            required
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operators/global-machine-templates')}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Right Side - Live Preview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border h-fit">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h2>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Name:</strong> {formData.name || 'Not set'}</p>
              <p><strong>Category:</strong> {machineCategories.find(c => c.id === formData.categoryId)?.name || 'Not selected'}</p>
              <p><strong>Dimensions:</strong> {formData.dimensions || 'Not set'}</p>
            </div>

            {formData.imageFile && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Machine Image:</p>
                <img
                  src={URL.createObjectURL(formData.imageFile)}
                  alt="Machine preview"
                  className="w-full h-[400px] object-cover rounded-md border"
                />
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Slot Layout:</p>
              <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                {rows.map((rowSlots, rowIndex) => (
                  <div key={rowIndex} className="mb-3 last:mb-0">
                    <div className="text-xs text-gray-500 mb-1">Row {rowIndex + 1}</div>
                    <div className="flex space-x-2">
                      {rowSlots.map((_, slotIndex) => {
                        const slotNumber = slotIndex + 1
                        const rowNumber = rowIndex + 1
                        const slot = slots.find(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
                        const isComplete = slot && slot.productTypeId && slot.mdbCode.trim()
                        
                        return (
                          <div
                            key={slotIndex}
                            className={`w-12 h-12 border-2 rounded flex items-center justify-center text-xs font-medium ${
                              isComplete 
                                ? 'border-green-500 bg-green-100 text-green-800' 
                                : 'border-gray-300 bg-gray-100 text-gray-500'
                            }`}
                          >
                            {slotNumber}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>Total Rows:</strong> {rows.length}</p>
              <p><strong>Total Slots:</strong> {rows.reduce((sum, row) => sum + row.length, 0)}</p>
              <p><strong>Complete Slots:</strong> {slots.filter(s => s.productTypeId && s.mdbCode.trim()).length}</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
} 
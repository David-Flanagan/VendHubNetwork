'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import RouteGuard from '@/components/auth/RouteGuard'

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
  productTypeIds: string[]
  mdbCode: string
  alias: string
}

export default function OperatorMachineTemplateBuilderPage() {
  const { user, loading: authLoading, isOperator } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    modelNumber: '',
    lengthInches: '',
    widthInches: '',
    heightInches: '',
    isOutdoorRated: false,
    technicalDescription: '',
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
          productTypeIds: [],
          mdbCode: '',
          alias: ''
        })
      }
    }
    setSlots(newSlots)
  }

  const updateSlot = (rowNumber: number, slotNumber: number, field: 'productTypeIds' | 'mdbCode' | 'alias', value: any) => {
    const newSlots = [...slots]
    const slotIndex = newSlots.findIndex(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
    
    if (slotIndex >= 0) {
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
    } else {
      newSlots.push({
        rowNumber,
        slotNumber,
        productTypeIds: field === 'productTypeIds' ? value : [],
        mdbCode: field === 'mdbCode' ? value : '',
        alias: field === 'alias' ? value : ''
      })
    }
    
    setSlots(newSlots)
  }

  const addProductTypeToSlot = (rowNumber: number, slotNumber: number, productTypeId: string) => {
    const slot = slots.find(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
    if (slot && !slot.productTypeIds.includes(productTypeId)) {
      updateSlot(rowNumber, slotNumber, 'productTypeIds', [...slot.productTypeIds, productTypeId])
    }
  }

  const removeProductTypeFromSlot = (rowNumber: number, slotNumber: number, productTypeId: string) => {
    const slot = slots.find(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
    if (slot) {
      updateSlot(rowNumber, slotNumber, 'productTypeIds', slot.productTypeIds.filter(id => id !== productTypeId))
    }
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
    if (!formData.modelNumber.trim()) {
      showToast('Model number is required', 'error')
      return false
    }
    if (!formData.lengthInches || !formData.widthInches || !formData.heightInches) {
      showToast('All dimensions are required', 'error')
      return false
    }
    
    // Check if all slots have at least one product type, MDB code, and alias
    const invalidSlots = slots.filter(slot => 
      slot.productTypeIds.length === 0 || 
      !slot.mdbCode.trim() || 
      !slot.alias.trim()
    )
    if (invalidSlots.length > 0) {
      showToast('All slots must have at least one product type, MDB code, and alias', 'error')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    
    setSaving(true)
    
    try {
      let imageUrl = null
      
      // Upload image if provided
      if (formData.imageFile) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('machine-templates')
          .upload(fileName, formData.imageFile)
        
        if (uploadError) throw uploadError
        
        const { data: urlData } = supabase.storage
          .from('machine-templates')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
      }
      
      // Calculate total slot count
      const totalSlotCount = slots.length
      
      // Create slot configuration JSON
      const slotConfiguration = slots.map(slot => ({
        row: slot.rowNumber,
        slot: slot.slotNumber,
        product_type_ids: slot.productTypeIds,
        mdb_code: slot.mdbCode,
        alias: slot.alias
      }))

      // Create machine template with slot configuration
      const templateData: any = {
        name: formData.name.trim(),
        category_id: formData.categoryId,
        slot_count: totalSlotCount,
        slot_configuration: slotConfiguration,
        model_number: formData.modelNumber.trim(),
        length_inches: parseInt(formData.lengthInches),
        width_inches: parseInt(formData.widthInches),
        height_inches: parseInt(formData.heightInches),
        is_outdoor_rated: formData.isOutdoorRated
      }
      
      if (formData.technicalDescription.trim()) {
        templateData.technical_description = formData.technicalDescription.trim()
      }
      if (imageUrl) {
        templateData.image_url = imageUrl
      }
      if (user?.company_id) {
        templateData.created_by_company_id = user.company_id
      }
      
      const { data: template, error: templateError } = await supabase
        .from('global_machine_templates')
        .insert(templateData)
        .select()
        .single()
      
      if (templateError) throw templateError
      
      showToast('Machine template created successfully!', 'success')
      router.push('/operators/machine-templates')
      
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
    <RouteGuard requiredRole="operator">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Machine Template Builder</h1>
          <p className="text-gray-600 mt-2">Create a new vending machine template for the global catalog</p>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Form */}
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              {machineCategories.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    <strong>No machine categories found.</strong> Please contact an administrator to create machine categories.
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
                    Template Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                </div>
              </div>
            </div>

            {/* Technical Information Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model # *
                  </label>
                  <input
                    type="text"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter model number"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Length (inches) *
                  </label>
                      <input
                        type="number"
                        value={formData.lengthInches}
                        onChange={(e) => setFormData({ ...formData, lengthInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Length"
                        required
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (inches) *
                    </label>
                      <input
                        type="number"
                        value={formData.widthInches}
                        onChange={(e) => setFormData({ ...formData, widthInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Width"
                        required
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (inches) *
                    </label>
                      <input
                        type="number"
                        value={formData.heightInches}
                        onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Height"
                        required
                      />
                  </div>
                </div>

                <div className="flex items-center">
                    <input
                      type="checkbox"
                    id="outdoorRated"
                      checked={formData.isOutdoorRated}
                      onChange={(e) => setFormData({ ...formData, isOutdoorRated: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  <label htmlFor="outdoorRated" className="ml-2 block text-sm text-gray-900">
                    Outdoor Rated
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technical Description
                  </label>
                  <textarea
                    value={formData.technicalDescription}
                    onChange={(e) => setFormData({ ...formData, technicalDescription: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional technical specifications..."
                  />
                </div>
              </div>
            </div>

            {/* Slot Configuration Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Slot Configuration</h2>
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Row
                </button>
              </div>

              {productTypes.length === 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    <strong>No product types found.</strong> Please contact an administrator to create product types.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900">Row {rowIndex + 1}</h3>
                      <div className="flex items-center space-x-2">
                        <select
                          value={row.length}
                          onChange={(e) => updateSlotsInRow(rowIndex, parseInt(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num} slot{num !== 1 ? 's' : ''}</option>
                          ))}
                        </select>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(rowIndex)}
                            className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            Remove Row
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {row.map((_, slotIndex) => {
                        const slotNumber = slotIndex + 1
                        const slot = slots.find(s => s.rowNumber === rowIndex + 1 && s.slotNumber === slotNumber)

                        return (
                          <div key={slotIndex} className="border border-gray-200 rounded p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Slot {slotNumber}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Alias *</label>
                                <input
                                  type="text"
                                  value={slot?.alias || ''}
                                  onChange={(e) => updateSlot(rowIndex + 1, slotNumber, 'alias', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="e.g., A1, B2, etc."
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">MDB Code *</label>
                                <input
                                  type="text"
                                  value={slot?.mdbCode || ''}
                                  onChange={(e) => updateSlot(rowIndex + 1, slotNumber, 'mdbCode', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="e.g., 01, 02, etc."
                                  required
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Allowed Product Types *</label>
                            <div className="space-y-2">
                                  {productTypes.map((productType) => {
                                    const isSelected = slot?.productTypeIds.includes(productType.id) || false
                                    return (
                                      <label key={productType.id} className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                    onChange={(e) => {
                                            if (e.target.checked) {
                                              addProductTypeToSlot(rowIndex + 1, slotNumber, productType.id)
                                            } else {
                                              removeProductTypeFromSlot(rowIndex + 1, slotNumber, productType.id)
                                            }
                                          }}
                                          className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-xs text-gray-700">{productType.name}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
                <button
                  type="button"
                onClick={() => router.push('/operators/machine-templates')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                Cancel
                </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>

          {/* Right Side - Preview */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h2>
              
              {formData.name && (
            <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{formData.name}</h3>
                    {formData.categoryId && (
                      <p className="text-sm text-gray-600">
                        Category: {machineCategories.find(c => c.id === formData.categoryId)?.name}
                      </p>
                    )}
                    {formData.modelNumber && (
                      <p className="text-sm text-gray-600">Model: {formData.modelNumber}</p>
                    )}
              </div>

                  {formData.lengthInches && formData.widthInches && formData.heightInches && (
                <div>
                      <p className="text-sm text-gray-600">
                        Dimensions: {formData.lengthInches}" × {formData.widthInches}" × {formData.heightInches}"
                      </p>
                </div>
              )}

                  {formData.isOutdoorRated && (
              <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Outdoor Rated
                      </span>
                    </div>
                  )}
                  
                  {slots.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-2">Slot Configuration:</p>
                      <div className="space-y-2">
                        {slots.map((slot, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div>Row {slot.rowNumber}, Slot {slot.slotNumber}</div>
                            <div>Alias: {slot.alias || 'Not set'}</div>
                            <div>MDB: {slot.mdbCode || 'Not set'}</div>
                            <div>Product Types: {slot.productTypeIds.length > 0 
                              ? slot.productTypeIds.map(id => 
                                  productTypes.find(pt => pt.id === id)?.name
                                ).join(', ')
                              : 'None selected'
                            }</div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {!formData.name && (
                <p className="text-gray-500 text-sm">Start filling out the form to see a preview of your template.</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </RouteGuard>
  )
} 
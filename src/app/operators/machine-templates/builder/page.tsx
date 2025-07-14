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
          mdbCode: ''
        })
      }
    }
    setSlots(newSlots)
  }

  const updateSlot = (rowNumber: number, slotNumber: number, field: 'productTypeIds' | 'mdbCode', value: any) => {
    const newSlots = [...slots]
    const slotIndex = newSlots.findIndex(s => s.rowNumber === rowNumber && s.slotNumber === slotNumber)
    
    if (slotIndex >= 0) {
      newSlots[slotIndex] = { ...newSlots[slotIndex], [field]: value }
    } else {
      newSlots.push({
        rowNumber,
        slotNumber,
        productTypeIds: field === 'productTypeIds' ? value : [],
        mdbCode: field === 'mdbCode' ? value : ''
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
    
    // Check if all slots have at least one product type and MDB code
    const invalidSlots = slots.filter(slot => slot.productTypeIds.length === 0 || !slot.mdbCode.trim())
    if (invalidSlots.length > 0) {
      showToast('All slots must have at least one product type and MDB code', 'error')
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
          .from('machine-images')
          .upload(fileName, formData.imageFile)
        
        if (uploadError) throw uploadError
        
        const { data: urlData } = supabase.storage
          .from('machine-images')
          .getPublicUrl(fileName)
        
        imageUrl = urlData.publicUrl
      }
      
      // Create machine template
      const { data: template, error: templateError } = await supabase
        .from('machine_templates')
        .insert({
          name: formData.name.trim(),
          category_id: formData.categoryId,
          model_number: formData.modelNumber.trim(),
          length_inches: parseInt(formData.lengthInches),
          width_inches: parseInt(formData.widthInches),
          height_inches: parseInt(formData.heightInches),
          is_outdoor_rated: formData.isOutdoorRated,
          technical_description: formData.technicalDescription.trim() || null,
          image_url: imageUrl,
          created_by_company: user?.company_id
        })
        .select()
        .single()
      
      if (templateError) throw templateError
      
      // Create slots and slot product types
      if (slots.length > 0) {
        for (const slot of slots) {
          // Create the slot
          const { data: slotData, error: slotError } = await supabase
            .from('machine_template_slots')
            .insert({
              machine_template_id: template.id,
              row_number: slot.rowNumber,
              slot_number: slot.slotNumber,
              mdb_code: slot.mdbCode.trim()
            })
            .select()
            .single()
          
          if (slotError) throw slotError
          
          // Create slot product types
          if (slot.productTypeIds.length > 0) {
            const slotProductTypes = slot.productTypeIds.map(productTypeId => ({
              machine_template_slot_id: slotData.id,
              product_type_id: productTypeId
            }))
            
            const { error: productTypesError } = await supabase
              .from('machine_template_slot_product_types')
              .insert(slotProductTypes)
            
            if (productTypesError) throw productTypesError
          }
        }
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
    <RouteGuard allowedRoles={['operator']}>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dimensions *
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Length (inches)</label>
                      <input
                        type="number"
                        value={formData.lengthInches}
                        onChange={(e) => setFormData({ ...formData, lengthInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="72"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Width (inches)</label>
                      <input
                        type="number"
                        value={formData.widthInches}
                        onChange={(e) => setFormData({ ...formData, widthInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="36"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Height (inches)</label>
                      <input
                        type="number"
                        value={formData.heightInches}
                        onChange={(e) => setFormData({ ...formData, heightInches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="84"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isOutdoorRated}
                      onChange={(e) => setFormData({ ...formData, isOutdoorRated: e.target.checked })}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Indoor or Outdoor Rated</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.technicalDescription}
                    onChange={(e) => setFormData({ ...formData, technicalDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any other relevant information locations would need to know i.e. unique power / water requirements"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Machine Image
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="image-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Choose File</span>
                          <input
                            id="image-upload"
                            name="image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Image photo needs to be Square Aspect Ratio. Recommended size: 400x400 pixels for optimal display on machine cards.
                      </p>
                    </div>
                  </div>
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
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
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
                          productTypeIds: [],
                          mdbCode: ''
                        }

                        return (
                          <div key={slotIndex} className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Slot {slotNumber}</h4>
                            
                            {/* Product Types */}
                            <div className="space-y-2">
                              <label className="block text-xs text-gray-600">Product Types</label>
                              {slot.productTypeIds.map((productTypeId, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <select
                                    value={productTypeId}
                                    onChange={(e) => {
                                      const newProductTypeIds = [...slot.productTypeIds]
                                      newProductTypeIds[index] = e.target.value
                                      updateSlot(rowNumber, slotNumber, 'productTypeIds', newProductTypeIds)
                                    }}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                    required
                                  >
                                    <option value="">Select product type</option>
                                    {productTypes.map((type) => (
                                      <option key={type.id} value={type.id}>
                                        {type.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeProductTypeFromSlot(rowNumber, slotNumber, productTypeId)}
                                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addProductTypeToSlot(rowNumber, slotNumber, productTypes[0]?.id || '')}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                              >
                                + Add Product Type
                              </button>
                            </div>

                            {/* MDB Code */}
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
                <p><strong>Model:</strong> {formData.modelNumber || 'Not set'}</p>
                <p><strong>Dimensions:</strong> {formData.lengthInches && formData.widthInches && formData.heightInches ? `${formData.lengthInches}" × ${formData.widthInches}" × ${formData.heightInches}"` : 'Not set'}</p>
                <p><strong>Outdoor Rated:</strong> {formData.isOutdoorRated ? 'Yes' : 'No'}</p>
              </div>

              {formData.imageFile && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Machine Image:</p>
                  <img
                    src={URL.createObjectURL(formData.imageFile)}
                    alt="Machine preview"
                    className="w-full h-48 object-cover rounded-md border"
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
                          const isComplete = slot && slot.productTypeIds.length > 0 && slot.mdbCode.trim()
                          
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
                <p><strong>Complete Slots:</strong> {slots.filter(s => s.productTypeIds.length > 0 && s.mdbCode.trim()).length}</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </RouteGuard>
  )
} 
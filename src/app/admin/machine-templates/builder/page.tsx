'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import ImageUpload from '@/components/ImageUpload'

interface MachineCategory {
  id: string
  name: string
}

interface ProductType {
  id: string
  name: string
}

interface Slot {
  slot_id: string
  alias: string
  mdb_code: string
  allowed_product_types: string[]
}

interface Row {
  row_number: number
  slots: Slot[]
}

interface MachineTemplateData {
  // Basic Info
  name: string
  description: string
  category_id: string
  image_url: string | null
  
  // Slot Configuration
  slot_configuration: {
    rows: Row[]
  }
  
  // Technical Info (Optional)
  model_number: string
  serial_number: string
  dimensions: {
    length: string
    width: string
    height: string
  }
  power_consumption: string
  technical_description: string
  is_outdoor_rated: boolean
}

interface ExpandedRows {
  [key: number]: boolean
}

export default function MachineTemplateBuilder() {
  const { loading: authLoading, isAdmin, user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [machineCategories, setMachineCategories] = useState<MachineCategory[]>([])
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({})
  
  const [templateData, setTemplateData] = useState<MachineTemplateData>({
    name: '',
    description: '',
    category_id: '',
    image_url: null,
    slot_configuration: {
      rows: []
    },
    model_number: '',
    serial_number: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    power_consumption: '',
    technical_description: '',
    is_outdoor_rated: false
  })

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/admin/login')
      return
    }
    if (isAdmin) {
      loadCategories()
      loadProductTypes()
    }
  }, [authLoading, isAdmin, router])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setMachineCategories(data || [])
    } catch (error: any) {
      showToast('Failed to load machine categories: ' + error.message, 'error')
    }
  }

  const loadProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('id, name')
        .order('name')

      if (error) throw error
      setProductTypes(data || [])
    } catch (error: any) {
      showToast('Failed to load product types: ' + error.message, 'error')
    }
  }

  const updateTemplateData = (field: string, value: any) => {
    setTemplateData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateDimensions = (field: string, value: string) => {
    setTemplateData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [field]: value
      }
    }))
  }

  const addRow = () => {
    const newRowNumber = templateData.slot_configuration.rows.length + 1
    const newRow: Row = {
      row_number: newRowNumber,
      slots: []
    }
    
    setTemplateData(prev => ({
      ...prev,
      slot_configuration: {
        rows: [...prev.slot_configuration.rows, newRow]
      }
    }))
    
    // Auto-expand the new row
    setExpandedRows(prev => ({
      ...prev,
      [newRowNumber]: true
    }))
  }

  const deleteRow = (rowIndex: number) => {
    setTemplateData(prev => ({
      ...prev,
      slot_configuration: {
        rows: prev.slot_configuration.rows.filter((_, index) => index !== rowIndex)
      }
    }))
  }

  const addSlotsToRow = (rowIndex: number, slotCount: number) => {
    const row = templateData.slot_configuration.rows[rowIndex]
    const newSlots: Slot[] = []
    
    for (let i = 1; i <= slotCount; i++) {
      const slotId = `${String.fromCharCode(65 + rowIndex)}${i}`
      newSlots.push({
        slot_id: slotId,
        alias: `Row ${row.row_number} - Slot ${i}`,
        mdb_code: slotId,
        allowed_product_types: []
      })
    }
    
    setTemplateData(prev => ({
      ...prev,
      slot_configuration: {
        rows: prev.slot_configuration.rows.map((r, index) => 
          index === rowIndex ? { ...r, slots: newSlots } : r
        )
      }
    }))
  }

  const updateSlot = (rowIndex: number, slotIndex: number, field: string, value: any) => {
    setTemplateData(prev => ({
      ...prev,
      slot_configuration: {
        rows: prev.slot_configuration.rows.map((row, rIndex) => 
          rIndex === rowIndex ? {
            ...row,
            slots: row.slots.map((slot, sIndex) => 
              sIndex === slotIndex ? { ...slot, [field]: value } : slot
            )
          } : row
        )
      }
    }))
  }

  const addProductTypeToSlot = (rowIndex: number, slotIndex: number, productTypeId: string) => {
    const slot = templateData.slot_configuration.rows[rowIndex].slots[slotIndex]
    if (!slot.allowed_product_types.includes(productTypeId)) {
      updateSlot(rowIndex, slotIndex, 'allowed_product_types', [
        ...slot.allowed_product_types,
        productTypeId
      ])
    }
  }

  const removeProductTypeFromSlot = (rowIndex: number, slotIndex: number, productTypeId: string) => {
    const slot = templateData.slot_configuration.rows[rowIndex].slots[slotIndex]
    updateSlot(rowIndex, slotIndex, 'allowed_product_types', 
      slot.allowed_product_types.filter(id => id !== productTypeId)
    )
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return templateData.name.trim() !== '' && templateData.category_id !== ''
      case 2:
        return templateData.slot_configuration.rows.length > 0 &&
               templateData.slot_configuration.rows.every(row => 
                 row.slots.length > 0 && 
                 row.slots.every(slot => slot.allowed_product_types.length > 0)
               )
      case 3:
        return true // Technical info is optional
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    } else {
      showToast('Please fill in all required fields', 'error')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const saveTemplate = async () => {
    if (!validateStep(currentStep)) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const slotCount = templateData.slot_configuration.rows.reduce(
        (total, row) => total + row.slots.length, 0
      )

      const { data, error } = await supabase
        .from('global_machine_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          category_id: templateData.category_id,
          image_url: templateData.image_url,
          slot_count: slotCount,
          slot_configuration: templateData.slot_configuration,
          model_number: templateData.model_number || null,
          serial_number: templateData.serial_number || null,
          dimensions: `${templateData.dimensions.length}x${templateData.dimensions.width}x${templateData.dimensions.height}`,
          power_consumption: templateData.power_consumption || null,
          technical_description: templateData.technical_description || null,
          is_outdoor_rated: templateData.is_outdoor_rated,
          created_by: user?.id
        })
        .select()
        .single()
      
      if (error) throw error
      
      showToast('Machine template created successfully!', 'success')
      router.push('/admin/machine-templates')
    } catch (error: any) {
      showToast('Failed to create machine template: ' + error.message, 'error')
    } finally {
      setLoading(false)
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Machine Template</h1>
        <p className="text-gray-600 mt-2">Build a new machine template for the global catalog</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-4 text-sm text-gray-600">
          <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Basic Info</span>
          <span className="mx-4">→</span>
          <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Slots</span>
          <span className="mx-4">→</span>
          <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Technical</span>
          <span className="mx-4">→</span>
          <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>Review</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Basic Machine Information</h2>
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Name *
                </label>
                <input
                  type="text"
                value={templateData.name}
                onChange={(e) => updateTemplateData('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter machine name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={templateData.description}
                onChange={(e) => updateTemplateData('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter machine description"
                rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine Category *
                </label>
                <select
                value={templateData.category_id}
                onChange={(e) => updateTemplateData('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                {machineCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Image
              </label>
              <ImageUpload
                currentImageUrl={templateData.image_url}
                onImageUploaded={(url) => updateTemplateData('image_url', url)}
                onUploadError={(error) => showToast(error, 'error')}
                bucketName="machine-templates"
                folderPath="templates"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Configure Machine Slots</h2>
            
            {/* Row Management */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Row Management</h3>
              <button
                onClick={addRow}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Row
              </button>
            </div>

            {/* Rows */}
            {templateData.slot_configuration.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center p-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedRows(prev => ({ ...prev, [row.row_number]: !prev[row.row_number] }))}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {expandedRows[row.row_number] ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    <h4 className="text-lg font-medium text-gray-900">Row {row.row_number}</h4>
                    {row.slots.length > 0 && (
                      <span className="text-sm text-gray-500">({row.slots.length} slots)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {row.slots.length === 0 && (
                      <div className="flex items-center space-x-2">
                        <select
                          onChange={(e) => addSlotsToRow(rowIndex, parseInt(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-md"
                          defaultValue=""
                        >
                          <option value="">Select slots</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num} slots</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      onClick={() => deleteRow(rowIndex)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete Row
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {expandedRows[row.row_number] && (
                  <div className="px-4 pb-4">

                {/* Slot Grid */}
                {row.slots.length > 0 && (
                  <div className="grid grid-cols-10 gap-2 mb-4">
                    {row.slots.map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs font-medium bg-white hover:bg-gray-50 cursor-pointer"
                        title={`${slot.alias} - ${slot.allowed_product_types.length} product types`}
                      >
                        {slot.slot_id}
                      </div>
                    ))}
                  </div>
                )}

                {/* Slot Configuration */}
                {row.slots.length > 0 && (
            <div className="space-y-4">
                    <h5 className="font-medium text-gray-900">Slot Configuration</h5>
                    {row.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Slot Alias
                            </label>
                            <input
                              type="text"
                              value={slot.alias}
                              onChange={(e) => updateSlot(rowIndex, slotIndex, 'alias', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              MDB Code
                            </label>
                            <input
                              type="text"
                              value={slot.mdb_code}
                              onChange={(e) => updateSlot(rowIndex, slotIndex, 'mdb_code', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Product Types *
                            </label>
                            <select
                              onChange={(e) => addProductTypeToSlot(rowIndex, slotIndex, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value=""
                            >
                              <option value="">Add product type</option>
                              {productTypes.map(type => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        {/* Selected Product Types */}
                        {slot.allowed_product_types.length > 0 && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Selected Product Types:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {slot.allowed_product_types.map(typeId => {
                                const productType = productTypes.find(pt => pt.id === typeId)
                                return (
                                  <span
                                    key={typeId}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {productType?.name}
                                    <button
                                      onClick={() => removeProductTypeFromSlot(rowIndex, slotIndex, typeId)}
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Technical Information (Optional)</h2>
            <p className="text-sm text-gray-600">This section is optional and can be edited by operators at any time.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Machine Model #
                </label>
                <input
                  type="text"
                  value={templateData.model_number}
                  onChange={(e) => updateTemplateData('model_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Serial #
                </label>
                    <input
                  type="text"
                  value={templateData.serial_number}
                  onChange={(e) => updateTemplateData('serial_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter serial number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions (inches)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={templateData.dimensions.length}
                    onChange={(e) => updateDimensions('length', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="L"
                  />
                  <input
                    type="text"
                    value={templateData.dimensions.width}
                    onChange={(e) => updateDimensions('width', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="W"
                  />
                  <input
                    type="text"
                    value={templateData.dimensions.height}
                    onChange={(e) => updateDimensions('height', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="H"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Power Consumption
                </label>
                <input
                  type="text"
                  value={templateData.power_consumption}
                  onChange={(e) => updateTemplateData('power_consumption', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter power consumption"
                />
              </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Description
                </label>
              <textarea
                value={templateData.technical_description}
                onChange={(e) => updateTemplateData('technical_description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter technical description"
                rows={3}
              />
            </div>

            <div>
              <label className="flex items-center">
                        <input
                  type="checkbox"
                  checked={templateData.is_outdoor_rated}
                  onChange={(e) => updateTemplateData('is_outdoor_rated', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Outdoor Rated
                </span>
                      </label>
            </div>
                    </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Review Machine Template</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Name:</span> {templateData.name}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {
                      machineCategories.find(c => c.id === templateData.category_id)?.name
                    }
                </div>
                  <div>
                    <span className="font-medium">Description:</span> {templateData.description || 'None'}
              </div>
            </div>
          </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Slot Configuration</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Total Rows:</span> {templateData.slot_configuration.rows.length}
                  </div>
                  <div>
                    <span className="font-medium">Total Slots:</span> {
                      templateData.slot_configuration.rows.reduce((total, row) => total + row.slots.length, 0)
                    }
                  </div>
          </div>
        </div>
            </div>

            {templateData.slot_configuration.rows.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Slot Layout</h3>
                <div className="space-y-4">
                  {templateData.slot_configuration.rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Row {row.row_number}</h4>
                      <div className="grid grid-cols-10 gap-2">
                        {row.slots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs font-medium bg-blue-50"
                            title={`${slot.alias} - ${slot.allowed_product_types.length} product types`}
                          >
                            {slot.slot_id}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {(templateData.model_number || templateData.serial_number || templateData.dimensions.length) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templateData.model_number && (
                    <div><span className="font-medium">Model #:</span> {templateData.model_number}</div>
                  )}
                  {templateData.serial_number && (
                    <div><span className="font-medium">Serial #:</span> {templateData.serial_number}</div>
                  )}
                  {(templateData.dimensions.length || templateData.dimensions.width || templateData.dimensions.height) && (
                    <div>
                      <span className="font-medium">Dimensions:</span> {
                        `${templateData.dimensions.length}x${templateData.dimensions.width}x${templateData.dimensions.height} inches`
                      }
                    </div>
                  )}
                  {templateData.power_consumption && (
                    <div><span className="font-medium">Power:</span> {templateData.power_consumption}</div>
                  )}
                  {templateData.is_outdoor_rated && (
                    <div><span className="font-medium">Outdoor Rated:</span> Yes</div>
                  )}
                </div>
              </div>
            )}
            </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-2">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={saveTemplate}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Template'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
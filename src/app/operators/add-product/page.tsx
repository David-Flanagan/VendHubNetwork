'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    brand_name: '',
    product_name: '',
    description: '',
    product_type_id: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])

  useEffect(() => {
    // Fetch product types from database
    const fetchProductTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('product_types')
          .select('*')
          .order('name')
        
        if (error) throw error
        setProductTypes(data || [])
      } catch (error) {
        console.error('Error fetching product types:', error)
      }
    }

    fetchProductTypes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `product-images/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile)

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)

        imageUrl = urlData.publicUrl
      }

      // Create product with image URL
      const { error } = await supabase
        .from('global_products')
        .insert({
          brand_name: formData.brand_name,
          product_name: formData.product_name,
          description: formData.description || null,
          product_type_id: formData.product_type_id,
          image_url: imageUrl
        })

      if (error) throw error

      alert('Product added to global catalog successfully! You can continue adding more products or view the catalog.')
      
      // Reset form for next product
      setFormData({
        brand_name: '',
        product_name: '',
        description: '',
        product_type_id: ''
      })
      setImageFile(null)
      setImagePreview(null)
      
      // Reset file input
      const fileInput = document.getElementById('image') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error adding product to catalog')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add Product to Global Catalog</h1>
        <p className="text-gray-600 mt-2">Contribute to the shared product catalog for all operators</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700 mb-2">
              Brand Name *
            </label>
            <input
              type="text"
              id="brand_name"
              name="brand_name"
              required
              value={formData.brand_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              id="product_name"
              name="product_name"
              required
              value={formData.product_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter product description (optional)"
            />
          </div>

                      <div>
              <label htmlFor="product_type_id" className="block text-sm font-medium text-gray-700 mb-2">
                Product Type *
              </label>
              <select
                id="product_type_id"
                name="product_type_id"
                required
                value={formData.product_type_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a product type</option>
                {productTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: JPG, PNG, GIF. Max size: 5MB
              </p>
            </div>

            {imagePreview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

          <div className="flex items-center justify-between pt-6">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => router.push('/operators/global-catalog')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                View Catalog
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !formData.brand_name || !formData.product_name || !formData.product_type_id}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Product & Continue'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">About Global Catalog</h3>
        <p className="text-sm text-blue-700">
          Products added to the global catalog are available to all operators. This helps create a comprehensive 
          product database that benefits the entire vending community. Once added, other operators can browse 
          and add these products to their own company catalogs.
        </p>
      </div>
    </div>
  )
} 
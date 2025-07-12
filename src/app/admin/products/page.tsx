'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { signOut } from '@/lib/auth'
import Link from 'next/link'
import { GlobalProduct, ProductType } from '@/types'

interface GlobalProductWithType extends GlobalProduct {
  product_type_name?: string
}

export default function AdminGlobalProductsPage() {
  const { user, loading, isAdmin } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [products, setProducts] = useState<GlobalProductWithType[]>([])
  const [allProducts, setAllProducts] = useState<GlobalProductWithType[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GlobalProductWithType | null>(null)
  const [formData, setFormData] = useState({
    brand_name: '',
    product_name: '',
    description: '',
    product_type_id: '',
    image_url: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/admin/login')
    }
  }, [loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      fetchProducts()
      fetchProductTypes()
    }
  }, [isAdmin])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductType, allProducts])

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const { data, error } = await supabase
        .from('global_products')
        .select(`
          *,
          product_types (
            name
          )
        `)
        .order('product_name')

      if (error) throw error
      
      // Transform the data to include product type name
      const transformedData = data?.map(product => ({
        ...product,
        product_type_name: product.product_types?.name
      })) || []
      
      setProducts(transformedData)
      setAllProducts(transformedData)
    } catch (error) {
      console.error('Error fetching global products:', error)
      showToast('Error fetching products', 'error')
    } finally {
      setLoadingProducts(false)
    }
  }

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

  const filterProducts = () => {
    let filtered = allProducts

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(product => 
        product.brand_name.toLowerCase().includes(search) ||
        product.product_name.toLowerCase().includes(search) ||
        (product.description && product.description.toLowerCase().includes(search))
      )
    }

    // Filter by product type
    if (selectedProductType !== 'all') {
      filtered = filtered.filter(product => product.product_type_id === selectedProductType)
    }

    setProducts(filtered)
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
      showToast('Image uploaded successfully', 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('Error uploading image', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAddProduct = async () => {
    if (!formData.brand_name || !formData.product_name || !formData.product_type_id) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('global_products')
        .insert({
          brand_name: formData.brand_name,
          product_name: formData.product_name,
          description: formData.description || null,
          product_type_id: formData.product_type_id,
          image_url: formData.image_url || null
        })

      if (error) throw error

      await fetchProducts()
      setFormData({
        brand_name: '',
        product_name: '',
        description: '',
        product_type_id: '',
        image_url: ''
      })
      setShowAddModal(false)
      showToast('Product added successfully', 'success')
    } catch (error) {
      console.error('Error adding product:', error)
      showToast('Error adding product', 'error')
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct || !formData.brand_name || !formData.product_name || !formData.product_type_id) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('global_products')
        .update({
          brand_name: formData.brand_name,
          product_name: formData.product_name,
          description: formData.description || null,
          product_type_id: formData.product_type_id,
          image_url: formData.image_url || null
        })
        .eq('id', editingProduct.id)

      if (error) throw error

      await fetchProducts()
      setEditingProduct(null)
      setFormData({
        brand_name: '',
        product_name: '',
        description: '',
        product_type_id: '',
        image_url: ''
      })
      showToast('Product updated successfully', 'success')
    } catch (error) {
      console.error('Error updating product:', error)
      showToast('Error updating product', 'error')
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('global_products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      await fetchProducts()
      showToast('Product deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting product:', error)
      showToast('Error deleting product', 'error')
    }
  }

  const handleEditClick = (product: GlobalProductWithType) => {
    setEditingProduct(product)
    setFormData({
      brand_name: product.brand_name,
      product_name: product.product_name,
      description: product.description || '',
      product_type_id: product.product_type_id,
      image_url: product.image_url || ''
    })
  }

  const handleCancelEdit = () => {
    setEditingProduct(null)
    setFormData({
      brand_name: '',
      product_name: '',
      description: '',
      product_type_id: '',
      image_url: ''
    })
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
  }

  if (loading || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Global Product Catalog</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Global Products</h2>
              <p className="text-gray-600 mt-2">Manage the master catalog of all available products</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Product
            </button>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by brand, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="product-type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <select
                id="product-type-filter"
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {productTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Products ({products.length})
            </h3>
          </div>
          
          {loadingProducts ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600">No products found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {products.map((product) => (
                <div key={product.id} className="bg-gray-50 rounded-lg p-4 border">
                  {product.image_url && (
                    <div className="mb-4">
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-900">{product.product_name}</h4>
                    <p className="text-sm text-gray-600">{product.brand_name}</p>
                    {product.product_type_name && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                        {product.product_type_name}
                      </span>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Created: {new Date(product.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.product_name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    id="brand_name"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Coca-Cola"
                  />
                </div>

                <div>
                  <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Classic Cola"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Product description..."
                  />
                </div>

                <div>
                  <label htmlFor="product_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type *
                  </label>
                  <select
                    id="product_type_id"
                    value={formData.product_type_id}
                    onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a product type</option>
                    {productTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Image
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {uploadingImage && (
                    <p className="text-sm text-blue-600 mt-1">Uploading image...</p>
                  )}
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={editingProduct ? handleCancelEdit : () => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingProduct ? handleEditProduct : handleAddProduct}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import { GlobalProduct, ProductType, ProductCategory } from '@/types'

interface GlobalProductWithType extends GlobalProduct {
  product_type_name?: string
  product_category_name?: string
}

export default function AdminGlobalProductsPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<GlobalProductWithType[]>([])
  const [allProducts, setAllProducts] = useState<GlobalProductWithType[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductType, setSelectedProductType] = useState('all')
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GlobalProductWithType | null>(null)
  const [formData, setFormData] = useState({
    brand_name: '',
    product_name: '',
    description: '',
    product_type_id: '',
    product_category_id: '',
    image_url: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchProductTypes()
    fetchProductCategories()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductType, allProducts])

  const fetchProducts = async () => {
    try {
      if (!supabase) {
        showToast('Database not configured', 'error')
        return
      }
      
      setLoadingProducts(true)
      const { data, error } = await supabase!
        .from('global_products')
        .select(`
          *,
          product_types (
            name
          ),
          product_categories (
            name
          )
        `)
        .order('product_name')

      if (error) throw error
      
      // Transform the data to include product type and category names
      const transformedData = data?.map(product => ({
        ...product,
        product_type_name: product.product_types?.name,
        product_category_name: product.product_categories?.name
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

  const fetchProductCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      setProductCategories(data || [])
    } catch (error) {
      console.error('Error fetching product categories:', error)
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
    if (!formData.brand_name || !formData.product_name || !formData.product_type_id || !formData.product_category_id) {
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
          product_category_id: formData.product_category_id,
          image_url: formData.image_url || null
        })

      if (error) throw error

      await fetchProducts()
      setFormData({
        brand_name: '',
        product_name: '',
        description: '',
        product_type_id: '',
        product_category_id: '',
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
    if (!editingProduct || !formData.brand_name || !formData.product_name || !formData.product_type_id || !formData.product_category_id) {
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
          product_category_id: formData.product_category_id,
          image_url: formData.image_url || null
        })
        .eq('id', editingProduct.id)

      if (error) throw error

      await fetchProducts()
      setFormData({
        brand_name: '',
        product_name: '',
        description: '',
        product_type_id: '',
        product_category_id: '',
        image_url: ''
      })
      setShowAddModal(false)
      setEditingProduct(null)
      showToast('Product updated successfully', 'success')
    } catch (error) {
      console.error('Error updating product:', error)
      showToast('Error updating product', 'error')
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
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
      product_category_id: product.product_category_id,
      image_url: product.image_url || ''
    })
    setShowAddModal(true)
  }

  const handleCancelEdit = () => {
    setFormData({
      brand_name: '',
      product_name: '',
      description: '',
      product_type_id: '',
      product_category_id: '',
      image_url: ''
    })
    setShowAddModal(false)
    setEditingProduct(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Global Products</h1>
            <p className="text-gray-600 mt-2">Manage the global product catalog</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by brand, name, or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loadingProducts ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Products ({products.length} of {allProducts.length})
            </h3>
          </div>
          {products.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {allProducts.length === 0 ? 'No products found. Add your first product to get started.' : 'No products match your search criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.product_name}
                              className="w-10 h-10 rounded-md object-cover mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.product_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.brand_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.product_type_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.product_category_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {product.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.product_name)}
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
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); editingProduct ? handleEditProduct() : handleAddProduct(); }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type *
                    </label>
                    <select
                      value={formData.product_type_id}
                      onChange={(e) => setFormData({ ...formData, product_type_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a type</option>
                      {productTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Category *
                    </label>
                    <select
                      value={formData.product_category_id}
                      onChange={(e) => setFormData({ ...formData, product_category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a category</option>
                      {productCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
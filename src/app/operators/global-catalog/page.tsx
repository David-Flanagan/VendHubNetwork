'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { GlobalProduct } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

interface GlobalProductWithType extends GlobalProduct {
  product_type_name?: string
  product_category_name?: string
}

interface ProductCategory {
  id: string
  name: string
}

export default function GlobalCatalogPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<GlobalProductWithType[]>([])
  const [allProducts, setAllProducts] = useState<GlobalProductWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [companyProducts, setCompanyProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all')
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [filteredProductTypes, setFilteredProductTypes] = useState<Array<{id: string, name: string}>>([])
  const { showToast } = useToast()

  useEffect(() => {
    fetchGlobalProducts()
    fetchProductTypes()
    fetchProductCategories()
    if (user?.company_id) {
      fetchCompanyProducts()
    }
  }, [user])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductCategory, selectedProductType, allProducts])

  // Update filtered product types when category changes
  useEffect(() => {
    if (selectedProductCategory === 'all') {
      setFilteredProductTypes(productTypes)
      setSelectedProductType('all')
    } else {
      // Get product types that have products in the selected category
      const categoryProducts = allProducts.filter(product => product.product_category_id === selectedProductCategory)
      const categoryProductTypeIds = new Set(categoryProducts.map(product => product.product_type_id))
      const availableTypes = productTypes.filter(type => categoryProductTypeIds.has(type.id))
      setFilteredProductTypes(availableTypes)
      setSelectedProductType('all')
    }
  }, [selectedProductCategory, allProducts, productTypes])

  const fetchGlobalProducts = async () => {
    try {
      const { data, error } = await supabase
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
    } finally {
      setLoading(false)
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

    // Filter by product category
    if (selectedProductCategory !== 'all') {
      filtered = filtered.filter(product => product.product_category_id === selectedProductCategory)
    }

    // Filter by product type
    if (selectedProductType !== 'all') {
      filtered = filtered.filter(product => product.product_type_id === selectedProductType)
    }

    setProducts(filtered)
  }

  const fetchCompanyProducts = async () => {
    try {
      if (!user?.company_id) {
        console.log('No company found for user')
        return
      }

      const { data, error } = await supabase
        .from('company_products')
        .select('global_product_id')
        .eq('company_id', user.company_id)

      if (error) throw error
      const productIds = new Set(data?.map(p => p.global_product_id) || [])
      setCompanyProducts(productIds)
    } catch (error) {
      console.error('Error fetching company products:', error)
    }
  }

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const addToCompanyCatalog = async () => {
    try {
      console.log('Starting addToCompanyCatalog function')
      if (!user?.company_id) {
        console.log('No company found, showing error toast')
        showToast('No company associated with your account', 'error')
        return
      }

      console.log('Adding products:', selectedProducts.size, 'products')
      const productsToAdd = Array.from(selectedProducts).map(productId => ({
        company_id: user.company_id,
        global_product_id: productId,
        price: 0, // Default price, can be updated later
        is_available: true
      }))

      const { error } = await supabase
        .from('company_products')
        .insert(productsToAdd)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Products added successfully, showing success toast')
      // Update local state
      const newCompanyProducts = new Set([...companyProducts, ...selectedProducts])
      setCompanyProducts(newCompanyProducts)
      setSelectedProducts(new Set())

      showToast('Products added to your company catalog!', 'success')
    } catch (error) {
      console.error('Error adding products to company catalog:', error)
      showToast('Error adding products to catalog', 'error')
    }
  }

  const removeFromCompanyCatalog = async (productId: string) => {
    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const { error } = await supabase
        .from('company_products')
        .delete()
        .eq('company_id', user.company_id)
        .eq('global_product_id', productId)

      if (error) throw error

      // Update local state
      const newCompanyProducts = new Set(companyProducts)
      newCompanyProducts.delete(productId)
      setCompanyProducts(newCompanyProducts)

      showToast('Product removed from your company catalog!', 'success')
    } catch (error) {
      console.error('Error removing product from company catalog:', error)
      showToast('Error removing product from catalog', 'error')
    }
  }

  return (
    <RouteGuard requiredRoles={["admin", "operator"]} redirectTo="/operators/login">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Product Catalog</h1>
              <p className="text-gray-600 mt-2">Browse and add products to your company catalog</p>
            </div>
            <div className="flex space-x-4">
              <a
                href="/operators/add-product"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Add New Product
              </a>
              {selectedProducts.size > 0 && (
                <button
                  onClick={addToCompanyCatalog}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add {selectedProducts.size} to Catalog
                </button>
              )}
              <a
                href="/operators/catalog"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                View My Catalog
              </a>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
              <select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {productCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {filteredProductTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
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
                {allProducts.length === 0 ? 'No products found in the global catalog.' : 'No products match your search criteria.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                {products.map((product) => {
                  const isInCompanyCatalog = companyProducts.has(product.id)
                  const isSelected = selectedProducts.has(product.id)
                  
                  return (
                    <div
                      key={product.id}
                      className={`bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                        isSelected ? 'ring-2 ring-blue-500' : 'border-gray-200'
                      }`}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {product.product_name}
                          </h3>
                          <p className="text-gray-600 text-xs truncate">
                            {product.brand_name}
                          </p>
                        </div>

                        {product.description && (
                          <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.product_type_name || 'Unknown'}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {product.product_category_name || 'Unknown'}
                            </span>
                          </div>
                          
                          {isInCompanyCatalog ? (
                            <button
                              onClick={() => removeFromCompanyCatalog(product.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleProductSelection(product.id)}
                              className={`text-xs font-medium ${
                                isSelected
                                  ? 'text-blue-600 hover:text-blue-800'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </RouteGuard>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { GlobalProduct } from '@/types'
import { getCurrentUserId } from '@/lib/auth-utils'
import { useToast } from '@/contexts/ToastContext'

interface GlobalProductWithType extends GlobalProduct {
  product_type_name?: string
}

export default function GlobalCatalogPage() {
  const [products, setProducts] = useState<GlobalProductWithType[]>([])
  const [allProducts, setAllProducts] = useState<GlobalProductWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [companyProducts, setCompanyProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])
  const { showToast } = useToast()

  useEffect(() => {
    fetchGlobalProducts()
    fetchCompanyProducts()
    fetchProductTypes()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductType, allProducts])

  const fetchGlobalProducts = async () => {
    try {
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

  const fetchCompanyProducts = async () => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) return

      // First get the user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError || !userData?.company_id) {
        console.log('No company found for user')
        return
      }

      const { data, error } = await supabase
        .from('company_products')
        .select('global_product_id')
        .eq('company_id', userData.company_id)

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
      const userId = await getCurrentUserId()
      if (!userId) {
        console.log('No user ID found, showing error toast')
        showToast('Please log in to add products to your catalog', 'error')
        return
      }

      // Get the user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError || !userData?.company_id) {
        console.log('No company found, showing error toast')
        showToast('No company associated with your account', 'error')
        return
      }

      console.log('Adding products:', selectedProducts.size, 'products')
      const productsToAdd = Array.from(selectedProducts).map(productId => ({
        company_id: userData.company_id,
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
      const userId = await getCurrentUserId()
      if (!userId) {
        showToast('Please log in to remove products from your catalog', 'error')
        return
      }

      // Get the user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .single()

      if (userError || !userData?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const { error } = await supabase
        .from('company_products')
        .delete()
        .eq('company_id', userData.company_id)
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading global catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Global Product Catalog</h1>
        <p className="text-gray-600 mt-2">Browse and add products to your company catalog</p>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Search Products
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                placeholder="Search by brand name, product name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Product Type Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🏷️ Filter by Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedProductType('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  selectedProductType === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                All Categories ({allProducts.length})
              </button>
              {productTypes.map(type => {
                const count = allProducts.filter(p => p.product_type_id === type.id).length
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedProductType(type.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      selectedProductType === type.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {type.name} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Summary and Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📊 Showing <span className="font-semibold text-gray-900">{products.length}</span> of <span className="font-semibold text-gray-900">{allProducts.length}</span> products
              </div>
              {searchTerm && (
                <div className="text-sm text-blue-600">
                  🔍 Searching for: <span className="font-medium">"{searchTerm}"</span>
                </div>
              )}
            </div>
            {(searchTerm || selectedProductType !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedProductType('all')
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {selectedProducts.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={addToCompanyCatalog}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add to Company Catalog
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isSelected = selectedProducts.has(product.id)
          const isInCompanyCatalog = companyProducts.has(product.id)

          return (
            <div
              key={product.id}
              className={`bg-white p-6 rounded-lg shadow-sm border-2 transition-all ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {product.image_url && (
                      <div className="w-16 h-16 flex-shrink-0">
                        <img
                          src={product.image_url}
                          alt={`${product.brand_name} ${product.product_name}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.brand_name} - {product.product_name}</h3>
                      {product.description && (
                        <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        Type: {product.product_type_name || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  {isInCompanyCatalog ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      In Your Catalog
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProductSelection(product.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Added: {new Date(product.created_at).toLocaleDateString()}
                </div>
                {isInCompanyCatalog && (
                  <button
                    onClick={() => removeFromCompanyCatalog(product.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedProductType !== 'all' ? 'No products found' : 'No products available'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedProductType !== 'all' 
              ? 'Try adjusting your search terms or filters to find more products.'
              : 'The global product catalog is empty.'
            }
          </p>
          {(searchTerm || selectedProductType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedProductType('all')
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { GlobalProduct } from '@/types'
import { getCurrentUserId } from '@/lib/auth-utils'
import { useToast } from '@/contexts/ToastContext'

interface CompanyProduct extends GlobalProduct {
  company_product_id: string
  added_at: string
  product_type_name?: string
  price?: number
}

export default function CompanyCatalogPage() {
  const [products, setProducts] = useState<CompanyProduct[]>([])
  const [allProducts, setAllProducts] = useState<CompanyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValues, setPriceValues] = useState<{[key: string]: string}>({})
  const { showToast } = useToast()

  useEffect(() => {
    fetchCompanyProducts()
    fetchProductTypes()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductType, allProducts])

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
        setProducts([])
        setAllProducts([])
        setLoading(false)
        return
      }

      // Get the company product IDs using company_id with price
      const { data: companyProducts, error: companyError } = await supabase
        .from('company_products')
        .select('id, global_product_id, created_at, price')
        .eq('company_id', userData.company_id)

      if (companyError) throw companyError

      if (!companyProducts || companyProducts.length === 0) {
        setProducts([])
        setAllProducts([])
        setLoading(false)
        return
      }

      // Then get the global product details with product type names
      const globalProductIds = companyProducts.map(cp => cp.global_product_id)
      const { data: globalProducts, error: globalError } = await supabase
        .from('global_products')
        .select(`
          *,
          product_types (
            name
          )
        `)
        .in('id', globalProductIds)

      if (globalError) throw globalError

      // Combine the data
      const formattedProducts = companyProducts.map(cp => {
        const globalProduct = globalProducts?.find(gp => gp.id === cp.global_product_id)
        return {
          ...globalProduct,
          company_product_id: cp.id,
          added_at: cp.created_at,
          product_type_name: globalProduct?.product_types?.name,
          price: cp.price || 0
        }
      }).filter(Boolean) as CompanyProduct[]

      setProducts(formattedProducts)
      setAllProducts(formattedProducts)
    } catch (error) {
      console.error('Error fetching company products:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProductPrice = async (companyProductId: string, newPrice: number) => {
    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        showToast('Please log in to update product prices', 'error')
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
        .update({ price: newPrice })
        .eq('id', companyProductId)
        .eq('company_id', userData.company_id)

      if (error) throw error

      // Update local state
      const updatedAllProducts = allProducts.map(p => 
        p.company_product_id === companyProductId 
          ? { ...p, price: newPrice }
          : p
      )
      setAllProducts(updatedAllProducts)
      setProducts(updatedAllProducts)
      
      setEditingPrice(null)
      showToast('Price updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating product price:', error)
      showToast('Error updating price', 'error')
    }
  }

  const handlePriceEdit = (companyProductId: string, currentPrice: number) => {
    setEditingPrice(companyProductId)
    setPriceValues(prev => ({
      ...prev,
      [companyProductId]: currentPrice.toString()
    }))
  }

  const handlePriceSave = (companyProductId: string) => {
    const priceValue = priceValues[companyProductId]
    const newPrice = parseFloat(priceValue)
    
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Please enter a valid price (0 or greater)', 'error')
      return
    }

    updateProductPrice(companyProductId, newPrice)
  }

  const handlePriceCancel = () => {
    setEditingPrice(null)
    setPriceValues({})
  }

  const removeFromCompanyCatalog = async (companyProductId: string) => {
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
        .eq('id', companyProductId)
        .eq('company_id', userData.company_id) // Ensure user can only delete their own company's products

      if (error) throw error

      // Update local state
      const updatedProducts = allProducts.filter(p => p.company_product_id !== companyProductId)
      setAllProducts(updatedProducts)
      setProducts(updatedProducts)
      showToast('Product removed from your company catalog!', 'success')
    } catch (error) {
      console.error('Error removing product from company catalog:', error)
      showToast('Error removing product from catalog', 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your company catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Company Catalog</h1>
              <p className="text-gray-600 mt-1">Manage your product offerings</p>
            </div>
            <a
              href="/operators/global-catalog"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Products
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{allProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{allProducts.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="space-y-6">
            {/* Search Bar */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Search Your Products
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

        {/* Products Section */}
        {products.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Products</h2>
              <p className="text-sm text-gray-600">{products.length} product{products.length !== 1 ? 's' : ''} in catalog</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <div
                  key={product.company_product_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={`${product.brand_name} ${product.product_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-semibold text-gray-900 truncate">
                          {product.brand_name}
                        </h3>
                        <p className="text-xs text-gray-600 truncate">
                          {product.product_name}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCompanyCatalog(product.company_product_id)}
                        className="ml-1 p-0.5 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from catalog"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Price Section */}
                    <div className="mb-2">
                      {editingPrice === product.company_product_id ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={priceValues[product.company_product_id] || ''}
                            onChange={(e) => setPriceValues(prev => ({
                              ...prev,
                              [product.company_product_id]: e.target.value
                            }))}
                            className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handlePriceSave(product.company_product_id)}
                            className="text-xs text-green-600 hover:text-green-800"
                            title="Save price"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handlePriceCancel}
                            className="text-xs text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center space-x-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                          onClick={() => handlePriceEdit(product.company_product_id, product.price || 0)}
                          title="Click to edit price"
                        >
                          <span className="text-xs font-medium text-gray-900">
                            ${(product.price || 0).toFixed(2)}
                          </span>
                          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate">
                        {product.product_type_name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : allProducts.length > 0 ? (
          /* No Results State */
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedProductType('all')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your catalog is empty</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start building your product catalog by adding products from the global catalog.
            </p>
            <a
              href="/operators/global-catalog"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Global Catalog
            </a>
          </div>
        )}
      </div>
    </div>
  )
} 
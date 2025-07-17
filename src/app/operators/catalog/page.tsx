'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { GlobalProduct } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import RouteGuard from '@/components/auth/RouteGuard'

interface CompanyProduct extends GlobalProduct {
  company_product_id: string
  added_at: string
  product_type_name?: string
  product_category_name?: string
  price?: number
}

interface ProductCategory {
  id: string
  name: string
}

export default function CompanyCatalogPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<CompanyProduct[]>([])
  const [allProducts, setAllProducts] = useState<CompanyProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all')
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [filteredProductTypes, setFilteredProductTypes] = useState<Array<{id: string, name: string}>>([])
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceValues, setPriceValues] = useState<{[key: string]: string}>({})
  const { showToast } = useToast()

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanyProducts()
      fetchProductTypes()
      fetchProductCategories()
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
        setProducts([])
        setAllProducts([])
        setLoading(false)
        return
      }

      // Get the company product IDs using company_id with price
      const { data: companyProducts, error: companyError } = await supabase
        .from('company_products')
        .select('id, global_product_id, created_at, price')
        .eq('company_id', user.company_id)

      if (companyError) throw companyError

      if (!companyProducts || companyProducts.length === 0) {
        setProducts([])
        setAllProducts([])
        setLoading(false)
        return
      }

      // Then get the global product details with product type and category names
      const globalProductIds = companyProducts.map(cp => cp.global_product_id)
      const { data: globalProducts, error: globalError } = await supabase
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
          product_category_name: globalProduct?.product_categories?.name,
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
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const { error } = await supabase
        .from('company_products')
        .update({ price: newPrice })
        .eq('id', companyProductId)
        .eq('company_id', user.company_id)

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
    if (!confirm('Are you sure you want to remove this product from your catalog?')) {
      return
    }

    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error')
        return
      }

      const { error } = await supabase
        .from('company_products')
        .delete()
        .eq('id', companyProductId)
        .eq('company_id', user.company_id)

      if (error) throw error

      // Update local state
      const updatedAllProducts = allProducts.filter(p => p.company_product_id !== companyProductId)
      setAllProducts(updatedAllProducts)
      setProducts(updatedAllProducts)
      
      showToast('Product removed from catalog successfully!', 'success')
    } catch (error) {
      console.error('Error removing product from catalog:', error)
      showToast('Error removing product from catalog', 'error')
    }
  }

  return (
    <RouteGuard requiredRole="operator" redirectTo="/auth/operators/login">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Company Catalog</h1>
              <p className="text-gray-600 mt-2">Manage products in your company's catalog</p>
            </div>
            <a
              href="/operators/global-catalog"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add More Products
            </a>
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

        {/* Products Table */}
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
                {allProducts.length === 0 ? 'No products in your catalog yet. Add some products to get started.' : 'No products match your search criteria.'}
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
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.company_product_id} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingPrice === product.company_product_id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={priceValues[product.company_product_id] || ''}
                                onChange={(e) => setPriceValues(prev => ({
                                  ...prev,
                                  [product.company_product_id]: e.target.value
                                }))}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handlePriceSave(product.company_product_id)}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handlePriceCancel}
                                className="text-gray-600 hover:text-gray-900 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900">
                                ${product.price?.toFixed(2) || '0.00'}
                              </span>
                              <button
                                onClick={() => handlePriceEdit(product.company_product_id, product.price || 0)}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(product.added_at).toLocaleDateString('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric'
})}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => removeFromCompanyCatalog(product.company_product_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
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
      </div>
    </RouteGuard>
  )
} 
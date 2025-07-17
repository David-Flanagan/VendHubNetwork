'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { GlobalProduct } from '@/types';

type TabType = 'company-catalog';

interface CompanyProduct extends GlobalProduct {
  company_product_id: string
  added_at: string
  product_type_name?: string
  product_category_name?: string
  price?: number
  is_available?: boolean
}

interface ProductCategory {
  id: string
  name: string
}

export default function ProductManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('company-catalog');
  
  // Catalog state
  const [products, setProducts] = useState<CompanyProduct[]>([]);
  const [allProducts, setAllProducts] = useState<CompanyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [filteredProductTypes, setFilteredProductTypes] = useState<Array<{id: string, name: string}>>([]);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValues, setPriceValues] = useState<{[key: string]: string}>({});
  const [updatingAvailability, setUpdatingAvailability] = useState<string | null>(null);



  const tabs = [
    {
      id: 'company-catalog' as TabType,
      label: 'Catalog',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    }
  ];

  // Load catalog data when company-catalog tab is active
  useEffect(() => {
    if (activeTab === 'company-catalog' && user?.company_id) {
      fetchCompanyProducts();
      fetchProductTypes();
      fetchProductCategories();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'company-catalog') {
      filterProducts();
    }
  }, [searchTerm, selectedProductCategory, selectedProductType, allProducts, activeTab]);

  // Update filtered product types when category changes
  useEffect(() => {
    if (activeTab === 'company-catalog') {
      if (selectedProductCategory === 'all') {
        setFilteredProductTypes(productTypes);
        setSelectedProductType('all');
      } else {
        // Get product types that have products in the selected category
        const categoryProducts = allProducts.filter(product => product.product_category_id === selectedProductCategory);
        const categoryProductTypeIds = new Set(categoryProducts.map(product => product.product_type_id));
        const availableTypes = productTypes.filter(type => categoryProductTypeIds.has(type.id));
        setFilteredProductTypes(availableTypes);
        setSelectedProductType('all');
      }
    }
  }, [selectedProductCategory, allProducts, productTypes, activeTab]);

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .order('name')
      
      if (error) throw error;
      setProductTypes(data || []);
    } catch (error) {
      console.error('Error fetching product types:', error);
    }
  };

  const fetchProductCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name')
      
      if (error) throw error;
      setProductCategories(data || []);
    } catch (error) {
      console.error('Error fetching product categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = allProducts;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.brand_name.toLowerCase().includes(search) ||
        product.product_name.toLowerCase().includes(search) ||
        (product.description && product.description.toLowerCase().includes(search))
      );
    }

    // Filter by product category
    if (selectedProductCategory !== 'all') {
      filtered = filtered.filter(product => product.product_category_id === selectedProductCategory);
    }

    // Filter by product type
    if (selectedProductType !== 'all') {
      filtered = filtered.filter(product => product.product_type_id === selectedProductType);
    }

    setProducts(filtered);
  };

  const fetchCompanyProducts = async () => {
    try {
      if (!user?.company_id) {
        console.log('No company found for user');
        setProducts([]);
        setAllProducts([]);
        setLoading(false);
        return;
      }

      // Get the company product IDs using company_id with price and availability
      const { data: companyProductsData, error: companyError } = await supabase
        .from('company_products')
        .select('id, global_product_id, created_at, price, is_available')
        .eq('company_id', user.company_id);

      if (companyError) throw companyError;



      if (!companyProductsData || companyProductsData.length === 0) {
        setProducts([]);
        setAllProducts([]);
        setLoading(false);
        return;
      }

      // Then get the global product details with product type and category names
      const globalProductIds = companyProductsData.map(cp => cp.global_product_id);
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
        .in('id', globalProductIds);

      if (globalError) throw globalError;

      // Combine the data
      const formattedProducts = companyProductsData.map(cp => {
        const globalProduct = globalProducts?.find(gp => gp.id === cp.global_product_id);
        return {
          ...globalProduct,
          company_product_id: cp.id,
          added_at: cp.created_at,
          product_type_name: globalProduct?.product_types?.name,
          product_category_name: globalProduct?.product_categories?.name,
          price: cp.price || 0,
          is_available: cp.is_available ?? true
        };
      }).filter(Boolean) as CompanyProduct[];

      setProducts(formattedProducts);
      setAllProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching company products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProductPrice = async (companyProductId: string, newPrice: number) => {
    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error');
        return;
      }

      const { error } = await supabase
        .from('company_products')
        .update({ price: newPrice })
        .eq('id', companyProductId)
        .eq('company_id', user.company_id);

      if (error) throw error;

      // Update local state
      const updatedAllProducts = allProducts.map(p => 
        p.company_product_id === companyProductId 
          ? { ...p, price: newPrice }
          : p
      );
      setAllProducts(updatedAllProducts);

      showToast('Price updated successfully', 'success');
    } catch (error) {
      console.error('Error updating price:', error);
      showToast('Error updating price', 'error');
    }
  };

  const handlePriceEdit = (companyProductId: string, currentPrice: number) => {
    setEditingPrice(companyProductId);
    setPriceValues(prev => ({ ...prev, [companyProductId]: currentPrice.toString() }));
  };

  const handlePriceSave = (companyProductId: string) => {
    const priceValue = parseFloat(priceValues[companyProductId]);
    if (isNaN(priceValue) || priceValue < 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    updateProductPrice(companyProductId, priceValue);
    setEditingPrice(null);
  };

  const handlePriceCancel = () => {
    setEditingPrice(null);
  };

  const removeFromCompanyCatalog = async (companyProductId: string) => {
    try {
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error');
        return;
      }

      const { error } = await supabase
        .from('company_products')
        .delete()
        .eq('id', companyProductId)
        .eq('company_id', user.company_id);

      if (error) throw error;

      // Update local state
      const updatedAllProducts = allProducts.filter(p => p.company_product_id !== companyProductId);
      setAllProducts(updatedAllProducts);

      showToast('Product removed from catalog', 'success');
    } catch (error) {
      console.error('Error removing product:', error);
      showToast('Error removing product', 'error');
    }
  };

  const toggleProductAvailability = async (companyProductId: string, currentAvailability: boolean) => {
    try {
      setUpdatingAvailability(companyProductId);
      
      if (!user?.company_id) {
        showToast('No company associated with your account', 'error');
        return;
      }

      const { error } = await supabase
        .from('company_products')
        .update({ is_available: !currentAvailability })
        .eq('id', companyProductId)
        .eq('company_id', user.company_id);

      if (error) throw error;

      // Update local state
      const updatedAllProducts = allProducts.map(p => 
        p.company_product_id === companyProductId 
          ? { ...p, is_available: !currentAvailability }
          : p
      );
      setAllProducts(updatedAllProducts);

      showToast(`Product ${!currentAvailability ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
      console.error('Error toggling product availability:', error);
      showToast('Error updating product availability', 'error');
    } finally {
      setUpdatingAvailability(null);
    }
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case 'company-catalog':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Your Company Catalog</h3>
                  <p className="text-gray-600">Manage products in your catalog and set pricing</p>
                </div>
                <Link
                  href="/operators/global-catalog"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add More Products
                </Link>
              </div>

              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div>
                  <input
                    type="text"
                    placeholder="Search products by brand, name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filters */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
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

              {/* Products List */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading your catalog...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">No products in your catalog</h3>
                  <p className="text-gray-600 mb-4">
                    Start building your catalog by adding products from the global catalog.
                  </p>
                  <Link
                    href="/operators/global-catalog"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.company_product_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.product_name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">{product.brand_name} - {product.product_name}</h4>
                            <p className="text-sm text-gray-600">{product.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {product.product_category_name}
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {product.product_type_name}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Availability Toggle */}
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${product.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                              {product.is_available ? 'Active' : 'Disabled'}
                            </span>
                            <button
                              onClick={() => toggleProductAvailability(product.company_product_id, product.is_available ?? true)}
                              disabled={updatingAvailability === product.company_product_id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                product.is_available ? 'bg-green-600' : 'bg-gray-200'
                              } ${updatingAvailability === product.company_product_id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  product.is_available ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Price Editing */}
                          <div className="text-right">
                            {editingPrice === product.company_product_id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={priceValues[product.company_product_id] || ''}
                                  onChange={(e) => setPriceValues(prev => ({ ...prev, [product.company_product_id]: e.target.value }))}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                                <button
                                  onClick={() => handlePriceSave(product.company_product_id)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handlePriceCancel}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">${product.price?.toFixed(2) || '0.00'}</span>
                                <button
                                  onClick={() => handlePriceEdit(product.company_product_id, product.price || 0)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => removeFromCompanyCatalog(product.company_product_id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove from catalog"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Catalog</h1>
          <p className="text-gray-600">
            Manage your product catalog and inventory
          </p>
        </div>

        {/* Catalog Content */}
        {renderTabContent()}
      </div>
    </div>
  );
} 
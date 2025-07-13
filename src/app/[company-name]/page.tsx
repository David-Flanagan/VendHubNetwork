'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company, GlobalProduct } from '@/types'
import CompanyMap from '@/components/maps/CompanyMap'

interface CompanyProduct extends GlobalProduct {
  price: number
  is_available: boolean
}

interface MachineTemplate {
  id: string
  name: string
  category: string
  image_url?: string
  dimensions: string
  slot_count: number
}

export default function CompanyProfilePage() {
  const params = useParams()
  const companyName = params['company-name'] as string
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [products, setProducts] = useState<CompanyProduct[]>([])
  const [allProducts, setAllProducts] = useState<CompanyProduct[]>([])
  const [machineTemplates, setMachineTemplates] = useState<MachineTemplate[]>([])
  const [allMachineTemplates, setAllMachineTemplates] = useState<MachineTemplate[]>([])
  const [selectedProductType, setSelectedProductType] = useState<string>('all')
  const [selectedMachineCategory, setSelectedMachineCategory] = useState<string>('all')
  const [productTypes, setProductTypes] = useState<Array<{id: string, name: string}>>([])
  const [machineCategories, setMachineCategories] = useState<Array<{id: string, name: string}>>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (companyName) {
      fetchCompanyProfile()
    }
  }, [companyName])

  useEffect(() => {
    filterProducts()
  }, [searchTerm, selectedProductType, allProducts])

  useEffect(() => {
    filterMachineTemplates()
  }, [selectedMachineCategory, allMachineTemplates])

  const fetchCompanyProfile = async () => {
    try {
      // Decode the company name from URL
      const decodedName = decodeURIComponent(companyName)
      
      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('name', decodedName)
        .single()

      if (companyError || !companyData) {
        console.error('Company not found:', companyError)
        setLoading(false)
        return
      }

      setCompany(companyData)

      // Fetch company products
      await fetchCompanyProducts(companyData.id)
      
      // Fetch machine templates
      await fetchMachineTemplates(companyData.id)
      
      // Fetch product types and machine categories
      await fetchProductTypes()
      await fetchMachineCategories()

    } catch (error) {
      console.error('Error fetching company profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyProducts = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_products')
        .select(`
          price,
          is_available,
          global_product:global_products (
            id,
            brand_name,
            product_name,
            description,
            product_type_id,
            image_url,
            created_at,
            updated_at
          )
        `)
        .eq('company_id', companyId)
        .eq('is_available', true)

      if (error) throw error

      const companyProducts: CompanyProduct[] = (data || []).map((item: any) => ({
        ...item.global_product,
        price: item.price,
        is_available: item.is_available
      }))

      setProducts(companyProducts)
      setAllProducts(companyProducts)
    } catch (error) {
      console.error('Error fetching company products:', error)
    }
  }

  const fetchMachineTemplates = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('company_machine_templates')
        .select(`
          machine_template:machine_templates (
            id,
            name,
            category_id,
            image_url,
            dimensions,
            slot_count
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (error) throw error

      // Get category names for the templates
      const templateIds = (data || []).map((item: any) => item.machine_template.id)
      const { data: categoryData, error: categoryError } = await supabase
        .from('machine_templates')
        .select(`
          id,
          machine_category:machine_categories (
            id,
            name
          )
        `)
        .in('id', templateIds)

      if (categoryError) throw categoryError

      const categoryMap = new Map()
      categoryData?.forEach((item: any) => {
        if (item.machine_category) {
          categoryMap.set(item.id, item.machine_category.name)
        }
      })

      const templates: MachineTemplate[] = (data || []).map((item: any) => ({
        id: item.machine_template.id,
        name: item.machine_template.name,
        category: categoryMap.get(item.machine_template.id) || 'Unknown',
        image_url: item.machine_template.image_url,
        dimensions: item.machine_template.dimensions || 'N/A',
        slot_count: item.machine_template.slot_count || 0
      }))

      setMachineTemplates(templates)
      setAllMachineTemplates(templates)
    } catch (error) {
      console.error('Error fetching machine templates:', error)
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

  const fetchMachineCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('machine_categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      setMachineCategories(data || [])
    } catch (error) {
      console.error('Error fetching machine categories:', error)
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

  const filterMachineTemplates = () => {
    let filtered = allMachineTemplates

    // Filter by machine category
    if (selectedMachineCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedMachineCategory)
    }

    setMachineTemplates(filtered)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
          <p className="text-gray-600">The company profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Profile Image */}
      <div className="relative h-[500px] overflow-hidden">
        {company.profile_image_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${company.profile_image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700"></div>
        )}
        
        {/* Hero Content */}
        <div className="relative h-full flex items-end">
          <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-16 pt-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-white">
                <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
                  {company.name}
                </h1>
                {company.slogan && (
                  <p className="text-xl md:text-2xl text-gray-200 font-light max-w-3xl">
                    {company.slogan}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        {/* Company Info Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* About Section */}
          {company.description && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">About Our Company</h2>
              </div>
              <p className="text-gray-700 leading-relaxed text-lg">{company.description}</p>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Get In Touch</h2>
            </div>
            <div className="space-y-4">
              {company.contact_email && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${company.contact_email}`} className="text-gray-700 hover:text-blue-600 transition-colors">
                    {company.contact_email}
                  </a>
                </div>
              )}
              {company.contact_phone && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${company.contact_phone}`} className="text-gray-700 hover:text-blue-600 transition-colors">
                    {company.contact_phone}
                  </a>
                </div>
              )}
              {company.website && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors">
                    Visit Website
                  </a>
                </div>
              )}
              {company.address && (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{company.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Section */}
        {company.map_enabled && company.latitude && company.longitude && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Service Area</h2>
                <p className="text-gray-600 mt-1">Our warehouse location and service coverage</p>
              </div>
            </div>
            
            <CompanyMap company={company} />
            
            {company.service_area_radius_miles && company.service_area_radius_miles > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-800 font-semibold">
                    We service areas within {company.service_area_radius_miles} miles of our warehouse
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product Catalog Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Product Catalog</h2>
          </div>
          
          {/* Search and Filter */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Product Type Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedProductType('all')}
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  selectedProductType === 'all'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                All Products
              </button>
              {productTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedProductType(type.id)}
                  className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    selectedProductType === type.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    ) : (
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-purple-600 mb-2">{product.brand_name}</p>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg leading-tight">{product.product_name}</h3>
                    <p className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500 text-lg">No products available at the moment.</p>
            </div>
          )}
        </div>

        {/* Machine Templates Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Available Machines</h2>
          </div>
          
          {/* Machine Category Filter Buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => setSelectedMachineCategory('all')}
              className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                selectedMachineCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
              }`}
            >
              All Machines
            </button>
            {machineCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedMachineCategory(category.id)}
                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  selectedMachineCategory === category.id
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Machine Templates Grid */}
          {machineTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {machineTemplates.map((template) => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                    {template.image_url ? (
                      <img
                        src={template.image_url}
                        alt={template.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    ) : (
                      <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4 text-xl">{template.name}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <span className="text-orange-600 font-semibold w-20">Category:</span>
                        <span className="text-gray-700">{template.category}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-orange-600 font-semibold w-20">Dimensions:</span>
                        <span className="text-gray-700">{template.dimensions}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-orange-600 font-semibold w-20">Slots:</span>
                        <span className="text-gray-700">{template.slot_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-gray-500 text-lg">No machines available at the moment.</p>
            </div>
          )}
        </div>

        {/* Call to Action Section */}
        <div className="mt-16 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Begin your vending machine journey with {company.name}. Our team is ready to help you set up the perfect solution for your business.
              </p>
              <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                Begin Onboarding with {company.name}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
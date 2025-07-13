'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import RouteGuard from '@/components/auth/RouteGuard'
import { useAuth } from '@/contexts/AuthContext'
import SortableProfileSection from '@/components/profile/SortableProfileSection'
import CompanyInfoSection from '@/components/profile/CompanyInfoSection'
import ProfileImageSection from '@/components/profile/ProfileImageSection'
import ProductCatalogSection from '@/components/profile/ProductCatalogSection'
import MachineTemplatesSection from '@/components/profile/MachineTemplatesSection'
import VendHubStatsSection from '@/components/profile/VendHubStatsSection'
import MachineGallerySection from '@/components/profile/MachineGallerySection'
import LocationEditor from '@/components/operators/LocationEditor'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SectionConfig {
  id: string
  enabled: boolean
  mandatory: boolean
  order: number
  fixedPosition?: boolean
}

interface DatabaseSectionConfig {
  [key: string]: {
    enabled: boolean
    mandatory: boolean
    order: number
  }
}

export default function EditProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)
  const [sections, setSections] = useState<SectionConfig[]>([])
  const { showToast } = useToast()

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (user?.company_id) {
      fetchCompanyData()
    }
  }, [user])

  const fetchCompanyData = async () => {
    try {
      if (!user?.company_id) return

      // Get company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single()

      if (!companyError && companyData) {
        setCompany(companyData)
        
        // Load section configuration
        const sectionsConfig = companyData.sections_config as DatabaseSectionConfig || {}
        const defaultConfig: DatabaseSectionConfig = {
          hero: { enabled: true, mandatory: true, order: 1 },
          company_info: { enabled: true, mandatory: true, order: 2 },
          location: { enabled: true, mandatory: true, order: 3 },
          product_catalog: { enabled: true, mandatory: true, order: 4 },
          machine_templates: { enabled: true, mandatory: true, order: 5 },
          vendhub_stats: { enabled: false, mandatory: false, order: 6 }
        }
        
        // Use database config if it exists, otherwise use default
        const config = Object.keys(sectionsConfig).length > 0 ? sectionsConfig : defaultConfig
        const sectionsArray = Object.entries(config).map(([id, config]) => ({
          id,
          enabled: config.enabled,
          mandatory: config.mandatory,
          order: config.order,
          fixedPosition: id === 'hero' || id === 'company_info'
        })).sort((a, b) => a.order - b.order)
        
        console.log('Sections configuration loaded:', config)
        console.log('Sections array:', sectionsArray)
        
        setSections(sectionsArray)
      }
    } catch (error) {
      console.error('Error fetching company data:', error)
      showToast('Error loading company data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSectionToggle = async (sectionId: string, enabled: boolean) => {
    if (!company) return

    try {
      // Update local state immediately for better UX
      setSections(prev => 
        prev.map(section => 
          section.id === sectionId 
            ? { ...section, enabled }
            : section
        )
      )

      // Try to update database, but don't fail if column doesn't exist yet
      try {
        const updatedSectionsConfig = sections.reduce((acc, section) => {
          acc[section.id] = {
            enabled: section.id === sectionId ? enabled : section.enabled,
            mandatory: section.mandatory,
            order: section.order
          }
          return acc
        }, {} as DatabaseSectionConfig)

        console.log('Attempting to update sections_config:', updatedSectionsConfig)

        const { data, error } = await supabase
          .from('companies')
          .update({
            sections_config: updatedSectionsConfig,
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id)
          .select()

        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          showToast(`Error updating section configuration: ${error.message}`, 'error')
          // Revert local state on error
          fetchCompanyData()
        } else {
          console.log('Successfully updated sections_config:', data)
          showToast('Section configuration updated', 'success')
        }
      } catch (dbError) {
        console.error('Database update failed:', dbError)
        showToast('Error updating section configuration', 'error')
        // Revert local state on error
        fetchCompanyData()
      }
    } catch (error) {
      console.error('Error updating section configuration:', error)
      showToast('Error updating section configuration', 'error')
      // Revert local state on error
      fetchCompanyData()
    }
  }

  const handleBackToDashboard = () => {
    router.push('/operators/dashboard')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setSections((items) => {
        const activeSection = items.find((item) => item.id === active.id)
        const overSection = items.find((item) => item.id === over?.id)

        // Prevent moving fixed position sections
        if (activeSection?.fixedPosition) {
          showToast('Fixed position sections cannot be moved', 'warning')
          return items
        }

        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        const newSections = arrayMove(items, oldIndex, newIndex)
        
        // Update order numbers
        const updatedSections = newSections.map((section, index) => ({
          ...section,
          order: index + 1
        }))

        // Auto-save the new order to database
        saveSectionOrder(updatedSections)
        
        return updatedSections
      })
    }
  }

  const saveSectionOrder = async (updatedSections: SectionConfig[]) => {
    if (!company) return

    try {
      const updatedSectionsConfig = updatedSections.reduce((acc, section) => {
        acc[section.id] = {
          enabled: section.enabled,
          mandatory: section.mandatory,
          order: section.order
        }
        return acc
      }, {} as DatabaseSectionConfig)

      const { error } = await supabase
        .from('companies')
        .update({
          sections_config: updatedSectionsConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)

      if (error) {
        console.error('Error saving section order:', error)
        showToast('Error saving section order', 'error')
      } else {
        showToast('Section order updated', 'success')
      }
    } catch (error) {
      console.error('Error saving section order:', error)
      showToast('Error saving section order', 'error')
    }
  }

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'hero':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'company_info':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'location':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'product_catalog':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )
      case 'machine_templates':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'vendhub_stats':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'machine_gallery':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getSectionTitle = (sectionId: string) => {
    switch (sectionId) {
      case 'hero': return 'Hero Section (Fixed Position)'
      case 'company_info': return 'Company Information (Fixed Position)'
      case 'location': return 'Location & Service Area'
      case 'product_catalog': return 'Product Catalog'
      case 'machine_templates': return 'Machine Templates'
      case 'vendhub_stats': return 'VendHub Network Stats'
      case 'machine_gallery': return 'Machines in the Field'
      default: return 'Section'
    }
  }

  const getSectionDescription = (sectionId: string) => {
    switch (sectionId) {
      case 'hero': return 'Hero image and company name display (always appears first)'
      case 'company_info': return 'Company details and contact information (always appears second)'
      case 'location': return 'Set your warehouse location and service coverage area'
      case 'product_catalog': return 'Display your product catalog to customers (always visible)'
      case 'machine_templates': return 'Display your available machine templates to customers (always visible)'
      case 'vendhub_stats': return 'Display your network statistics to build trust'
      case 'machine_gallery': return 'Showcase your machine installations with photos'
      default: return 'Customize this section'
    }
  }

  const renderSectionContent = (sectionId: string) => {
    if (!company) return null

    switch (sectionId) {
      case 'hero':
        return <ProfileImageSection company={company} onUpdate={setCompany} />
      case 'company_info':
        return <CompanyInfoSection company={company} onUpdate={setCompany} />
      case 'location':
        return <LocationEditor company={company} onUpdate={setCompany} />
      case 'product_catalog':
        return <ProductCatalogSection company={company} onUpdate={setCompany} />
      case 'machine_templates':
        return <MachineTemplatesSection company={company} onUpdate={setCompany} />
      case 'vendhub_stats':
        return <VendHubStatsSection company={company} onUpdate={setCompany} />
      case 'machine_gallery':
        return <MachineGallerySection company={company} onUpdate={setCompany} />
      default:
        return null
    }
  }

  return (
    <RouteGuard requiredRole="operator" redirectTo="/operators/login">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={handleBackToDashboard}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Customize Public Profile</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Instructions */}
          <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="space-y-2">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800 text-sm font-medium">
                  Drag the handle icon on each section to reorder them. Changes are saved automatically.
                </span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span className="text-blue-800 text-sm font-medium">
                  Click the arrow icon to collapse sections for easier reordering.
                </span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-800 text-sm font-medium">
                  Hero and Company Info sections have fixed positions and cannot be moved.
                </span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : company ? (
            <div className="space-y-8">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map(section => section.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section) => (
                    <SortableProfileSection
                      key={section.id}
                      id={section.id}
                      title={getSectionTitle(section.id)}
                      description={getSectionDescription(section.id)}
                      icon={getSectionIcon(section.id)}
                      isEnabled={section.enabled}
                      isMandatory={section.mandatory}
                      onToggle={section.mandatory ? undefined : (enabled: boolean) => handleSectionToggle(section.id, enabled)}
                      fixedPosition={section.fixedPosition}
                    >
                      {renderSectionContent(section.id)}
                    </SortableProfileSection>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-center">
                <p className="text-gray-600">No company data found. Please contact support.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
} 
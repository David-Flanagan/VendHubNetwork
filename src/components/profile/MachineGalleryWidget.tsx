'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Company, MachineGalleryImage } from '@/types'

interface MachineGalleryWidgetProps {
  company: Company
}

export default function MachineGalleryWidget({ company }: MachineGalleryWidgetProps) {
  const [images, setImages] = useState<MachineGalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchGalleryImages()
  }, [company.id])

  const fetchGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('company_machine_gallery')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error fetching gallery images:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-12">
      <div className="flex items-center mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Machines in the Field</h2>
          <p className="text-gray-600 mt-1">See our installations in action</p>
        </div>
      </div>

      {/* Horizontal Scrolling Gallery */}
      <div className="relative">
        <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex-shrink-0 w-80 relative group snap-start"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative">
                <img
                  src={image.image_url}
                  alt={image.caption || `Machine installation ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Caption Overlay */}
                {image.caption && (
                  <div 
                    className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end transition-opacity duration-300 ${
                      hoveredIndex === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="p-4 text-white">
                      <p className="text-sm font-medium leading-relaxed">{image.caption}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 
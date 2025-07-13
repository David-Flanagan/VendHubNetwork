'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Company, MachineGalleryImage } from '@/types'
import { useToast } from '@/contexts/ToastContext'

interface MachineGallerySectionProps {
  company: Company
  onUpdate: (company: Company) => void
}

interface PendingUpload {
  file: File
  preview: string
  caption: string
}

export default function MachineGallerySection({ company, onUpdate }: MachineGallerySectionProps) {
  const [images, setImages] = useState<MachineGalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const { showToast } = useToast()

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
      showToast('Error loading gallery images', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    // Create preview URL
    const preview = URL.createObjectURL(file)
    setPendingUpload({
      file,
      preview,
      caption: ''
    })
  }

  const handleSubmitUpload = async () => {
    if (!pendingUpload || !company.id) return

    setUploading(true)
    try {
      // Upload image to Supabase Storage
      const fileExt = pendingUpload.file.name.split('.').pop()
      const fileName = `${company.id}/gallery/${Date.now()}.${fileExt}`
      
      console.log('Attempting to upload file:', fileName)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-images')
        .upload(fileName, pendingUpload.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log('File uploaded successfully:', uploadData)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-images')
        .getPublicUrl(fileName)

      console.log('Public URL generated:', publicUrl)

      // Save to database
      const { data: imageData, error: dbError } = await supabase
        .from('company_machine_gallery')
        .insert({
          company_id: company.id,
          image_url: publicUrl,
          caption: pendingUpload.caption.trim() || null,
          display_order: images.length
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', dbError)
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      console.log('Image saved to database:', imageData)

      setImages(prev => [...prev, imageData])
      setPendingUpload(null)
      showToast('Image uploaded successfully!', 'success')
    } catch (error) {
      console.error('Error uploading image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      showToast(`Error uploading image: ${errorMessage}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleCancelUpload = () => {
    if (pendingUpload) {
      URL.revokeObjectURL(pendingUpload.preview)
      setPendingUpload(null)
    }
  }

  const handleUpdateCaption = async (imageId: string, caption: string) => {
    try {
      const { error } = await supabase
        .from('company_machine_gallery')
        .update({ caption: caption.trim() || null })
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => 
        prev.map(img => 
          img.id === imageId ? { ...img, caption: caption.trim() || null } : img
        )
      )
      showToast('Caption updated', 'success')
    } catch (error) {
      console.error('Error updating caption:', error)
      showToast('Error updating caption', 'error')
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('company_machine_gallery')
        .update({ is_active: false })
        .eq('id', imageId)

      if (error) throw error

      setImages(prev => prev.filter(img => img.id !== imageId))
      showToast('Image removed', 'success')
    } catch (error) {
      console.error('Error deleting image:', error)
      showToast('Error removing image', 'error')
    }
  }

  const handleReorderImages = async (newOrder: MachineGalleryImage[]) => {
    try {
      // Update display order for all images
      const updates = newOrder.map((image, index) => ({
        id: image.id,
        display_order: index
      }))

      const { error } = await supabase
        .from('company_machine_gallery')
        .upsert(updates.map(update => ({
          id: update.id,
          display_order: update.display_order,
          updated_at: new Date().toISOString()
        })))

      if (error) throw error

      setImages(newOrder)
      showToast('Image order updated', 'success')
    } catch (error) {
      console.error('Error reordering images:', error)
      showToast('Error updating image order', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!pendingUpload ? (
        <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Machine Photo</h3>
            <p className="text-gray-600 mb-4">
              Upload a photo of your machine installation to showcase your work.
              <br />
              <span className="text-sm text-gray-500">Recommended: 1200x800px, JPG or PNG (max 5MB)</span>
            </p>
                          <div className="space-y-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size <= 5 * 1024 * 1024) {
                      handleFileSelect(file)
                    } else if (file) {
                      showToast('File size must be less than 5MB', 'error')
                    }
                  }}
                  className="hidden"
                  id="gallery-upload"
                />
                <label
                  htmlFor="gallery-upload"
                  className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose Photo
                </label>
              </div>
          </div>
        </div>
      ) : (
        /* Upload Preview & Caption Section */
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Photo Details</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo Preview</label>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={pendingUpload.preview}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Caption Input */}
            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-2">
                Caption (Optional)
              </label>
              <textarea
                id="caption"
                value={pendingUpload.caption}
                onChange={(e) => setPendingUpload(prev => prev ? { ...prev, caption: e.target.value } : null)}
                placeholder="Describe this installation (e.g., 'Snack machine at Downtown Office Building')"
                className="w-full h-32 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                This caption will appear when visitors hover over the image.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancelUpload}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitUpload}
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                'Add to Gallery'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Gallery Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Gallery Images ({images.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div key={image.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-100 relative group">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-200"
                      title="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={image.caption || ''}
                    onChange={(e) => handleUpdateCaption(image.id, e.target.value)}
                    placeholder="Add a caption (optional)..."
                    className="w-full text-sm border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Order: {index + 1}</span>
                    <span className="text-xs text-gray-500">Drag to reorder</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !loading && !pendingUpload && (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No gallery images yet. Upload some photos to showcase your installations!</p>
        </div>
      )}
    </div>
  )
} 
'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
  onUploadError: (error: string) => void
  bucketName: string
  folderPath: string
  maxSizeMB?: number
  acceptedTypes?: string[]
  aspectRatio?: number
  className?: string
}

export default function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onUploadError,
  bucketName,
  folderPath,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  aspectRatio = 16 / 9,
  className = ''
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      onUploadError(`Please select a valid image file (${acceptedTypes.join(', ')})`)
      return
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      onUploadError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(`${folderPath}/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`${folderPath}/${fileName}`)

      onImageUploaded(urlData.publicUrl)
      setPreviewUrl(null)
    } catch (error: any) {
      console.error('Upload error:', error)
      onUploadError(error.message || 'Failed to upload image')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const displayImage = previewUrl || currentImageUrl

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Image Preview */}
      <div
        className={`relative border-2 border-dashed rounded-lg overflow-hidden ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${displayImage ? 'aspect-video' : 'h-48'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt="Profile preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Click to upload or drag and drop</p>
            <p className="text-xs mt-1">PNG, JPG, WEBP up to {maxSizeMB}MB</p>
          </div>
        )}

        {/* Upload Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Uploading...</p>
            </div>
          </div>
        )}

        {/* Click to Upload Overlay */}
        {!uploading && (
          <button
            onClick={handleClick}
            className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
          >
            <div className="text-white text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium">Change Image</p>
            </div>
          </button>
        )}
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload Button */}
      {!displayImage && (
        <button
          onClick={handleClick}
          disabled={uploading}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Select Image'}
        </button>
      )}

      {/* Image Info */}
      {displayImage && (
        <div className="text-xs text-gray-500 text-center">
          <p>Recommended: 1200x600px for best results</p>
          <p>Aspect ratio: {aspectRatio.toFixed(2)}:1</p>
        </div>
      )}
    </div>
  )
} 
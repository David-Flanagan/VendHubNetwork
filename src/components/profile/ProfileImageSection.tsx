'use client'

import { Company } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'

interface ProfileImageSectionProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
}

export default function ProfileImageSection({ company, onUpdate }: ProfileImageSectionProps) {
  const { showToast } = useToast()

  const handleProfileImageUploaded = async (imageUrl: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', company.id)
        .select()
        .single()

      if (error) throw error

      onUpdate(data)
      showToast('Profile image updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating profile image:', error)
      showToast('Error updating profile image', 'error')
    }
  }

  const handleProfileImageError = (error: string) => {
    showToast(error, 'error')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Upload a profile image that will be displayed on your public profile. 
          This image will be used as the hero image on your company page.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Recommended Image Specifications</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Size:</strong> 1200 × 400 pixels (3:1 aspect ratio)</li>
                <li>• <strong>Format:</strong> JPG, PNG, or WebP</li>
                <li>• <strong>File size:</strong> Maximum 5MB</li>
                <li>• <strong>Content:</strong> Company logo, building, or branded imagery</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ImageUpload
        currentImageUrl={company.profile_image_url}
        onImageUploaded={handleProfileImageUploaded}
        onUploadError={handleProfileImageError}
        bucketName="profile-images"
        folderPath={`companies/${company.id}`}
      />

      {company.profile_image_url && (
        <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">Profile image is set and will be displayed on your public profile</span>
          </div>
        </div>
      )}
    </div>
  )
} 
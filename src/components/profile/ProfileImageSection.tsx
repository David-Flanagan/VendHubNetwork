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
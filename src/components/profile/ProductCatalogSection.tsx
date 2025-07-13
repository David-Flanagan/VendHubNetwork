'use client'

import { Company } from '@/types'

interface ProductCatalogSectionProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
}

export default function ProductCatalogSection({ company, onUpdate }: ProductCatalogSectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Your product catalog is automatically displayed on your public profile. 
          This section shows all your available products with filtering options.
        </p>
      </div>

      <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-800 text-sm font-medium">
            Your product catalog is managed in the Products section of your dashboard. 
            When enabled, it will be visible on your public profile.
          </span>
        </div>
      </div>

      <div className="text-center">
        <a
          href="/operators/catalog"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Manage Products
        </a>
      </div>
    </div>
  )
} 
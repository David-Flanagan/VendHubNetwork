'use client'

import { Company } from '@/types'

interface MachineTemplatesSectionProps {
  company: Company
  onUpdate: (updatedCompany: Company) => void
}

export default function MachineTemplatesSection({ company, onUpdate }: MachineTemplatesSectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Your machine templates are automatically displayed on your public profile. 
          This section shows all your available machines with category filtering.
        </p>
      </div>

      <div className="p-6 bg-orange-50 rounded-xl border border-orange-200">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-orange-800 text-sm font-medium">
            Your machine templates are managed in the Machine Templates section of your dashboard. 
            When enabled, they will be visible on your public profile.
          </span>
        </div>
      </div>

      <div className="text-center">
        <a
          href="/operators/machine-templates"
          className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Manage Machine Templates
        </a>
      </div>
    </div>
  )
} 
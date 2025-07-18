'use client'

import React from 'react'

export default function CustomerSupportPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support & Help</h1>
        <p className="text-gray-600">Get help and contact our support team</p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Coming Soon</h3>
          <p className="text-gray-600 mb-6">
            We're building comprehensive support features to help you with any questions or issues.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>• Help documentation</p>
            <p>• Contact support team</p>
            <p>• FAQ section</p>
            <p>• Live chat support</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
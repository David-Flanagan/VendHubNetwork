'use client'

import React from 'react'

interface MachineTemplate {
  id: string
  name: string
  category: string
  category_id: string
  image_url?: string
  dimensions: string
  slot_count: number
}

interface MachineTemplateCardProps {
  template: MachineTemplate
  onClick?: () => void
  selected?: boolean
  showDetails?: boolean
  showTechnicalDetails?: boolean
}

export default function MachineTemplateCard({ 
  template, 
  onClick, 
  selected = false,
  showDetails = false,
  showTechnicalDetails = true
}: MachineTemplateCardProps) {
  return (
    <div
      className={`bg-white border-2 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
        selected 
          ? 'border-blue-500 shadow-lg' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center relative overflow-hidden">
        {template.image_url ? (
          <img
            src={template.image_url}
            alt={template.name}
            className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )}
        
        {/* Selection indicator */}
        {selected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight text-center">
          {template.name}
        </h3>
        <span className="inline-block bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
          {template.category}
        </span>
        
        {showDetails && showTechnicalDetails && (
          <div className="w-full space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Slots:</span>
              <span className="font-medium">{template.slot_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Dimensions:</span>
              <span className="font-medium">{template.dimensions}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
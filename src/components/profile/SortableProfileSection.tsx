'use client'

import { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ProfileSection from './ProfileSection'

interface SortableProfileSectionProps {
  id: string
  title: string
  description: string
  icon: ReactNode
  isEnabled?: boolean
  isMandatory?: boolean
  onToggle?: (enabled: boolean) => void
  children: ReactNode
  className?: string
  fixedPosition?: boolean
}

export default function SortableProfileSection({
  id,
  title,
  description,
  icon,
  isEnabled = true,
  isMandatory = false,
  onToggle,
  children,
  className = '',
  fixedPosition = false
}: SortableProfileSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={className}>
      <ProfileSection
        id={id}
        title={title}
        description={description}
        icon={icon}
        isEnabled={isEnabled}
        isMandatory={isMandatory}
        onToggle={onToggle}
        dragHandleProps={fixedPosition ? undefined : { attributes, listeners }}
      >
        {children}
      </ProfileSection>
    </div>
  )
} 
import { supabase } from './supabase'
import { UserRoleType } from '@/types'

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function getUserRole(): Promise<UserRoleType | null> {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data.role as UserRoleType
}

export async function isOperator(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'operator'
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

export async function getOperatorProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('operators')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export async function createOperatorProfile(profile: {
  company_name: string
  company_description?: string
  contact_email?: string
  phone?: string
  address?: string
}) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('operators')
    .insert({
      user_id: userId,
      ...profile
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function assignUserRole(role: UserRoleType) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role
    })

  if (error) throw error
} 
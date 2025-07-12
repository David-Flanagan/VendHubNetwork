'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function DebugAuth() {
  const { user, loading, isAdmin } = useAuth()
  const [authUser, setAuthUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase auth user
      const { data: { user: authUserData } } = await supabase.auth.getUser()
      setAuthUser(authUserData)

      if (authUserData) {
        // Check users table
        const { data: userTableData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUserData.id)
          .single()

        if (error) {
          console.error('Error fetching user data:', error)
        } else {
          setUserData(userTableData)
        }
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Auth Context State</h2>
          <div className="space-y-2">
            <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
            <div><strong>Is Admin:</strong> {isAdmin ? 'true' : 'false'}</div>
            <div><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Supabase Auth User</h2>
          <div className="space-y-2">
            <div><strong>Auth User:</strong> {authUser ? JSON.stringify(authUser, null, 2) : 'null'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Users Table Data</h2>
          <div className="space-y-2">
            <div><strong>User Data:</strong> {userData ? JSON.stringify(userData, null, 2) : 'null'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Expected Values</h2>
          <div className="space-y-2">
            <div><strong>Expected User ID:</strong> 76628578-9d16-4c90-84fd-836044dd4518</div>
            <div><strong>Expected Email:</strong> admin@vendhub.com</div>
            <div><strong>Expected Role:</strong> admin</div>
          </div>
        </div>
      </div>
    </div>
  )
} 
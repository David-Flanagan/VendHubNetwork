'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { signOut } from '@/lib/auth'
import Link from 'next/link'

interface User {
  id: string
  email: string
  created_at: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  roles: string[]
  operator_profile?: {
    company_name: string
    contact_email: string
    phone: string
    address: string
  }
}

export default function AdminUsersPage() {
  const { user, loading, isAdmin } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editingRoles, setEditingRoles] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    roles: [] as string[]
  })
  const [creatingUser, setCreatingUser] = useState(false)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/admin/login')
    }
  }, [loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // First, get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          created_at,
          company_id
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      console.log('Users fetched:', users)

      // Get company information for users who have company_id
      const usersWithCompanies = users?.filter(user => user.company_id) || []
      const companyIds = [...new Set(usersWithCompanies.map(user => user.company_id))]
      
      let companiesMap = new Map()
      if (companyIds.length > 0) {
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            description,
            contact_email,
            contact_phone,
            address
          `)
          .in('id', companyIds)

        if (companiesError) {
          console.error('Error fetching companies:', companiesError)
        } else {
          console.log('Companies fetched:', companies)
          companiesMap = new Map(companies?.map(company => [company.id, company]) || [])
        }
      }

      // Transform the data to match our User interface
      const transformedUsers: User[] = (users || []).map(user => {
        const company = user.company_id ? companiesMap.get(user.company_id) : null
        
        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          email_confirmed_at: undefined,
          last_sign_in_at: undefined,
          roles: [user.role], // Convert single role to array
          operator_profile: company ? {
            company_name: company.name || '',
            contact_email: company.contact_email || '',
            phone: company.contact_phone || '',
            address: company.address || ''
          } : undefined
        }
      })

      console.log('Transformed users:', transformedUsers)
      setUsers(transformedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast('Error fetching users', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleRoleEdit = (userId: string, currentRoles: string[]) => {
    setEditingUser(userId)
    setEditingRoles([...currentRoles])
  }

  const handleRoleSave = async (userId: string) => {
    try {
      // Update the user's role (single role system)
      if (editingRoles.length > 0) {
        const newRole = editingRoles[0] // Take the first role since we use single role system
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: newRole })
          .eq('id', userId)

        if (updateError) throw updateError

        // Update local state
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, roles: [newRole] }
            : u
        ))

        setEditingUser(null)
        setEditingRoles([])
        showToast('User role updated successfully', 'success')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      showToast('Error updating user role', 'error')
    }
  }

  const handleRoleCancel = () => {
    setEditingUser(null)
    setEditingRoles([])
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete the user from the users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) throw deleteError

      // Note: User deletion from auth.users requires admin privileges
      // This will only remove the user from our users table
      // The user account itself will remain in auth.users but won't have access

      // Update local state
      setUsers(users.filter(u => u.id !== userId))
      showToast('User deleted successfully. User account remains in auth system.', 'success')
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('Error deleting user', 'error')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/admin/login')
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || newUser.roles.length === 0) {
      showToast('Please fill in all fields and select a role', 'error')
      return
    }

    try {
      setCreatingUser(true)

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      // Add user to the users table with role
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user!.id,
          email: newUser.email,
          role: newUser.roles[0] || 'customer' // Use first role or default to customer
        })

      if (userError) throw userError

      // Refresh the users list
      await fetchUsers()

      // Reset form and close modal
      setNewUser({ email: '', password: '', roles: [] })
      setShowCreateModal(false)
      showToast('User created successfully', 'success')
    } catch (error) {
      console.error('Error creating user:', error)
      showToast('Error creating user', 'error')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleCreateModalClose = () => {
    setShowCreateModal(false)
    setNewUser({ email: '', password: '', roles: [] })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter)
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Users</h2>
              <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create User
            </button>
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Users ({filteredUsers.length})
            </h3>
          </div>
          
          {loadingUsers ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID / Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-xs text-gray-500 font-mono">{user.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={editingRoles[0] || ''}
                              onChange={(e) => {
                                setEditingRoles([e.target.value])
                              }}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">Select role</option>
                              <option value="admin">Admin</option>
                              <option value="operator">Operator</option>
                              <option value="customer">Customer</option>
                            </select>
                            <button
                              onClick={() => handleRoleSave(user.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleRoleCancel}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map(role => (
                                <span
                                  key={role}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    role === 'admin' ? 'bg-red-100 text-red-800' :
                                    role === 'operator' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                            <button
                              onClick={() => handleRoleEdit(user.id, user.roles)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.operator_profile ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.operator_profile.company_name}</div>
                            <div className="text-xs text-gray-500">{user.operator_profile.phone}</div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm text-gray-500">No company info</span>
                            <div className="text-xs text-gray-400">Debug: Check console for company data</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    value={newUser.roles[0] || ''}
                    onChange={(e) => setNewUser({ ...newUser, roles: [e.target.value] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a role</option>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCreateModalClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={creatingUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
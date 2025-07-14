import RouteGuard from '@/components/auth/RouteGuard'

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteGuard requiredRole="customer" redirectTo="/customers/login">
      {children}
    </RouteGuard>
  )
} 
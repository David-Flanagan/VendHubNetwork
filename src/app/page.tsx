import Image from "next/image";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to VendHub Network
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Connect Host Locations with Vending Machine Operators. Find the perfect vending solutions for your business.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">For Host Locations</h3>
          <p className="text-gray-600">
            Browse vending operators, compare machines and products, and make informed decisions for your business.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">For Operators</h3>
          <p className="text-gray-600">
            Showcase your vending machines, products, and services to potential host locations in your area.
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
          <p className="text-gray-600">
            Track sales performance, monitor commissions, and generate detailed reports for your vending operations.
          </p>
        </div>
      </div>

      {/* Status Section */}
      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Development Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Project Setup Complete</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Admin Panel - In Progress</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Operator Features - Pending</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">Customer Features - Pending</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Next Steps</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Set up Supabase database tables</li>
              <li>• Create Admin authentication</li>
              <li>• Build Global Product Catalog</li>
              <li>• Implement Machine Templates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

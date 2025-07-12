export default function OperatorsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Operators Panel</h1>
        <p className="text-gray-600 mt-2">Manage your vending machine operations and company profile</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Company Profile */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Company Profile</h3>
          <p className="text-gray-600 mb-4">Customize your company information and branding</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>

        {/* Product Catalog */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Catalog</h3>
          <p className="text-gray-600 mb-4">Manage your company's product offerings and pricing</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>

        {/* Machine Management */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Machine Management</h3>
          <p className="text-gray-600 mb-4">Track and manage your vending machine inventory</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>

        {/* Sales Analytics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Analytics</h3>
          <p className="text-gray-600 mb-4">Monitor sales performance and trends</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>

        {/* Commission Tracking */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Commission Tracking</h3>
          <p className="text-gray-600 mb-4">Track and manage commission payments</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Reports</h3>
          <p className="text-gray-600 mb-4">Generate detailed business reports</p>
          <div className="text-sm text-gray-500">
            Status: <span className="text-yellow-600">Pending Implementation</span>
          </div>
        </div>
      </div>
    </div>
  );
} 
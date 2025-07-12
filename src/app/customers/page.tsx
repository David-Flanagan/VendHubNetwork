export default function CustomersPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Vending Operators</h1>
        <p className="text-gray-600 mt-2">Browse and connect with vending machine operators in your area</p>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              placeholder="Enter your location"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Machine Type</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Types</option>
              <option>Snack Machines</option>
              <option>Beverage Machines</option>
              <option>Combo Machines</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Category</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Categories</option>
              <option>Snacks</option>
              <option>Beverages</option>
              <option>Healthy Options</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operator List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sample Operator Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">VendPro Solutions</h3>
          <p className="text-gray-600 mb-4">Professional vending services with modern equipment and reliable maintenance.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">📍 Downtown Area</span>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              View Details
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">SmartVend Co.</h3>
          <p className="text-gray-600 mb-4">Innovative smart vending solutions with cashless payment options.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">📍 Business District</span>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              View Details
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">EcoVend Services</h3>
          <p className="text-gray-600 mb-4">Environmentally conscious vending with healthy food options.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">📍 Suburban Area</span>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-12 bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Operators</h3>
            <p className="text-gray-600">Find vending operators in your area and compare their offerings</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-semibold">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Machines</h3>
            <p className="text-gray-600">Choose from available machine templates and customize your setup</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-600 font-semibold">3</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Commission</h3>
            <p className="text-gray-600">Negotiate commission rates and finalize your vending partnership</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
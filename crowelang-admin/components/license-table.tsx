'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  MoreVertical, 
  Check, 
  X, 
  Clock,
  Shield,
  Key,
  Mail,
  Copy,
  ExternalLink
} from 'lucide-react'

interface License {
  id: string
  licenseKey: string
  plan: 'free' | 'personal' | 'professional' | 'team' | 'enterprise'
  status: 'active' | 'expired' | 'suspended' | 'cancelled'
  customerEmail: string
  customerName: string
  issuedAt: string
  expiresAt: string
  usage: {
    compilations: number
    apiCalls: number
  }
  paymentMethod: 'stripe' | 'crypto'
}

// Mock data - replace with API call
const mockLicenses: License[] = [
  {
    id: '1',
    licenseKey: 'CL1P-A1B2C3D4-E5F6G7H8-I9J0K1L2-M3N4O5P6',
    plan: 'personal',
    status: 'active',
    customerEmail: 'john.doe@example.com',
    customerName: 'John Doe',
    issuedAt: '2024-01-10T10:00:00Z',
    expiresAt: '2025-01-10T10:00:00Z',
    usage: { compilations: 245, apiCalls: 1023 },
    paymentMethod: 'stripe'
  },
  {
    id: '2',
    licenseKey: 'CL1R-B2C3D4E5-F6G7H8I9-J0K1L2M3-N4O5P6Q7',
    plan: 'professional',
    status: 'active',
    customerEmail: 'jane.smith@company.com',
    customerName: 'Jane Smith',
    issuedAt: '2024-01-08T14:30:00Z',
    expiresAt: '2025-01-08T14:30:00Z',
    usage: { compilations: 1456, apiCalls: 5234 },
    paymentMethod: 'crypto'
  },
  {
    id: '3',
    licenseKey: 'CL1T-C3D4E5F6-G7H8I9J0-K1L2M3N4-O5P6Q7R8',
    plan: 'team',
    status: 'active',
    customerEmail: 'team@startup.io',
    customerName: 'Startup Inc',
    issuedAt: '2023-12-15T09:00:00Z',
    expiresAt: '2024-12-15T09:00:00Z',
    usage: { compilations: 8923, apiCalls: 24567 },
    paymentMethod: 'stripe'
  }
]

export function LicenseTable() {
  const [licenses, setLicenses] = useState(mockLicenses)
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null)

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }

  const planColors = {
    free: 'bg-gray-100 text-gray-800',
    personal: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
    team: 'bg-indigo-100 text-indigo-800',
    enterprise: 'bg-pink-100 text-pink-800'
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    // Show toast notification
  }

  const handleSuspend = (id: string) => {
    setLicenses(prev => prev.map(l => 
      l.id === id ? { ...l, status: 'suspended' } : l
    ))
  }

  const handleRevoke = (id: string) => {
    setLicenses(prev => prev.map(l => 
      l.id === id ? { ...l, status: 'cancelled' } : l
    ))
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              License
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Plan
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Usage
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expires
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {licenses.map((license) => (
            <tr key={license.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Key className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {license.licenseKey.substring(0, 20)}...
                    </div>
                    <button
                      onClick={() => handleCopyKey(license.licenseKey)}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center mt-1"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy full key
                    </button>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {license.customerName}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {license.customerEmail}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${planColors[license.plan]}`}>
                  {license.plan}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[license.status]}`}>
                  {license.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {license.usage.compilations.toLocaleString()} compiles
                </div>
                <div className="text-sm text-gray-500">
                  {license.usage.apiCalls.toLocaleString()} API calls
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {format(new Date(license.expiresAt), 'MMM d, yyyy')}
                </div>
                <div className="text-sm text-gray-500">
                  {Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="relative">
                  <button
                    onClick={() => setSelectedLicense(selectedLicense === license.id ? null : license.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {selectedLicense === license.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <button className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                          <ExternalLink className="w-4 h-4 inline mr-2" />
                          View Details
                        </button>
                        {license.status === 'active' && (
                          <>
                            <button 
                              onClick={() => handleSuspend(license.id)}
                              className="block px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 w-full text-left"
                            >
                              <Clock className="w-4 h-4 inline mr-2" />
                              Suspend License
                            </button>
                            <button 
                              onClick={() => handleRevoke(license.id)}
                              className="block px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left"
                            >
                              <X className="w-4 h-4 inline mr-2" />
                              Revoke License
                            </button>
                          </>
                        )}
                        {license.status === 'suspended' && (
                          <button className="block px-4 py-2 text-sm text-green-700 hover:bg-green-50 w-full text-left">
                            <Check className="w-4 h-4 inline mr-2" />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
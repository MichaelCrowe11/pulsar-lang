'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { User, Mail, Calendar, Shield, CreditCard, Bitcoin } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string
  company?: string
  plan: 'free' | 'personal' | 'professional' | 'team' | 'enterprise'
  registeredAt: string
  lastActive: string
  totalSpent: number
  paymentMethod: 'stripe' | 'crypto' | 'both'
  avatar?: string
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Acme Corp',
    plan: 'professional',
    registeredAt: '2024-01-10T10:00:00Z',
    lastActive: '2024-01-12T15:30:00Z',
    totalSpent: 499,
    paymentMethod: 'stripe'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@startup.io',
    company: 'Startup Inc',
    plan: 'team',
    registeredAt: '2024-01-08T14:00:00Z',
    lastActive: '2024-01-12T10:00:00Z',
    totalSpent: 1999,
    paymentMethod: 'crypto'
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@developer.com',
    plan: 'personal',
    registeredAt: '2024-01-05T09:00:00Z',
    lastActive: '2024-01-11T18:00:00Z',
    totalSpent: 99,
    paymentMethod: 'stripe'
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice@agency.com',
    company: 'Digital Agency',
    plan: 'professional',
    registeredAt: '2024-01-03T11:00:00Z',
    lastActive: '2024-01-12T09:00:00Z',
    totalSpent: 998,
    paymentMethod: 'both'
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@indie.dev',
    plan: 'personal',
    registeredAt: '2024-01-01T08:00:00Z',
    lastActive: '2024-01-10T14:00:00Z',
    totalSpent: 99,
    paymentMethod: 'crypto'
  }
]

export function CustomerList() {
  const [customers] = useState(mockCustomers)

  const planColors = {
    free: 'bg-gray-100 text-gray-800',
    personal: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
    team: 'bg-indigo-100 text-indigo-800',
    enterprise: 'bg-pink-100 text-pink-800'
  }

  const PaymentIcon = ({ method }: { method: string }) => {
    if (method === 'crypto') return <Bitcoin className="w-4 h-4 text-orange-500" />
    if (method === 'both') return (
      <div className="flex">
        <CreditCard className="w-4 h-4 text-blue-500" />
        <Bitcoin className="w-4 h-4 text-orange-500 -ml-1" />
      </div>
    )
    return <CreditCard className="w-4 h-4 text-blue-500" />
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition cursor-pointer"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{customer.name}</h4>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${planColors[customer.plan]}`}>
                  {customer.plan}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                <span className="flex items-center">
                  <Mail className="w-3 h-3 mr-1" />
                  {customer.email}
                </span>
                {customer.company && (
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    {customer.company}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                ${customer.totalSpent.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">lifetime value</div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end mb-1">
                <PaymentIcon method={customer.paymentMethod} />
              </div>
              <div className="text-xs text-gray-500">
                Active {format(new Date(customer.lastActive), 'MMM d')}
              </div>
            </div>
            
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
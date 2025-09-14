'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  CreditCard, 
  Shield, 
  TrendingUp, 
  AlertCircle,
  Activity,
  DollarSign,
  Package,
  Bitcoin,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { DashboardCard } from '@/components/dashboard-card'
import { RevenueChart } from '@/components/revenue-chart'
import { LicenseTable } from '@/components/license-table'
import { CustomerList } from '@/components/customer-list'
import { useStats } from '@/hooks/useStats'

export default function AdminDashboard() {
  const { stats, loading } = useStats()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Crowe-Lang Admin</h1>
                <p className="text-sm text-gray-500">License Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-sm text-gray-500">
                <Activity className="w-4 h-4 mr-1 text-green-500" />
                Live
              </span>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Total Revenue"
            value={`$${stats?.revenue?.total || 0}`}
            change={stats?.revenue?.change || '+12.5%'}
            icon={<DollarSign className="w-6 h-6" />}
            trend="up"
          />
          <DashboardCard
            title="Active Licenses"
            value={stats?.licenses?.active || 0}
            change={`${stats?.licenses?.new || 0} new this week`}
            icon={<Shield className="w-6 h-6" />}
            trend="up"
          />
          <DashboardCard
            title="Total Customers"
            value={stats?.customers?.total || 0}
            change={`${stats?.customers?.new || 0} new today`}
            icon={<Users className="w-6 h-6" />}
            trend="up"
          />
          <DashboardCard
            title="Crypto Payments"
            value={stats?.crypto?.total || 0}
            change={`$${stats?.crypto?.volume || 0} volume`}
            icon={<Bitcoin className="w-6 h-6" />}
            trend="neutral"
          />
        </div>

        {/* Revenue Chart & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
              <RevenueChart />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem
                icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                text="New license purchased"
                time="2 minutes ago"
                detail="Personal Plan - $99"
              />
              <ActivityItem
                icon={<Bitcoin className="w-5 h-5 text-orange-500" />}
                text="Crypto payment received"
                time="15 minutes ago"
                detail="0.0023 BTC (~$99)"
              />
              <ActivityItem
                icon={<Users className="w-5 h-5 text-blue-500" />}
                text="New user registered"
                time="1 hour ago"
                detail="john.doe@example.com"
              />
              <ActivityItem
                icon={<XCircle className="w-5 h-5 text-red-500" />}
                text="Payment failed"
                time="2 hours ago"
                detail="Insufficient funds"
              />
              <ActivityItem
                icon={<Clock className="w-5 h-5 text-yellow-500" />}
                text="License expiring soon"
                time="3 hours ago"
                detail="5 licenses expire this week"
              />
            </div>
          </div>
        </div>

        {/* License Management */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">License Management</h2>
            <div className="flex space-x-2">
              <input
                type="search"
                placeholder="Search licenses..."
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                Create License
              </button>
            </div>
          </div>
          <LicenseTable />
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Recent Customers</h2>
            <button className="text-blue-600 hover:text-blue-700">
              View all →
            </button>
          </div>
          <CustomerList />
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={<Package className="w-6 h-6" />}
            title="Manage Pricing"
            description="Update plans and pricing"
            onClick={() => console.log('Manage pricing')}
          />
          <QuickAction
            icon={<CreditCard className="w-6 h-6" />}
            title="Payment Settings"
            description="Configure Stripe & Coinbase"
            onClick={() => console.log('Payment settings')}
          />
          <QuickAction
            icon={<AlertCircle className="w-6 h-6" />}
            title="System Health"
            description="Monitor API and services"
            onClick={() => console.log('System health')}
          />
        </div>
      </main>
    </div>
  )
}

function ActivityItem({ icon, text, time, detail }: any) {
  return (
    <div className="flex items-start space-x-3">
      {icon}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{text}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  )
}

function QuickAction({ icon, title, description, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="p-6 bg-white rounded-lg border hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-center mb-3">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  )
}
import { Car, Users, Calendar, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vehicles</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-green-600">+2 from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Drivers</p>
              <p className="text-2xl font-bold">18</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">All drivers active</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Bookings</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-blue-600">3 pending approval</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Maintenance Due</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-red-600">Requires attention</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {/* Activity items */}
          <div className="flex items-center py-3 border-b">
            <div className="bg-blue-100 p-2 rounded-lg mr-4">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">New booking request</p>
              <p className="text-sm text-gray-600">John Doe requested Vehicle LUA001</p>
            </div>
            <p className="ml-auto text-sm text-gray-500">5 mins ago</p>
          </div>
          
          <div className="flex items-center py-3 border-b">
            <div className="bg-green-100 p-2 rounded-lg mr-4">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Booking completed</p>
              <p className="text-sm text-gray-600">Vehicle LUA003 returned from trip</p>
            </div>
            <p className="ml-auto text-sm text-gray-500">1 hour ago</p>
          </div>
          
          <div className="flex items-center py-3">
            <div className="bg-red-100 p-2 rounded-lg mr-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium">Maintenance alert</p>
              <p className="text-sm text-gray-600">Vehicle LUA005 due for service</p>
            </div>
            <p className="ml-auto text-sm text-gray-500">2 hours ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
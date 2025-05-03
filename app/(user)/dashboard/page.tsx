'use client'
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, Calendar, Clock, AlertCircle } from 'lucide-react';
import { auth, db } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import AvailableVehicles from '../vehicles/components/AvailableVehicles';

interface UserData {
  name: string;
  staffId: string;
}

export default function UserDashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userData?.name.split(' ')[0]}
        </h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your vehicle requests</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/vehicles"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow p-6 text-white hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Request Vehicle</h3>
              <p className="text-sm text-blue-100">Book a vehicle for your trip</p>
            </div>
            <Car className="h-8 w-8" />
          </div>
        </Link>

        <Link 
          href="/bookings"
          className="bg-white rounded-xl shadow p-6 hover:bg-gray-50 transition-all transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">View Bookings</h3>
              <p className="text-sm text-gray-600">Check your trip status</p>
            </div>
            <Calendar className="h-8 w-8 text-indigo-600" />
          </div>
        </Link>

        <Link 
          href="/history"
          className="bg-white rounded-xl shadow p-6 hover:bg-gray-50 transition-all transform hover:scale-[1.02]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Trip History</h3>
              <p className="text-sm text-gray-600">View past trips</p>
            </div>
            <Clock className="h-8 w-8 text-indigo-600" />
          </div>
        </Link>
      </div>

      {/* Active Bookings */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold color">Active Bookings</h2>
          <div className="mt-4 space-y-4">
            <div className="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Trip to Bunda Campus</p>
                  <p className="text-sm text-gray-600">Tomorrow, 9:00 AM - 5:00 PM</p>
                  <p className="text-sm text-gray-600">Vehicle: Toyota Hilux (LUA001)</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Approved
                </span>
              </div>
            </div>

            <div className="border-l-4 border-yellow-500 bg-yellow-50 rounded-r-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Field Research Trip</p>
                  <p className="text-sm text-gray-600">Next Week, Mon-Wed</p>
                  <p className="text-sm text-gray-600">Pending vehicle assignment</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Vehicles */}
      <AvailableVehicles/>
      
      {/* Notifications */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center text-sm">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
            <p>Your booking for tomorrow has been approved</p>
            <span className="ml-auto text-gray-500">2 hours ago</span>
          </div>
          <div className="flex items-center text-sm">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <p>Reminder: Complete trip report for last week's journey</p>
            <span className="ml-auto text-gray-500">1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
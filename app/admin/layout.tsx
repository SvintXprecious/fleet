'use client'
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Settings, LogOut, Menu, X, Home, Car, Users, 
  Calendar, BarChart, Fuel, Wrench, Bell, User,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { auth, db } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  name: string;
  staffId: string;
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const { toast } = useToast();

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
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Success",
        description: "Logged out successfully",
        variant: "success",
      });
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { href: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { href: '/admin/vehicles', icon: Car, label: 'Vehicles' },
    { href: '/admin/drivers', icon: Users, label: 'Drivers' },
    { href: '/admin/bookings', icon: Calendar, label: 'Bookings' },

  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg transition-all duration-200 ease-in-out ${
        isSidebarOpen ? 'w-64' : 'w-16'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            {isSidebarOpen ? (
              <>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  LUANAR Fleet
                </span>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors mx-auto"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <nav className="mt-8">
          <div className="px-2 space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center ${
                  isSidebarOpen ? 'px-4' : 'px-2 justify-center'
                } py-2 text-gray-700 hover:bg-blue-50 rounded-lg`}
              >
                <item.icon className="h-5 w-5" />
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Bottom section of sidebar */}
        {isSidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3 px-4">
                <User className="h-8 w-8 bg-gray-200 rounded-full p-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{userData?.name || 'Loading...'}</p>
                  <p className="text-xs text-gray-500">{userData?.staffId || 'Loading...'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        {/* Top Navigation */}
        <header className="bg-white shadow fixed top-0 right-0 left-0 lg:left-auto z-20">
          <div className="flex items-center justify-end px-4 py-3">
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-md hover:bg-gray-100 relative">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="flex items-center space-x-4">
                <div className="text-sm hidden sm:block">
                  <p className="font-medium">{userData?.name || 'Loading...'}</p>
                  <p className="text-gray-500">Staff ID: {userData?.staffId || 'Loading...'}</p>
                </div>
                <User className="h-8 w-8 bg-gray-200 rounded-full p-1" />
              </div>
              <button 
                className="p-2 rounded-md hover:bg-gray-100 text-red-600 hover:text-red-700"
                onClick={handleLogout}
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
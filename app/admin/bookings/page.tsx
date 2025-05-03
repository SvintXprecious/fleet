'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { collection, query, getDocs, doc, updateDoc, onSnapshot, where, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Types
interface Vehicle {
  name: string;
  licensePlate: string;
  driverId: string;
}

interface Driver {
  name: string;
  phone: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  status: BookingStatus;
  pickupLocation: string;
  dropoffLocation: string;
  cost: number;
}

// Booking status enum
enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

// Action types
type BookingAction = 'approve' | 'reject';

const AdminBookings = () => {
  // State management with proper types
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<BookingAction | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [drivers, setDrivers] = useState<Record<string, Driver>>({});

  // Fetch vehicle details
  const fetchVehicleDetails = async (vehicleId: string) => {
    if (!vehicleId || vehicles[vehicleId]) return;
    
    try {
      const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
      if (vehicleDoc.exists()) {
        const data = vehicleDoc.data() as Vehicle;
        setVehicles(prev => ({
          ...prev,
          [vehicleId]: data
        }));

        if (data.driverId) {
          await fetchDriverDetails(data.driverId);
        }
      }
    } catch (err) {
      console.error('Error fetching vehicle:', err);
    }
  };

  // Fetch driver details
  const fetchDriverDetails = async (driverId: string) => {
    if (!driverId || drivers[driverId]) return;
    
    try {
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      if (driverDoc.exists()) {
        const data = driverDoc.data() as Driver;
        setDrivers(prev => ({
          ...prev,
          [driverId]: data
        }));
      }
    } catch (err) {
      console.error('Error fetching driver:', err);
    }
  };

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsRef = collection(db, 'bookings');
        const unsubscribe = onSnapshot(bookingsRef, async (snapshot) => {
          const bookingsData = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            await fetchVehicleDetails(data.vehicleId);
            
            return {
              id: doc.id,
              ...data,
              startDate: data.startDate.toDate(),
              endDate: data.endDate.toDate(),
              createdAt: data.createdAt.toDate()
            } as Booking;
          }));
          
          setBookings(bookingsData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings');
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Check for status updates based on dates
  useEffect(() => {
    const updateBookingStatusBasedOnDate = async (booking: Booking) => {
      const now = new Date();
      const startDate = booking.startDate;
      const endDate = booking.endDate;

      if (booking.status === BookingStatus.APPROVED && now >= startDate) {
        const bookingRef = doc(db, 'bookings', booking.id);
        await updateDoc(bookingRef, {
          status: BookingStatus.IN_PROGRESS,
          updatedAt: new Date()
        });
      } else if (booking.status === BookingStatus.IN_PROGRESS && now >= endDate) {
        const bookingRef = doc(db, 'bookings', booking.id);
        await updateDoc(bookingRef, {
          status: BookingStatus.COMPLETED,
          updatedAt: new Date()
        });
      }
    };

    const interval = setInterval(() => {
      bookings.forEach(booking => {
        updateBookingStatusBasedOnDate(booking);
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [bookings]);

  // Stats calculations
  const stats = {
    total: bookings.length,
    active: bookings.filter(b => b.status === BookingStatus.IN_PROGRESS).length,
    approved: bookings.filter(b => b.status === BookingStatus.APPROVED).length,
    pending: bookings.filter(b => b.status === BookingStatus.PENDING).length,
    completed: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
    rejected: bookings.filter(b => b.status === BookingStatus.REJECTED).length
  };

  // Handle booking actions
  const handleBookingAction = async (action: BookingAction) => {
    if (!selectedBooking) return;
    
    try {
      const bookingRef = doc(db, 'bookings', selectedBooking.id);
      const updates = {
        status: action === 'approve' ? BookingStatus.APPROVED : BookingStatus.REJECTED,
        updatedAt: new Date()
      };
      
      await updateDoc(bookingRef, updates);
      setActionDialogOpen(false);
      setSelectedBooking(null);
      setSelectedAction(null);
    } catch (err) {
      console.error('Error updating booking:', err);
      setError('Failed to update booking status');
    }
  };

  // Filtering logic
  const filteredBookings = bookings.filter(booking => {
    const vehicle = vehicles[booking.vehicleId] || {};
    const driver = drivers[vehicle.driverId] || {};
    
    const matchesSearch = 
      (vehicle.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Stats Card Component
  const StatsCard = ({ title, value, subtitle, className }: { title: string; value: number; subtitle: string; className?: string }) => (
    <div className="bg-white rounded-xl shadow p-6">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="mt-4">
        <p className={`text-sm ${className}`}>{subtitle}</p>
      </div>
    </div>
  );

  // Status color helper
  const getStatusColor = (status: BookingStatus): string => {
    const colors = {
      [BookingStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [BookingStatus.APPROVED]: 'bg-blue-100 text-blue-800',
      [BookingStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800',
      [BookingStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [BookingStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [BookingStatus.REJECTED]: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bookings Management</h1>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard title="Total" value={stats.total} subtitle="All bookings" className="text-blue-600" />
        <StatsCard title="Pending" value={stats.pending} subtitle="Awaiting approval" className="text-yellow-600" />
        <StatsCard title="Approved" value={stats.approved} subtitle="Ready to start" className="text-blue-600" />
        <StatsCard title="In Progress" value={stats.active} subtitle="Currently active" className="text-purple-600" />
        <StatsCard title="Completed" value={stats.completed} subtitle="Successfully delivered" className="text-green-600" />
        <StatsCard title="Rejected" value={stats.rejected} subtitle="Booking declined" className="text-red-600" />
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Booking List</h2>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search bookings..."
                className="pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(BookingStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const vehicle = vehicles[booking.vehicleId] || {};
            const driver = drivers[vehicle.driverId] || {};
            
            return (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{vehicle.name || 'Loading...'}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium">Start Time</p>
                        <p>{booking.startDate.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">End Time</p>
                        <p>{booking.endDate.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{booking.pickupLocation}</span>
                      </div>
                      <span>→</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{booking.dropoffLocation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">Driver</p>
                      <p className="text-sm text-gray-600">{driver.name || 'Unassigned'}</p>
                    </div>

                    {booking.status === BookingStatus.PENDING && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBooking(booking);
                              setSelectedAction('approve');
                              setActionDialogOpen(true);
                            }}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBooking(booking);
                              setSelectedAction('reject');
                              setActionDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAction === 'approve' ? 'Approve Booking' : 'Reject Booking'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedAction} this booking?
              This action will update the booking status and notify the user.
              {selectedAction === 'approve' && (
                <div className="mt-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  Approving will make the vehicle and driver unavailable for other bookings during the scheduled time.
                </div>
              )}
              {selectedAction === 'reject' && (
                <div className="mt-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  Rejecting will cancel the booking request and free up the vehicle for other bookings.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setActionDialogOpen(false);
              setSelectedBooking(null);
              setSelectedAction(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBookingAction(selectedAction || '')}
              className={
                selectedAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                'bg-red-600 hover:bg-red-700'
              }
            >
              Yes, {selectedAction} booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBookings;
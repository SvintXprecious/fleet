'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Filter,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock3,
  Car,
  MoreVertical,
  RefreshCcw
} from 'lucide-react';
import { auth, db } from '@/firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Types
interface UserData {
  name: string;
  staffId: string;
}

enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  typeName?: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  startDate: Date;
  endDate: Date;
  purpose: string;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Status configuration with separate color properties
const statusConfig = {
  [BookingStatus.PENDING]: {
    bgColor: 'bg-orange-100',
    bannerColor: 'bg-orange-500',
    textColor: 'text-orange-700',
    icon: Clock,
    label: 'Pending Approval'
  },
  [BookingStatus.APPROVED]: {
    bgColor: 'bg-blue-100',
    bannerColor: 'bg-blue-500',
    textColor: 'text-blue-800',
    icon: CheckCircle2,
    label: 'Approved'
  },
  [BookingStatus.IN_PROGRESS]: {
    bgColor: 'bg-purple-100',
    bannerColor: 'bg-purple-500',
    textColor: 'text-purple-800',
    icon: Car,
    label: 'In Progress'
  },
  [BookingStatus.COMPLETED]: {
    bgColor: 'bg-green-100',
    bannerColor: 'bg-green-500',
    textColor: 'text-green-800',
    icon: CheckCircle2,
    label: 'Completed'
  },
  [BookingStatus.CANCELLED]: {
    bgColor: 'bg-gray-100',
    bannerColor: 'bg-gray-500',
    textColor: 'text-gray-800',
    icon: XCircle,
    label: 'Cancelled'
  },
  [BookingStatus.REJECTED]: {
    bgColor: 'bg-red-100',
    bannerColor: 'bg-red-500',
    textColor: 'text-red-800',
    icon: AlertCircle,
    label: 'Rejected'
  }
};

export default function BookingsPage() {
  const router = useRouter();
  
  // State management
  const [userData, setUserData] = useState<UserData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editedBooking, setEditedBooking] = useState({
    purpose: '',
    pickupLocation: '',
    dropoffLocation: '',
    notes: ''
  });
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicle details
  const fetchVehicleDetails = async (vehicleId: string): Promise<Vehicle> => {
    try {
      console.log('Fetching vehicle details for:', vehicleId);
      const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
      
      if (!vehicleDoc.exists()) {
        console.warn('Vehicle not found:', vehicleId);
        return {
          id: vehicleId,
          name: 'Vehicle Not Found',
          licensePlate: 'N/A'
        };
      }

      const data = vehicleDoc.data();
      return {
        id: vehicleDoc.id,
        name: data.name || 'Unnamed Vehicle',
        licensePlate: data.licensePlate || 'No Plate',
        typeName: data.typeName || 'Unknown Type'
      };
    } catch (error) {
      console.error('Error fetching vehicle:', vehicleId, error);
      return {
        id: vehicleId,
        name: 'Error Loading Vehicle',
        licensePlate: 'Error'
      };
    }
  };

  // Fetch user's bookings
  const fetchBookings = async (userId: string) => {
    try {
      console.log('Fetching bookings for user:', userId);

      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('createdBy', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      console.log('Found bookings:', querySnapshot.size);
      
      const bookingsData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        try {
          const data = doc.data();
          console.log('Processing booking:', doc.id, data);
          
          const vehicle = await fetchVehicleDetails(data.vehicleId);
          
          return {
            id: doc.id,
            vehicleId: data.vehicleId,
            vehicle,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            purpose: data.purpose || '',
            pickupLocation: data.pickupLocation || '',
            dropoffLocation: data.dropoffLocation || '',
            notes: data.notes || '',
            status: data.status || BookingStatus.PENDING,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Booking;
        } catch (err) {
          console.error('Error processing booking document:', doc.id, err);
          return null;
        }
      }));

      // Filter out any null bookings from errors
      const validBookings = bookingsData.filter(booking => booking !== null);
      console.log('Processed bookings:', validBookings.length);
      
      setBookings(validBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit booking
  const handleEditBooking = async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);

    try {
      const bookingRef = doc(db, 'bookings', selectedBooking.id);
      await updateDoc(bookingRef, {
        purpose: editedBooking.purpose,
        pickupLocation: editedBooking.pickupLocation,
        dropoffLocation: editedBooking.dropoffLocation,
        notes: editedBooking.notes,
        updatedAt: new Date()
      });

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error updating booking:', error);
      setError('Failed to update booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setIsSubmitting(true);

    try {
      const bookingRef = doc(db, 'bookings', bookingToCancel.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      });
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize page data
  useEffect(() => {
    const initializePage = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please sign in to view your bookings');
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
          await fetchBookings(user.uid);
        } else {
          setError('User profile not found');
        }
      } catch (error) {
        console.error('Error initializing page:', error);
        setError('Failed to load data');
      }
    };

    initializePage();
  }, []);

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filter bookings based on status
  const filteredBookings = bookings.filter(booking => 
    statusFilter === 'all' || booking.status === statusFilter
  );

  // Booking Card Component
  const BookingCard = ({ booking }: { booking: Booking }) => {
    // Get status configuration with type safety
    const statusCfg = statusConfig[booking.status as keyof typeof statusConfig] || {
      bgColor: 'bg-gray-100',
      bannerColor: 'bg-gray-500',
      textColor: 'text-gray-800',
      icon: Clock,
      label: 'Unknown Status'
    };
    
    const canEdit = booking.status === BookingStatus.PENDING;
    const canCancel = [BookingStatus.PENDING, BookingStatus.APPROVED].includes(booking.status);
    
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Status Banner */}
        <div className={`h-1 ${statusCfg?.bannerColor || 'bg-gray-500'}`} />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${statusCfg?.bgColor || 'bg-gray-100'}`}>
                <Car className={`h-6 w-6 ${statusCfg?.textColor || 'text-gray-800'}`} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {booking.vehicle?.name}
                  </h3>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                    {booking.vehicle?.licensePlate}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${statusCfg?.bgColor || 'bg-gray-100'} ${statusCfg?.textColor || 'text-gray-800'}`}>
                    {React.createElement(statusCfg?.icon || Clock, { className: "h-4 w-4" })}
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>

            {(canEdit || canCancel) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => {
                      setSelectedBooking(booking);
                      setEditedBooking({
                        purpose: booking.purpose,
                        pickupLocation: booking.pickupLocation,
                        dropoffLocation: booking.dropoffLocation,
                        notes: booking.notes || ''
                      });
                      setEditModalOpen(true);
                    }}>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Edit Booking
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => {
                        setBookingToCancel(booking);
                        setCancelDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Booking
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Purpose</h4>
                <p className="text-blue-800">{booking.purpose}</p>
              </div>
              
              <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-purple-900 mb-2">Schedule</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className={`h-4 w-4 ${statusCfg.textColor}`} />
                    <span>Start: {formatDate(booking.startDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className={`h-4 w-4 ${statusCfg.textColor}`} />
                    <span>End: {formatDate(booking.endDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
                <h4 className="text-sm font-medium text-emerald-900 mb-2">Locations</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className={`h-4 w-4 ${statusCfg.textColor}`} />
                    <span>Pickup: {booking.pickupLocation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className={`h-4 w-4 ${statusCfg.textColor}`} />
                    <span>Dropoff: {booking.dropoffLocation}</span>
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-amber-900 mb-2">Notes</h4>
                  <p className="text-amber-800">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Bookings</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="mt-1 text-blue-100">Manage your vehicle bookings and requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(BookingStatus).map(([key, status]) => {
          const count = bookings.filter(b => b.status === status).length;
          const config = statusConfig[status];
          
          return (
            <Card 
              key={key} 
              className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                statusFilter === status ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
                  <config.icon className={`h-4 w-4 ${config.textColor}`} />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Booking History</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(BookingStatus).map(([key, status]) => (
                <SelectItem key={key} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Calendar className="h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all' 
                  ? "You haven't made any bookings yet" 
                  : `No bookings with status "${statusConfig[statusFilter as BookingStatus].label}"`
                }
              </p>
              <Button 
                className="mt-4"
                onClick={() => router.push('/vehicles')}
              >
                Request a Vehicle
              </Button>
            </div>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))
        )}
      </div>

      {/* Edit Booking Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Booking Details</DialogTitle>
            <DialogDescription>
              Update your booking information. Note that dates cannot be modified once a booking is created.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purpose</label>
              <Select
                value={editedBooking.purpose}
                onValueChange={(value) => setEditedBooking({
                  ...editedBooking,
                  purpose: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Official">Official Business</SelectItem>
                  <SelectItem value="Field">Field Work</SelectItem>
                  <SelectItem value="Research">Research Activity</SelectItem>
                  <SelectItem value="Workshop">Workshop/Training</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  className="pl-10"
                  value={editedBooking.pickupLocation}
                  onChange={(e) => setEditedBooking({
                    ...editedBooking,
                    pickupLocation: e.target.value
                  })}
                  placeholder="Enter pickup location"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dropoff Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  className="pl-10"
                  value={editedBooking.dropoffLocation}
                  onChange={(e) => setEditedBooking({
                    ...editedBooking,
                    dropoffLocation: e.target.value
                  })}
                  placeholder="Enter dropoff location"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea
                value={editedBooking.notes}
                onChange={(e) => setEditedBooking({
                  ...editedBooking,
                  notes: e.target.value
                })}
                placeholder="Any special requirements or information"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedBooking(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditBooking}
              disabled={
                !editedBooking.purpose ||
                !editedBooking.pickupLocation ||
                !editedBooking.dropoffLocation ||
                isSubmitting
              }
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
              {bookingToCancel?.status === BookingStatus.APPROVED && (
                <div className="mt-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <strong>Warning:</strong> This booking has already been approved. 
                  Cancelling now may affect resource allocation and scheduling.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelDialogOpen(false);
                setBookingToCancel(null);
              }}
            >
              Keep Booking
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Cancelling...</span>
                </div>
              ) : (
                "Yes, Cancel Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Search, MoreVertical, MapPin } from 'lucide-react';
import { auth, db } from '@/firebase/config';
import { 
  collection, 
  query,
  where,
  getDocs,
  doc,
  getDoc,
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

// Enums and Types
enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

interface UserData {
  name: string;
  staffId: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface VehicleType {
  id: string;
  name: string;
  description?: string;
}

interface VehicleMetadata {
  model?: string;
  year?: number;
  color?: string;
  engineNumber?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
}

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  typeId: string;
  typeName?: string;
  status: 'Available' | 'In Use' | 'Maintenance';
  driverId: string | null;
  lastMaintenance: string;
  fuelLevel: string;
  metadata?: VehicleMetadata;
}

interface BookingRequest {
  startDate: string;
  endDate: string;
  purpose: string;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string;
}

interface BookingData extends Omit<BookingRequest, 'startDate' | 'endDate'> {
  startDate: Timestamp;
  endDate: Timestamp;
  status: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
  vehicleId: string;
}

export default function VehicleBookingPage() {
  const router = useRouter();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingRequest, setBookingRequest] = useState<BookingRequest>({
    startDate: '',
    endDate: '',
    purpose: '',
    pickupLocation: '',
    dropoffLocation: '',
    notes: ''
  });

  // Updated fetchUserData function
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (!data.name || !data.staffId || !data.email || !data.role) {
          throw new Error('Missing required user data fields');
        }
        setUserData({
          name: data.name,
          staffId: data.staffId,
          email: data.email,
          role: data.role,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      } else {
        setError('User profile not found');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user profile');
    }
  };

  // Fetch vehicle types
  const fetchVehicleTypes = async () => {
    try {
      const vehicleTypesRef = collection(db, 'VehicleType');
      const querySnapshot = await getDocs(vehicleTypesRef);
      
      const types = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VehicleType[];
      
      setVehicleTypes(types);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
      setError('Failed to load vehicle types');
    }
  };

  // Fetch available vehicles
  const fetchVehicles = async () => {
    try {
      const vehiclesRef = collection(db, 'vehicles');
      const q = query(
        vehiclesRef, 
        where('status', '==', 'Available')
      );
      const querySnapshot = await getDocs(q);
      
      const vehiclesList = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        let typeName = 'Unknown Type';

        if (data.typeId) {
          const typeDoc = doc(db, 'VehicleType', data.typeId);
          const typeSnapshot = await getDoc(typeDoc);
          if (typeSnapshot.exists()) {
            typeName = typeSnapshot.data().name;
          }
        }

        return {
          id: docSnapshot.id,
          ...data,
          typeName
        } as Vehicle;
      }));
      
      setVehicles(vehiclesList);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Updated handleBookingRequest function
  const handleBookingRequest = async () => {
    if (!selectedVehicle || !userData) return;
    
    setIsSubmitting(true);
  
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please sign in to make a booking");
        return;
      }

      // Check for maximum pending bookings limit
      const userPendingBookingsRef = collection(db, 'bookings');
      const pendingBookingsQuery = query(
        userPendingBookingsRef,
        where('createdBy', '==', user.uid),
        where('status', '==', 'PENDING')
      );
      
      const pendingBookingsSnapshot = await getDocs(pendingBookingsQuery);
      if (pendingBookingsSnapshot.size >= 3) {
        throw new Error('You can only have up to 3 pending booking requests at a time');
      }
  
      // Validate dates
      const startDate = new Date(bookingRequest.startDate);
      const endDate = new Date(bookingRequest.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid booking dates');
      }
  
      if (startDate > endDate) {
        throw new Error('End date cannot be before start date');
      }
  
      if (startDate < new Date()) {
        throw new Error('Cannot book for past dates');
      }
  
      await runTransaction(db, async (transaction) => {
        // Check vehicle availability
        const vehicleRef = doc(db, 'vehicles', selectedVehicle.id);
        const vehicleDoc = await transaction.get(vehicleRef);
        
        if (!vehicleDoc.exists()) {
          throw new Error('Vehicle not found');
        }
  
        const vehicleData = vehicleDoc.data();
        if (vehicleData.status !== 'Available') {
          throw new Error('Vehicle is no longer available');
        }
  
        // Check for overlapping bookings from any user
        const bookingsRef = collection(db, 'bookings');
        const overlappingBookings = await getDocs(query(
          bookingsRef,
          where('vehicleId', '==', selectedVehicle.id),
          where('startDate', '<=', Timestamp.fromDate(endDate))
        ));
  
        const hasOverlap = overlappingBookings.docs.some(doc => {
          const booking = doc.data();
          const bookingEndDate = booking.endDate.toDate();
          const bookingStartDate = booking.startDate.toDate();
          const isOverlapping = bookingEndDate >= startDate && bookingStartDate <= endDate;
          return isOverlapping && ['PENDING', 'APPROVED', 'IN_PROGRESS'].includes(booking.status);
        });
  
        if (hasOverlap) {
          throw new Error('Vehicle is already booked for this time period');
        }
  
        // Create booking with simplified data structure
        const now = Timestamp.now();
        const bookingRef = doc(collection(db, 'bookings'));
        
        const bookingData: BookingData = {
          vehicleId: selectedVehicle.id,
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          purpose: bookingRequest.purpose.trim(),
          pickupLocation: bookingRequest.pickupLocation.trim(),
          dropoffLocation: bookingRequest.dropoffLocation.trim(),
          notes: (bookingRequest.notes || '').trim(),
          status: 'PENDING',
          createdBy: user.uid,
          createdAt: now,
          updatedAt: now,
          updatedBy: user.uid
        };
  
        // Only create the booking, don't update vehicle status yet
        transaction.set(bookingRef, bookingData);
      });
  
      // Reset form and show success message
      setShowBookingModal(false);
      setSelectedVehicle(null);
      setBookingRequest({
        startDate: '',
        endDate: '',
        purpose: '',
        pickupLocation: '',
        dropoffLocation: '',
        notes: ''
      });
      
      alert("Your vehicle booking request has been submitted successfully.");

      // Refresh the vehicles list
      await fetchVehicles();
      
    } catch (error) {
      console.error('Booking Request Failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit booking request');
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
          setError('Please sign in to continue');
          return;
        }

        await fetchUserData(user.uid);
        await fetchVehicleTypes();
        await fetchVehicles();
      } catch (error) {
        console.error('Error initializing page:', error);
        setError('Failed to load necessary data');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchTerm && filterType === 'all') return true;
    
    const matchesSearch = searchTerm ? 
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    
    const matchesType = filterType === 'all' || vehicle.typeName === filterType;
    
    return matchesSearch && matchesType;
  });

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Available Vehicles</h1>
        </div>
        <div className="bg-white rounded-xl shadow">
          <div className="p-6">
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Available Vehicles</h1>
        </div>
        <div className="bg-white rounded-xl shadow">
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Available Vehicles</h1>
      </div>

      {/* Vehicle List Card */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Available Vehicles</h2>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Vehicle</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Registration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Details</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Fuel Level</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Car className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="font-medium">{vehicle.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {vehicle.licensePlate}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {vehicle.typeName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-600">
                        <div className="flex gap-2">
                          {vehicle.metadata?.transmission && (
                            <span>{vehicle.metadata.transmission}</span>
                          )}
                          {vehicle.metadata?.fuelType && (
                            <>
                              <span>•</span>
                              <span>{vehicle.metadata.fuelType}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className={`w-16 h-2 rounded-full ${
                          vehicle.fuelLevel === '100%' ? 'bg-green-500' :
                          vehicle.fuelLevel === '75%' ? 'bg-green-400' :
                          vehicle.fuelLevel === '50%' ? 'bg-yellow-400' :
                          vehicle.fuelLevel === '25%' ? 'bg-orange-400' :
                          'bg-red-500'
                        }`} />
                        <span className="ml-2 text-sm text-gray-600">{vehicle.fuelLevel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedVehicle(vehicle);
                              setShowBookingModal(true);
                            }}>
                              Request Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/vehicles/${vehicle.id}`)}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredVehicles.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                No vehicles found matching your criteria
              </div>
            )}
            
            {filteredVehicles.length === 0 && !searchTerm && (
              <div className="text-center py-8 text-gray-500">
                No vehicles are currently available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Request Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Request Vehicle Booking</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4 py-4 overflow-y-auto pr-2 flex-grow">
              {/* Vehicle Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Selected Vehicle</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Vehicle Name</p>
                    <p className="font-medium">{selectedVehicle.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Registration</p>
                    <p className="font-medium">{selectedVehicle.licensePlate}</p>
                  </div>
                </div>
              </div>

              {/* Booking Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={bookingRequest.startDate}
                    onChange={(e) => setBookingRequest({
                      ...bookingRequest,
                      startDate: e.target.value
                    })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={bookingRequest.endDate}
                    onChange={(e) => setBookingRequest({
                      ...bookingRequest,
                      endDate: e.target.value
                    })}
                    min={bookingRequest.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose of Trip <span className="text-red-500">*</span></label>
                <Select 
                  value={bookingRequest.purpose}
                  onValueChange={(value) => setBookingRequest({
                    ...bookingRequest,
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
                <label className="text-sm font-medium">Pickup Location <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    placeholder="Enter pickup location"
                    value={bookingRequest.pickupLocation}
                    onChange={(e) => setBookingRequest({
                      ...bookingRequest,
                      pickupLocation: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dropoff Location <span className="text-red-500">*</span></label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                    placeholder="Enter dropoff location"
                    value={bookingRequest.dropoffLocation}
                    onChange={(e) => setBookingRequest({
                      ...bookingRequest,
                      dropoffLocation: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Notes</label>
                <textarea
                  className="w-full p-2 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Any special requirements or information"
                  value={bookingRequest.notes}
                  onChange={(e) => setBookingRequest({
                    ...bookingRequest,
                    notes: e.target.value
                  })}
                />
              </div>

              {/* Terms and Guidelines */}
              <div className="bg-blue-50 p-4 rounded-lg text-sm">
                <h4 className="font-medium text-blue-700 mb-2">Booking Guidelines:</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>Bookings must be made at least 24 hours in advance</li>
                  <li>Provide accurate pickup and dropoff locations</li>
                  <li>Changes to booking details require prior approval</li>
                  <li>Cancellations should be made at least 12 hours before scheduled time</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBookingModal(false);
                setSelectedVehicle(null);
                setBookingRequest({
                  startDate: '',
                  endDate: '',
                  purpose: '',
                  pickupLocation: '',
                  dropoffLocation: '',
                  notes: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBookingRequest}
              disabled={!bookingRequest.startDate || 
                       !bookingRequest.endDate || 
                       !bookingRequest.purpose || 
                       !bookingRequest.pickupLocation || 
                       !bookingRequest.dropoffLocation ||
                       isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
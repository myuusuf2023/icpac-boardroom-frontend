import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import emailService from '../services/emailService';
import EmailSettingsPanel from './EmailSettingsPanel';
import './BookingBoard.css';
import '../services/emailNotifications.css';

// Utility function for amenity icons
const getAmenityIcon = (amenity) => {
  const amenityIcons = {
    'Projector': '📽️',
    'Whiteboard': '📝',
    'Video Conferencing': '📹',
    'Audio System': '🎤',
    'TV Screen': '📺',
    'Screen': '🖥️',
    'Computers': '💻',
    'Internet Access': '🌐',
    'Printers': '🖨️'
  };
  return amenityIcons[amenity] || '🔧';
};

const BookingBoard = () => {
  // Get data from context (API integrated)
  const {
    rooms: contextRooms,
    bookings: contextBookings,
    user,
    createBooking: apiCreateBooking
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [users, setUsers] = useState([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showProcurementDashboard, setShowProcurementDashboard] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState('all'); // all, pending, approved, rejected
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('icpac_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedMeetingSpace, setSelectedMeetingSpace] = useState(null);
  const [showMeetingSpaceModal, setShowMeetingSpaceModal] = useState(false);

  // localStorage functions
  const saveBookingsToStorage = (bookingsData) => {
    try {
      localStorage.setItem('icpac_bookings', JSON.stringify(bookingsData));
    } catch (error) {
      console.error('Error saving bookings to localStorage:', error);
    }
  };

  const saveMeetingSpaceSelection = (spaceId) => {
    try {
      if (currentUser) {
        localStorage.setItem(`icpac_selected_space_${currentUser.username}`, spaceId);
      }
    } catch (error) {
      console.error('Error saving meeting space selection:', error);
    }
  };

  const loadMeetingSpaceSelection = () => {
    try {
      if (currentUser) {
        return localStorage.getItem(`icpac_selected_space_${currentUser.username}`);
      }
      return null;
    } catch (error) {
      console.error('Error loading meeting space selection:', error);
      return null;
    }
  };

  const clearMeetingSpaceSelection = () => {
    try {
      if (currentUser) {
        localStorage.removeItem(`icpac_selected_space_${currentUser.username}`);
      }
    } catch (error) {
      console.error('Error clearing meeting space selection:', error);
    }
  };

  const loadBookingsFromStorage = () => {
    try {
      const saved = localStorage.getItem('icpac_bookings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading bookings from localStorage:', error);
    }
    return null;
  };

  const saveUsersToStorage = (usersData) => {
    try {
      localStorage.setItem('icpac_users', JSON.stringify(usersData));
    } catch (error) {
      console.error('Error saving users to localStorage:', error);
    }
  };

  const loadUsersFromStorage = () => {
    try {
      const saved = localStorage.getItem('icpac_users');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
    }
    return null;
  };


  const shouldShowBookingInterface = (date) => {
    const now = new Date();
    const selectedDateObj = new Date(date);

    // Set both dates to start of day for comparison
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const selectedDay = new Date(selectedDateObj);
    selectedDay.setHours(0, 0, 0, 0);

    // Hide interface for past dates completely
    if (selectedDay < today) {
      return false;
    }

    // For future dates, always show
    if (selectedDay > today) {
      return true;
    }

    // For today, show bookings only if it's before 18:00 (6 PM)
    const currentHour = now.getHours();
    return currentHour < 18;
  };

  const handleAdminLogin = (password) => {
    if (password === 'admin123') { // Simple password check
      setIsAdmin(true);
      setShowAdminLogin(false);
      localStorage.setItem('icpac_admin', 'true');
    } else {
      alert('Invalid admin password');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('icpac_admin');
  };

  const handleUserLogin = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setShowLandingPage(false);
      setShowUserLogin(false);
      localStorage.setItem('icpac_current_user', JSON.stringify(user));

      // Delay meeting space check to allow rooms to be initialized
      setTimeout(() => {
        const savedSpace = loadMeetingSpaceSelection();
        if (savedSpace && rooms.length > 0) {
          const space = rooms.find(room => room.id.toString() === savedSpace);
          if (space) {
            setSelectedMeetingSpace(space);
            setSelectedRoomId(savedSpace);
          } else {
            // If saved space no longer exists, show modal
            setShowMeetingSpaceModal(true);
          }
        } else {
          // Show meeting space selection modal for new/returning users
          setShowMeetingSpaceModal(true);
        }
      }, 100);

      // Set admin status based on user role
      if (user.role === 'super_admin' || user.role === 'room_admin') {
        setIsAdmin(true);
        localStorage.setItem('icpac_admin', 'true');
      }
    } else {
      alert('Invalid email or password');
    }
  };

  const handleUserLogout = () => {
    clearMeetingSpaceSelection();
    setCurrentUser(null);
    setSelectedMeetingSpace(null);
    setSelectedRoomId('');
    setIsAdmin(false);
    setIsAuthenticated(false);
    setShowLandingPage(true);
    setShowMeetingSpaceModal(false);
    localStorage.removeItem('icpac_current_user');
    localStorage.removeItem('icpac_admin');
  };

  const handleMeetingSpaceSelection = (roomId) => {
    const selectedRoom = rooms.find(room => room.id.toString() === roomId.toString());
    if (selectedRoom) {
      setSelectedMeetingSpace(selectedRoom);
      setSelectedRoomId(roomId.toString());
      saveMeetingSpaceSelection(roomId);
      setShowMeetingSpaceModal(false);
    }
  };

  const handleUserSignup = (userData) => {
    // Check if email already exists
    const emailExists = users.some(user => user.email && userData.email && user.email.toLowerCase() === userData.email.toLowerCase());
    if (emailExists) {
      alert('Error: A user with this email address already exists. Please use a different email.');
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'user',
      managedRooms: [],
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);

    // Auto-login the new user
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    setShowLandingPage(false);
    setShowSignup(false);
    localStorage.setItem('icpac_current_user', JSON.stringify(newUser));

    alert('Account created successfully! You are now logged in.');
  };

  const sendProcurementNotification = (booking) => {
    if (!booking.procurementOrders || booking.procurementOrders.length === 0) {
      return;
    }

    const notificationData = {
      id: Date.now(),
      bookingId: booking.id,
      bookingTitle: booking.title,
      organizer: booking.organizer,
      date: booking.date || booking.startDate,
      time: booking.time || booking.startTime,
      attendeeCount: booking.attendeeCount,
      procurementOrders: booking.procurementOrders,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage (in a real app, this would be sent to a server)
    const existingNotifications = JSON.parse(localStorage.getItem('icpac_procurement_notifications') || '[]');
    existingNotifications.push(notificationData);
    localStorage.setItem('icpac_procurement_notifications', JSON.stringify(existingNotifications));

    // Show a simple alert (in a real app, this would be proper notification)
    const orderSummary = booking.procurementOrders.map(order =>
      `${order.quantity} ${order.itemName}(s)`
    ).join(', ');

    alert(`Procurement notification sent!\n\nBooking: ${booking.title}\nOrganizer: ${booking.organizer}\nAttendees: ${booking.attendeeCount}\nOrders: ${orderSummary}\n\nProcurement officer has been notified.`);
  };


  const canManageRoom = (roomId) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'room_admin') {
      return currentUser.managedRooms && currentUser.managedRooms.includes(roomId);
    }
    return false;
  };

  const getVisibleRooms = () => {
    // If user has selected a specific meeting space, show only that space
    if (selectedMeetingSpace && currentUser) {
      return [selectedMeetingSpace];
    }

    // If not logged in, show all rooms for general viewing
    if (!currentUser) return rooms;

    // Super admin can see all rooms (but still filtered by meeting space selection)
    if (currentUser.role === 'super_admin') return rooms;

    // Room admin can only see their assigned rooms
    if (currentUser.role === 'room_admin') {
      return rooms.filter(room =>
        currentUser.managedRooms && currentUser.managedRooms.includes(room.id)
      );
    }

    // Regular users can see all rooms for booking (but with limited management)
    return rooms;
  };

  const getFilteredRooms = () => {
    try {
      const visibleRooms = getVisibleRooms();
      console.log('getFilteredRooms - selectedRoomId:', selectedRoomId);
      console.log('getFilteredRooms - visibleRooms:', visibleRooms);

      // If no room is selected or "all" is selected, show all rooms
      if (!selectedRoomId || selectedRoomId === '' || selectedRoomId === 'all') {
        return visibleRooms;
      }

      // Filter to show only the selected room
      const filteredRooms = visibleRooms.filter(room => {
        return room && room.id && room.id.toString() === selectedRoomId.toString();
      });

      console.log('Filtered rooms:', filteredRooms);
      return filteredRooms;
    } catch (error) {
      console.error('Error in getFilteredRooms:', error);
      return [];
    }
  };

  const getGroupedRooms = () => {
    const visibleRooms = getVisibleRooms();
    return visibleRooms.reduce((groups, room) => {
      const category = room.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(room);
      return groups;
    }, {});
  };

  const getCategoryInfo = (category) => {
    const categoryConfig = {
      conference: {
        label: 'Meeting Spaces',
        color: '#10b981',
        icon: '🏛️'
      },
      computer_lab: {
        label: 'Computer Labs',
        color: '#3b82f6',
        icon: '💻'
      },
      special: {
        label: 'Special Rooms',
        color: '#f59e0b',
        icon: '⚡'
      },
      other: {
        label: 'Other Rooms',
        color: '#6b7280',
        icon: '🏢'
      }
    };
    return categoryConfig[category] || categoryConfig.other;
  };


  const getCapacityLevel = (capacity) => {
    if (capacity <= 10) return 'small';
    if (capacity <= 25) return 'medium';
    if (capacity <= 50) return 'large';
    return 'extra-large';
  };

  const getCapacityColor = (capacity) => {
    if (capacity <= 10) return '#f59e0b';
    if (capacity <= 25) return '#10b981';
    if (capacity <= 50) return '#3b82f6';
    return '#8b5cf6';
  };

  const canManageBooking = (booking) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'room_admin') {
      return currentUser.managedRooms && currentUser.managedRooms.includes(booking.roomId);
    }
    // Users can manage their own bookings regardless of approval status
    return booking.organizer === currentUser.email;
  };

  const cancelBooking = async (bookingId) => {
    const bookingToCancel = bookings.find(booking => booking.id === bookingId);
    const roomToCancel = rooms.find(room => room.id === bookingToCancel?.roomId);

    if (window.confirm('Are you sure you want to cancel this booking?')) {
      const updatedBookings = bookings.filter(booking => booking.id !== bookingId);
      setBookings(updatedBookings);
      saveBookingsToStorage(updatedBookings);

      // 📧 Send cancellation notification
      try {
        if (currentUser && bookingToCancel && roomToCancel) {
          const cancellationReason = prompt('Reason for cancellation (optional):') || 'No reason provided';
          await emailService.sendCancellationNotification(
            bookingToCancel,
            roomToCancel,
            currentUser,
            cancellationReason
          );
        }
      } catch (error) {
        console.error('Error sending cancellation notification:', error);
      }
    }
  };

  const editBooking = (booking) => {
    setEditingBooking(booking);
    setShowEditForm(true);
  };

  const updateBooking = (bookingData) => {
    const updatedBooking = { ...editingBooking, ...bookingData };
    const updatedBookings = bookings.map(booking =>
      booking.id === editingBooking.id
        ? updatedBooking
        : booking
    );
    setBookings(updatedBookings);
    saveBookingsToStorage(updatedBookings);

    // Send procurement notification if there are orders
    sendProcurementNotification(updatedBooking);

    setShowEditForm(false);
    setEditingBooking(null);
  };

  // Approval functions
  const canApproveBooking = (booking) => {
    if (!currentUser) return false;

    // Super admin can approve any booking
    if (currentUser.role === 'super_admin') return true;

    // Room admin can approve bookings for rooms they manage
    if (currentUser.role === 'room_admin') {
      return currentUser.managedRooms && currentUser.managedRooms.includes(booking.roomId);
    }

    return false;
  };

  const approveBooking = async (bookingId) => {
    console.log('approveBooking called with ID:', bookingId, 'Current user:', currentUser);
    if (window.confirm('Are you sure you want to approve this booking?')) {
      const bookingToApprove = bookings.find(booking => booking.id === bookingId);
      const selectedRoom = rooms.find(room => room.id === bookingToApprove.roomId);
      const bookingUser = users.find(user => user.email === bookingToApprove.userEmail || user.name === bookingToApprove.organizer);

      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId
          ? {
            ...booking,
            approvalStatus: 'approved',
            approvedBy: currentUser.name,
            approvedAt: new Date().toISOString()
          }
          : booking
      );
      setBookings(updatedBookings);
      saveBookingsToStorage(updatedBookings);

      // 📧 Send approval notification to the user
      if (bookingUser && selectedRoom) {
        try {
          await emailService.sendApprovalNotification(bookingToApprove, selectedRoom, bookingUser, currentUser.name);
        } catch (error) {
          console.error('Error sending approval notification:', error);
        }
      }

      console.log('Booking approved successfully');
    }
  };

  const rejectBooking = async (bookingId) => {
    console.log('rejectBooking called with ID:', bookingId, 'Current user:', currentUser);
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason !== null) { // User didn't cancel the prompt
      const bookingToReject = bookings.find(booking => booking.id === bookingId);
      const selectedRoom = rooms.find(room => room.id === bookingToReject.roomId);
      const bookingUser = users.find(user => user.email === bookingToReject.userEmail || user.name === bookingToReject.organizer);

      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId
          ? {
            ...booking,
            approvalStatus: 'rejected',
            approvedBy: currentUser.name,
            approvedAt: new Date().toISOString(),
            rejectionReason: reason
          }
          : booking
      );
      setBookings(updatedBookings);
      saveBookingsToStorage(updatedBookings);

      // 📧 Send rejection notification to the user
      if (bookingUser && selectedRoom) {
        try {
          await emailService.sendRejectionNotification(bookingToReject, selectedRoom, bookingUser, currentUser.name, reason);
        } catch (error) {
          console.error('Error sending rejection notification:', error);
        }
      }

      console.log('Booking rejected successfully');
    }
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('icpac_dark_mode', JSON.stringify(newMode));
    document.body.classList.toggle('dark-mode', newMode);
  };

  // Check for admin status and current user on load
  useEffect(() => {
    const adminStatus = localStorage.getItem('icpac_admin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }

    const currentUserData = localStorage.getItem('icpac_current_user');
    if (currentUserData) {
      const userData = JSON.parse(currentUserData);
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setShowLandingPage(false);

      // Ensure admin status is set correctly based on user role
      if (userData.role === 'super_admin' || userData.role === 'room_admin') {
        setIsAdmin(true);
        localStorage.setItem('icpac_admin', 'true');
      }
    }

    // Load users or create default super admin
    const savedUsers = loadUsersFromStorage();
    if (savedUsers && savedUsers.length > 0) {
      setUsers(savedUsers);
    } else {
      // Create default super admin and procurement officer
      const defaultUsers = [
        {
          id: 1,
          name: 'Super Admin',
          email: 'admin@icpac.net',
          password: 'admin123',
          role: 'super_admin',
          managedRooms: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Procurement Officer',
          email: 'procurement@icpac.net',
          password: 'procurement123',
          role: 'procurement_officer',
          managedRooms: [],
          createdAt: new Date().toISOString()
        }
      ];
      setUsers(defaultUsers);
      saveUsersToStorage(defaultUsers);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    // Set up rooms with categories
    setRooms([
      { id: 1, name: 'Conference Room - Ground Floor', capacity: 200, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'] },
      { id: 2, name: 'Boardroom - First Floor', capacity: 25, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing'] },
      { id: 3, name: 'SmallBoardroom - 1st Floor', capacity: 12, category: 'conference', amenities: ['TV Screen', 'Whiteboard'] },
      { id: 4, name: 'Situation Room', capacity: 8, category: 'special', amenities: ['Screen'] },
      { id: 5, name: 'Computer Lab 1 - Underground', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard',] },
      { id: 6, name: 'Computer Lab 2 - First Floor', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard',] },
    ]);

    // Load bookings from localStorage or use default
    const savedBookings = loadBookingsFromStorage();
    if (savedBookings && savedBookings.length > 0) {
      setBookings(savedBookings);
    } else {
      // Default bookings if none saved
      const defaultBookings = [
        {
          id: 1,
          roomId: 1,
          date: '2025-01-08',
          time: '09:00',
          duration: 'Multi-day',
          startDate: '2025-01-08',
          endDate: '2025-01-10',
          title: 'ICPAC Annual Conference',
          organizer: 'Dr. Abdi fitar',
          attendeeCount: 150,
          procurementOrders: [
            { itemName: 'Coffee & Tea', quantity: 50, notes: 'For morning breaks' },
            { itemName: 'Water Bottles', quantity: 200, notes: 'Throughout the event' },
            { itemName: 'Lunch Catering', quantity: 150, notes: 'All three days' }
          ]
        },
        {
          id: 2,
          roomId: 2,
          date: '2025-01-08',
          time: '14:00',
          duration: 'Hourly',
          title: 'Climate Advisory Meeting',
          organizer: 'ICPAC Team',
          attendeeCount: 12,
          procurementOrders: [
            { itemName: 'Coffee & Tea', quantity: 12, notes: 'Afternoon session' },
            { itemName: 'Meeting Stationery', quantity: 12, notes: 'Notebooks and pens' }
          ]
        },
        {
          id: 3,
          roomId: 4,
          date: '2025-01-07',
          time: '10:00',
          duration: 'Full day',
          title: 'Emergency Response Planning',
          organizer: 'Disaster Risk Management',
          attendeeCount: 8,
          procurementOrders: [
            { itemName: 'Lunch Catering', quantity: 8, notes: 'Working lunch' },
            { itemName: 'Coffee & Tea', quantity: 8, notes: 'All day refreshments' }
          ]
        },
        {
          id: 4,
          roomId: 5,
          date: new Date().toISOString().split('T')[0], // Today's date
          time: '08:00',
          duration: 'Hourly',
          title: 'GIS Training Workshop',
          organizer: 'IT Department',
          attendeeCount: 15,
          procurementOrders: [
            { itemName: 'Coffee & Tea', quantity: 15, notes: 'Morning session' },
            { itemName: 'Training Materials', quantity: 15, notes: 'Printed handouts' }
          ]
        },
        {
          id: 5,
          roomId: 6,
          date: '2025-01-08',
          time: '15:00',
          duration: 'Full day',
          title: 'Climate Data Analysis Training',
          organizer: 'Research Team',
          attendeeCount: 18,
          procurementOrders: [
            { itemName: 'Lunch Catering', quantity: 18, notes: 'Working lunch included' },
            { itemName: 'Coffee & Tea', quantity: 18, notes: 'All day refreshments' }
          ]
        },
      ];
      setBookings(defaultBookings);
      saveBookingsToStorage(defaultBookings);
    }
  }, []);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Apply dark mode on initial load
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);


  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getTimeSlotIndex = (time) => {
    return timeSlots.findIndex(slot => slot === time);
  };

  const isWeekend = (date) => {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek === 0; // Only Sunday = 0 is blocked, Saturday (6) is now allowed
  };

  const isTimeSlotInPast = (date, time) => {
    const now = new Date();
    const slotDate = new Date(date);

    // If the date is in the future, it's not in the past
    if (slotDate.toDateString() !== now.toDateString()) {
      return slotDate < now;
    }

    // If it's today, check if the time has passed
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(slotDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime < now;
  };


  const isSlotBooked = (roomId, time) => {
    const currentDate = formatDate(selectedDate);

    return bookings.some(booking => {
      if (booking.roomId !== roomId) {
        return false;
      }

      // Apply approval filter (only for admins who can see all statuses)
      if (approvalFilter !== 'all' && (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'room_admin'))) {
        const bookingStatus = booking.approvalStatus || 'pending';
        if (bookingStatus !== approvalFilter) {
          return false;
        }
      }

      // Check if current date falls within booking date range
      const bookingStartDate = new Date(booking.startDate || booking.date);
      const bookingEndDate = new Date(booking.endDate || booking.date);
      const currentDateObj = new Date(currentDate);

      // If current date is not within the booking date range, no conflict
      if (currentDateObj < bookingStartDate || currentDateObj > bookingEndDate) {
        return false;
      }

      // For hourly bookings, check time slots
      if (booking.bookingType === 'hourly') {
        const bookingStartIndex = getTimeSlotIndex(booking.time);
        const bookingEndIndex = bookingStartIndex + booking.duration;
        const currentTimeIndex = getTimeSlotIndex(time);

        return currentTimeIndex >= bookingStartIndex && currentTimeIndex < bookingEndIndex;
      }

      // For full-day, multi-day, or weekly bookings, all time slots are booked
      return true;
    });
  };

  const getBookingDetails = (roomId, time) => {
    const currentDate = formatDate(selectedDate);

    return bookings.find(booking => {
      if (booking.roomId !== roomId) {
        return false;
      }

      // Apply approval filter (only for admins who can see all statuses)
      if (approvalFilter !== 'all' && (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'room_admin'))) {
        const bookingStatus = booking.approvalStatus || 'pending';
        if (bookingStatus !== approvalFilter) {
          return false;
        }
      }

      // Check if current date falls within booking date range
      const bookingStartDate = new Date(booking.startDate || booking.date);
      const bookingEndDate = new Date(booking.endDate || booking.date);
      const currentDateObj = new Date(currentDate);

      // If current date is not within the booking date range, no match
      if (currentDateObj < bookingStartDate || currentDateObj > bookingEndDate) {
        return false;
      }

      // For hourly bookings, check time slots
      if (booking.bookingType === 'hourly') {
        const bookingStartIndex = getTimeSlotIndex(booking.time);
        const bookingEndIndex = bookingStartIndex + booking.duration;
        const currentTimeIndex = getTimeSlotIndex(time);

        return currentTimeIndex >= bookingStartIndex && currentTimeIndex < bookingEndIndex;
      }

      // For full-day, multi-day, or weekly bookings, all time slots match
      return true;
    });
  };

  const canBookDuration = (roomId, startTime, duration) => {
    const startIndex = getTimeSlotIndex(startTime);
    const endIndex = startIndex + duration;

    // Check if booking would exceed available time slots
    if (endIndex > timeSlots.length) {
      return false;
    }

    // Check if any slot in the duration is already booked
    for (let i = startIndex; i < endIndex; i++) {
      if (isSlotBooked(roomId, timeSlots[i])) {
        return false;
      }
    }

    return true;
  };

  const canBookDateRange = (roomId, startDate, endDate, bookingType) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check each date in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];

      // Check if there are any existing bookings on this date for this room
      const hasConflict = bookings.some(booking => {
        if (booking.roomId !== roomId) return false;

        // Check if booking overlaps with the date range
        const bookingStart = new Date(booking.startDate || booking.date);
        const bookingEnd = new Date(booking.endDate || booking.date);

        // Check for date overlap
        return date >= bookingStart && date <= bookingEnd;
      });

      if (hasConflict) {
        return false;
      }
    }

    return true;
  };

  const handleBooking = (room, time) => {
    // Check if the selected date is Sunday
    if (isWeekend(selectedDate)) {
      alert('Cannot book on Sunday. Please select Monday through Saturday.');
      return;
    }

    // Check if the time slot is in the past
    if (isTimeSlotInPast(selectedDate, time)) {
      alert('Cannot book past time slots. Please select a future time.');
      return;
    }

    setSelectedRoom(room);
    setSelectedTime(time);
    setShowBookingForm(true);
  };

  const confirmBooking = async (bookingData) => {
    // Enhanced validation for different booking types
    if (bookingData.bookingType === 'hourly') {
      if (!canBookDuration(selectedRoom.id, selectedTime, bookingData.duration)) {
        alert('Cannot book for the selected duration. Some time slots are already booked or exceed available hours.');
        return;
      }
    } else {
      // Check for multi-day booking conflicts
      if (!canBookDateRange(selectedRoom.id, bookingData.startDate, bookingData.endDate, bookingData.bookingType)) {
        alert('Cannot book for the selected date range. Some dates are already booked.');
        return;
      }
    }

    const newBooking = {
      id: Date.now(), // Use timestamp for unique ID
      roomId: selectedRoom.id,
      // Keep legacy fields for backward compatibility
      date: bookingData.startDate,
      time: bookingData.startTime || selectedTime,
      duration: bookingData.duration || 1,
      // New fields for extended booking
      bookingType: bookingData.bookingType || 'hourly',
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      title: bookingData.title,
      organizer: bookingData.organizer,
      description: bookingData.description || '',
      attendeeCount: bookingData.attendeeCount || 1,
      procurementOrders: bookingData.procurementOrders || [],
      // Add approval status fields
      approvalStatus: 'pending', // pending, approved, rejected
      approvedBy: null,
      approvedAt: null
    };

    const updatedBookings = [...bookings, newBooking];
    setBookings(updatedBookings);
    saveBookingsToStorage(updatedBookings); // Save to localStorage

    // Send procurement notification if there are orders
    sendProcurementNotification(newBooking);

    // 📧 EMAIL NOTIFICATIONS - Send booking confirmation and admin notifications
    try {
      if (currentUser) {
        // 1. Send booking confirmation to the user
        await emailService.sendBookingConfirmation(newBooking, selectedRoom, currentUser);

        // 2. Send admin notifications for new booking
        const roomAdmins = emailService.getRoomAdmins(selectedRoom.id, users);
        if (roomAdmins.length > 0) {
          await emailService.sendAdminNotification(newBooking, selectedRoom, currentUser, roomAdmins);
        }

        // 3. Schedule 30-minute meeting reminder
        const reminderResult = emailService.scheduleReminder(newBooking, selectedRoom, currentUser);
        if (reminderResult.success) {
          console.log(`⏰ Meeting reminder scheduled for: ${reminderResult.reminderTime}`);
        }
      }
    } catch (error) {
      console.error('Email notification error:', error);
      // Don't block booking if email fails
    }

    setShowBookingForm(false);
    setSelectedRoom(null);
    setSelectedTime('');
  };

  // Show landing page if not authenticated
  if (showLandingPage || !isAuthenticated) {
    return (
      <div className="booking-container">
        <LandingPage
          onLogin={() => setShowUserLogin(true)}
          onSignup={() => setShowSignup(true)}
          onViewDashboard={() => window.location.href = '/dashboard'}
        />

        {/* Login Modal */}
        {showUserLogin && (
          <UserLoginModal
            onLogin={handleUserLogin}
            onCancel={() => setShowUserLogin(false)}
            onSwitchToSignup={() => {
              setShowUserLogin(false);
              setShowSignup(true);
            }}
            onForgotPassword={() => {
              setShowUserLogin(false);
              setShowForgotPassword(true);
            }}
          />
        )}

        {/* Signup Modal */}
        {showSignup && (
          <UserSignupModal
            onSignup={handleUserSignup}
            onCancel={() => setShowSignup(false)}
            onSwitchToLogin={() => {
              setShowSignup(false);
              setShowUserLogin(true);
            }}
          />
        )}

        {/* Meeting Space Selection Modal */}
        {showMeetingSpaceModal && (
          <MeetingSpaceSelectionModal
            rooms={rooms}
            onSelect={handleMeetingSpaceSelection}
            currentUser={currentUser}
          />
        )}

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <ForgotPasswordModal
            onCancel={() => setShowForgotPassword(false)}
            onBackToLogin={() => {
              setShowForgotPassword(false);
              setShowUserLogin(true);
            }}
          />
        )}

      </div>
    );
  }

  return (
    <div className="booking-container">
      <div className="booking-wrapper">
        {/* Header */}
        <div className="booking-header">
          <div className="header-title-row">
            <div className="logo-section">
              <img src="/ICPAC_Website_Header_Logo.svg" alt="ICPAC Logo" className="icpac-logo" />
            </div>
            <div className="title-section">
              <h1 className="booking-title">ICPAC INTERNAL BOOKING SYSTEM</h1>
              <p className="booking-subtitle">Reserve your meeting space with ease - Book conference rooms, manage schedules, and collaborate seamlessly across ICPAC facilities</p>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="date-section">
          <div className="date-header">
            <h2 className="date-title">Select Date</h2>

            <div className="admin-controls">
              {currentUser ? (
                <div className="user-panel">
                  <span className="user-info">
                    {currentUser.name}
                    {currentUser.role !== 'super_admin' && (
                      <span className={`role-badge role-${currentUser.role}`}>
                        {currentUser.role === 'room_admin' ? 'Room Admin' :
                          currentUser.role === 'procurement_officer' ? 'Procurement Officer' : 'User'}
                      </span>
                    )}
                  </span>
                  {currentUser.role === 'super_admin' && (
                    <>
                      <button
                        onClick={() => setShowUserManagement(true)}
                        className="user-management-btn"
                        title="Manage Users"
                      >
                        Manage Users
                      </button>
                    </>
                  )}
                  {currentUser.role === 'procurement_officer' && (
                    <button
                      onClick={() => setShowProcurementDashboard(true)}
                      className="procurement-dashboard-btn"
                      title="View Procurement Dashboard"
                    >
                      Procurement Dashboard
                    </button>
                  )}
                  <button
                    onClick={() => setShowEmailSettings(true)}
                    className="email-settings-btn"
                    title="Email Notification Settings"
                  >
                    📧 Email Settings
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    className="dark-mode-btn"
                    title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
                  >
                    {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'} Mode
                  </button>
                  <button
                    onClick={handleUserLogout}
                    className="admin-logout-btn"
                    title="Logout"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="date-picker-section">
            <label className="date-picker-label">Choose any date:</label>
            <input
              type="date"
              value={formatDate(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="date-picker-input"
            />

            {/* Meeting Space Dropdown - positioned below and to the right */}
            <div style={{ marginTop: '12px', marginLeft: '40px' }}>
              <div className="room-selector-container" style={{
                background: 'linear-gradient(135deg, #f0fdf4, #e6fffa)',
                padding: '8px 12px',
                border: '1px solid #10b981',
                borderRadius: '25px',
                display: 'inline-block',
                minWidth: '280px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #f0fdf4, #e6fffa)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}>
                <select
                  id="room-selector"
                  className="room-selector"
                  value={selectedRoomId}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                    if (e.target.value) {
                      const selectedSpace = rooms.find(room => room.id.toString() === e.target.value);
                      setSelectedMeetingSpace(selectedSpace);
                      saveMeetingSpaceSelection(e.target.value);
                    } else {
                      setSelectedMeetingSpace(null);
                      clearMeetingSpaceSelection();
                    }
                  }}
                  style={{
                    fontSize: '14px',
                    padding: '6px 12px',
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    color: '#034930',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">🏢 Select Meeting Space</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Cap: {room.capacity})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Approval Filter for Admins */}
          {currentUser && canApproveBooking({ roomId: 1 }) && (
            <div className="approval-filter-section">
              <label className="approval-filter-label">Filter by approval status:</label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="approval-filter-select"
              >
                <option value="all">All Bookings</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}

          {/* Quick Date Buttons */}
          <div className="date-buttons">
            <p className="quick-dates-label">Quick select (this week):</p>
            {[...Array(7)].map((_, index) => {
              const date = new Date();
              date.setDate(date.getDate() + index);
              const isSelected = formatDate(date) === formatDate(selectedDate);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`date-button ${isSelected ? 'selected' : ''}`}
                >
                  <span className="day">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="date">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Booking Grid */}
        <div className="booking-grid">
          <div className="grid-header">
            <h2>
              Room Availability - {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
          </div>

          {shouldShowBookingInterface(selectedDate) ? (
            <div className="grid-table-container">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>
                      <span className="table-header-room">
                        <span className="header-icon">🏢</span>
                        <span className="header-text" style={{ color: 'black', fontWeight: 'bold', fontSize: '16px' }}>Meeting Rooms</span>
                      </span>
                    </th>
                    {timeSlots.map(time => (
                      <th key={time}>{time}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredRooms().length === 0 ? (
                    <tr>
                      <td colSpan={timeSlots.length + 1} className="no-rooms-message">
                        <div className="no-rooms-content">
                          <h3>No Rooms Available</h3>
                          <p>
                            {currentUser ?
                              `You don't have access to any rooms. Please contact your administrator.` :
                              'Please log in to view available rooms.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredRooms().map(room => {
                      const categoryInfo = getCategoryInfo(room.category);
                      return (
                        <tr key={room.id} className="room-row">
                          <td>
                            <div className="room-info" style={{ borderLeftColor: categoryInfo.color }}>
                              <div className="room-header">
                                <h3 className="room-name">
                                  <span className="room-category-icon">{categoryInfo.icon}</span>
                                  {room.name}
                                </h3>
                                <div className="capacity-indicator">
                                  <div className="capacity-visual">
                                    <span className="capacity-icon">👥</span>
                                    <span className="capacity-number">{room.capacity}</span>
                                  </div>
                                  <div className="capacity-bar">
                                    <div
                                      className={`capacity-fill ${getCapacityLevel(room.capacity)}`}
                                      style={{
                                        width: `${Math.min((room.capacity / 200) * 100, 100)}%`,
                                        backgroundColor: getCapacityColor(room.capacity)
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                              <div className="room-amenities">
                                {room.amenities.map(amenity => (
                                  <span key={amenity} className="amenity-tag" title={amenity}>
                                    <span className="amenity-icon">{getAmenityIcon(amenity)}</span>
                                    <span className="amenity-text">{amenity}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          {timeSlots.map(time => {
                            const isBooked = isSlotBooked(room.id, time);
                            const booking = getBookingDetails(room.id, time);
                            const isPast = isTimeSlotInPast(selectedDate, time);
                            const isWeekendDay = isWeekend(selectedDate);

                            return (
                              <td key={time}>
                                {isWeekendDay ? (
                                  <div className="time-slot weekend-blocked">
                                    <div className="slot-title">Sunday</div>
                                    <div className="slot-subtitle">Not Available</div>
                                  </div>
                                ) : isPast ? (
                                  // Don't show anything for past time slots - hide completely
                                  null
                                ) : isBooked ? (
                                  <div className={`modern-time-slot booked ${booking.bookingType || 'hourly'} ${booking.approvalStatus || 'pending'}`}>
                                    <div className="slot-icon">
                                      {booking.approvalStatus === 'approved' ? '✅' :
                                        booking.approvalStatus === 'rejected' ? '❌' : '⏳'}
                                    </div>
                                    <div className="slot-content">
                                      <div className="slot-title">{booking.title}</div>
                                      <div className="slot-subtitle">{booking.organizer}</div>
                                      {booking.bookingType !== 'hourly' && (
                                        <div className="slot-duration">
                                          {booking.bookingType === 'full-day' ? 'Full Day' :
                                            booking.bookingType === 'weekly' ? 'Weekly' :
                                              booking.bookingType === 'multi-day' ?
                                                `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}` :
                                                'Extended'}
                                        </div>
                                      )}
                                    </div>
                                    <div className={`slot-status booked-status ${booking.approvalStatus || 'pending'}`}>
                                      <span className="status-text">
                                        {booking.approvalStatus === 'approved' && 'Approved'}
                                        {booking.approvalStatus === 'rejected' && 'Rejected'}
                                        {(!booking.approvalStatus || booking.approvalStatus === 'pending') && 'Pending'}
                                      </span>
                                      <div className={`status-pulse ${booking.approvalStatus || 'pending'}`}></div>
                                    </div>
                                    {canManageBooking(booking) && (
                                      <div className="admin-booking-controls">
                                        <button
                                          onClick={() => editBooking(booking)}
                                          className="edit-booking-btn"
                                          title="Edit this booking"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => cancelBooking(booking.id)}
                                          className="cancel-booking-btn"
                                          title="Cancel this booking"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                    {/* Approval Controls for Room Admins and Super Admins */}
                                    {canApproveBooking(booking) && (!booking.approvalStatus || booking.approvalStatus === 'pending') && (
                                      <div className="approval-controls">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            approveBooking(booking.id);
                                          }}
                                          className="approve-booking-btn"
                                          title="Approve this booking"
                                        >
                                          ✅ Approve
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            rejectBooking(booking.id);
                                          }}
                                          className="reject-booking-btn"
                                          title="Reject this booking"
                                        >
                                          ❌ Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleBooking(room, time)}
                                    className="modern-time-slot available"
                                  >
                                    <div className="slot-icon">⏰</div>
                                    <div className="slot-content">
                                      <div className="slot-title">Available</div>
                                      <div className="slot-subtitle">Click to book</div>
                                    </div>
                                    <div className="slot-status available-status">
                                      <span className="status-indicator">✅</span>
                                      <div className="availability-pulse"></div>
                                    </div>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="day-closed-message">
              <div className="day-closed-content">
                {(() => {
                  const now = new Date();
                  const selectedDateObj = new Date(selectedDate);
                  const today = new Date(now);
                  today.setHours(0, 0, 0, 0);
                  const selectedDay = new Date(selectedDateObj);
                  selectedDay.setHours(0, 0, 0, 0);

                  if (selectedDay < today) {
                    // Past date
                    return (
                      <>
                        <h3>Day Complete</h3>
                        <p>This date has passed. Bookings are no longer available.</p>
                        <p>Please select today or a future date to make new bookings.</p>
                      </>
                    );
                  } else {
                    // Today after hours
                    return (
                      <>
                        <h3>Day Complete</h3>
                        <p>Booking for today is no longer available (after 6:00 PM).</p>
                        <p>Please select a future date to make new bookings.</p>
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Booking Form Modal */}
        {showBookingForm && (
          <BookingForm
            room={selectedRoom}
            time={selectedTime}
            date={selectedDate}
            currentUser={currentUser}
            onConfirm={confirmBooking}
            onCancel={() => setShowBookingForm(false)}
          />
        )}

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <AdminLoginModal
            onLogin={handleAdminLogin}
            onCancel={() => setShowAdminLogin(false)}
          />
        )}

        {/* Edit Booking Modal */}
        {showEditForm && editingBooking && (
          <EditBookingForm
            booking={editingBooking}
            rooms={getFilteredRooms()}
            currentUser={currentUser}
            onUpdate={updateBooking}
            onCancel={() => {
              setShowEditForm(false);
              setEditingBooking(null);
            }}
          />
        )}



        {/* User Management Modal */}
        {showUserManagement && (
          <UserManagementModal
            users={users}
            rooms={rooms}
            onUpdateUsers={setUsers}
            onCancel={() => setShowUserManagement(false)}
          />
        )}

        {showProcurementDashboard && (
          <ProcurementDashboard
            bookings={bookings}
            rooms={rooms}
            onClose={() => setShowProcurementDashboard(false)}
          />
        )}

        {showEmailSettings && (
          <EmailSettingsPanel
            user={currentUser}
            onSettingsUpdate={(settings) => {
              console.log('Email settings updated:', settings);
              // You can add additional logic here to handle settings changes
            }}
            onClose={() => setShowEmailSettings(false)}
          />
        )}

        {/* Footer */}
        <footer className="booking-footer">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img src="/ICPAC_Website_Header_Logo.svg" alt="ICPAC Logo" className="footer-logo-img" />
                <div className="footer-text">
                  <h3>ICPAC Boardroom System</h3>
                  <p>Streamlining meeting room reservations</p>
                </div>
              </div>
            </div>

            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Refresh</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleUserLogout(); }}>Logout</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Contact Info</h4>
              <div className="contact-info">
                <p><strong>ICPAC</strong></p>
                <p>Climate Prediction and Applications Centre</p>
                <p>Email: info@icpac.net</p>
                <p>Phone: +254 20 7095000</p>
              </div>
            </div>

            <div className="footer-section">
              <h4>System Stats</h4>
              <div className="system-stats">
                <p>Total Rooms: {rooms.length}</p>
                <p>Active Bookings: {bookings.length}</p>
                <p>Registered Users: {users.length}</p>
                <p>Last Updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 ICPAC. All rights reserved. | Boardroom Booking System v1.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const ProcurementOrdersSection = ({ orders, attendeeCount, onOrdersChange }) => {
  const procurementItems = [
    { id: 'coffee_tea', name: 'Coffee & Tea', unit: 'cup' },
    { id: 'lunch', name: 'Lunch', unit: 'plate' },
    { id: 'snacks', name: 'Snacks', unit: 'portion' },
    { id: 'water', name: 'Bottled Water', unit: 'bottle' },
    { id: 'juice', name: 'Fresh Juice', unit: 'glass' }
  ];

  const handleItemToggle = (itemId) => {
    const existingOrder = orders.find(order => order.itemId === itemId);

    if (existingOrder) {
      onOrdersChange(orders.filter(order => order.itemId !== itemId));
    } else {
      const item = procurementItems.find(item => item.id === itemId);
      const newOrder = {
        itemId: itemId,
        itemName: item.name,
        quantity: attendeeCount,
        unit: item.unit,
        notes: ''
      };
      onOrdersChange([...orders, newOrder]);
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    const updatedOrders = orders.map(order =>
      order.itemId === itemId
        ? { ...order, quantity: parseInt(quantity) || 0 }
        : order
    );
    onOrdersChange(updatedOrders);
  };

  const handleNotesChange = (itemId, notes) => {
    const updatedOrders = orders.map(order =>
      order.itemId === itemId
        ? { ...order, notes }
        : order
    );
    onOrdersChange(updatedOrders);
  };


  return (
    <div className="procurement-orders">
      <div className="procurement-grid">
        {procurementItems.map(item => {
          const isSelected = orders.some(order => order.itemId === item.id);
          const selectedOrder = orders.find(order => order.itemId === item.id);

          return (
            <div key={item.id} className={`procurement-item ${isSelected ? 'selected' : ''}`}>
              <div className="procurement-item-header">
                <label className="procurement-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleItemToggle(item.id)}
                  />
                  <span className="procurement-item-name">{item.name}</span>
                </label>
              </div>

              {isSelected && (
                <div className="procurement-item-details">
                  <div className="procurement-quantity">
                    <label>Quantity:</label>
                    <input
                      type="number"
                      min="1"
                      value={selectedOrder?.quantity || attendeeCount}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className="quantity-input"
                    />
                    <span className="quantity-unit">{item.unit}(s)</span>
                  </div>

                  <div className="procurement-notes">
                    <label>Special Instructions:</label>
                    <textarea
                      value={selectedOrder?.notes || ''}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      placeholder="Any special requirements or notes..."
                      className="notes-textarea"
                    />
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {orders.length > 0 && (
        <div className="procurement-summary">
          <h4>Procurement Summary</h4>
          <div className="procurement-summary-items">
            {orders.map(order => (
              <div key={order.itemId} className="summary-item">
                <span>{order.itemName}</span>
                <span>{order.quantity} {order.unit}(s)</span>
              </div>
            ))}
          </div>
          <div className="procurement-note">
            <small>Note: Procurement officer will be notified of these orders for preparation.</small>
          </div>
        </div>
      )}
    </div>
  );
};

const BookingForm = ({ room, time, date, currentUser, onConfirm, onCancel }) => {
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  // Get current time for today, or use selected time slot
  const getCurrentTimeSlot = () => {
    if (time) return time; // Always use time from clicked slot when available

    const now = new Date();
    const selectedDate = new Date(date);

    // Only use current time logic if booking for today
    const isToday = selectedDate.toDateString() === now.toDateString();

    if (!isToday) {
      // For future dates, user must click on a specific time slot
      return timeSlots[0]; // Fallback only
    }

    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // If it's past the minute mark, go to next hour
    const targetHour = currentMinutes > 0 ? currentHour + 1 : currentHour;

    // Format as HH:00 and find closest available slot
    const timeString = `${targetHour.toString().padStart(2, '0')}:00`;

    // Find the closest available time slot for today
    const availableSlot = timeSlots.find(slot => slot >= timeString);
    return availableSlot || timeSlots[0];
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime, duration) => {
    const startIndex = timeSlots.findIndex(slot => slot === startTime);
    if (startIndex === -1) return timeSlots[1];

    const endIndex = Math.min(startIndex + duration, timeSlots.length - 1);
    return timeSlots[endIndex];
  };

  const initialStartTime = getCurrentTimeSlot();

  const [formData, setFormData] = useState({
    title: '',
    organizer: currentUser ? currentUser.name : '',
    bookingType: 'hourly',
    duration: 1,
    startDate: date.toISOString().split('T')[0],
    endDate: date.toISOString().split('T')[0],
    startTime: initialStartTime,
    endTime: calculateEndTime(initialStartTime, 1),
    description: '',
    attendeeCount: 1,
    procurementOrders: []
  });

  const isTimeSlotInPast = (date, time) => {
    const now = new Date();
    const slotDate = new Date(date);

    // If the date is in the future, it's not in the past
    if (slotDate.toDateString() !== now.toDateString()) {
      return slotDate < now;
    }

    // If it's today, check if the time has passed
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(slotDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime < now;
  };


  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate past time for hourly bookings on today's date
    if (formData.bookingType === 'hourly') {
      if (isTimeSlotInPast(new Date(formData.startDate), formData.startTime)) {
        alert('Cannot book past time slots. Please select a future time.');
        return;
      }
    }

    onConfirm(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Auto-adjust end date based on booking type
      if (name === 'bookingType') {
        const startDate = new Date(prev.startDate);
        switch (value) {
          case 'full-day':
            newData.endDate = prev.startDate;
            newData.startTime = '08:00';
            newData.endTime = '18:00';
            break;
          case 'weekly':
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            newData.endDate = endDate.toISOString().split('T')[0];
            newData.startTime = '08:00';
            newData.endTime = '18:00';
            break;
          case 'multi-day':
            const multiEndDate = new Date(startDate);
            multiEndDate.setDate(startDate.getDate() + 1);
            newData.endDate = multiEndDate.toISOString().split('T')[0];
            newData.startTime = '08:00';
            newData.endTime = '18:00';
            break;
          default: // hourly
            newData.endDate = prev.startDate;
            break;
        }
      }

      // Recalculate end time when duration changes
      if (name === 'duration') {
        const duration = parseInt(value);
        newData.duration = duration; // Ensure duration is stored as integer
        newData.endTime = calculateEndTime(prev.startTime, duration);
      }

      // Recalculate end time when start time changes
      if (name === 'startTime') {
        newData.endTime = calculateEndTime(value, parseInt(prev.duration));
      }

      // Ensure end date is not before start date
      if (name === 'endDate' && new Date(value) < new Date(prev.startDate)) {
        newData.endDate = prev.startDate;
      }

      return newData;
    });
  };

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal-container">
        <button onClick={onCancel} className="booking-modal-close">×</button>

        <div className="booking-modal-header">
          <div className="booking-header-icon">
            <span className="header-icon-bg">📅</span>
          </div>
          <div className="booking-header-content">
            <h3 className="booking-modal-title">Book Meeting Room</h3>
            <p className="booking-modal-subtitle">Reserve your perfect meeting space</p>
          </div>
        </div>

        <div className="booking-room-card">
          <div className="room-card-header">
            <div className="room-icon">🏢</div>
            <div className="room-details">
              <h4 className="room-name">{room.name}</h4>
              <div className="room-meta">
                <span className="capacity-badge">
                  <span className="capacity-icon">👥</span>
                  {room.capacity} people
                </span>
                <span className="booking-preview">
                  {formData.bookingType === 'hourly'
                    ? `${new Date(formData.startDate).toLocaleDateString()} • ${formData.startTime} - ${formData.endTime}`
                    : `${new Date(formData.startDate).toLocaleDateString()} to ${new Date(formData.endDate).toLocaleDateString()}`
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="room-amenities">
            {room.amenities.map(amenity => (
              <span key={amenity} className="amenity-chip">
                <span className="amenity-chip-icon">{getAmenityIcon(amenity)}</span>
                {amenity}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modern-booking-form">
          <div className="booking-form-grid">
            <div className="form-field-group">
              <div className="floating-field">
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className={`modern-input ${formData.title ? 'has-value' : ''}`}
                  id="meeting-title"
                />
                <label htmlFor="meeting-title" className="floating-label">
                  <span className="label-icon">📋</span>
                  Meeting Title *
                </label>
                <div className="field-border"></div>
              </div>
            </div>

            <div className="form-field-group">
              <div className="floating-field">
                <input
                  type="text"
                  name="organizer"
                  required
                  value={formData.organizer}
                  onChange={handleChange}
                  className={`modern-input ${formData.organizer ? 'has-value' : ''}`}
                  id="organizer-name"
                />
                <label htmlFor="organizer-name" className="floating-label">
                  <span className="label-icon">👤</span>
                  Organizer *
                </label>
                <div className="field-border"></div>
              </div>
            </div>

            <div className="form-field-group">
              <div className="select-field">
                <select
                  name="bookingType"
                  value={formData.bookingType}
                  onChange={handleChange}
                  className="modern-select"
                  id="booking-type"
                >
                  <option value="hourly">⏰ Hourly Booking</option>
                  <option value="full-day">🌅 Full Day (8:00 AM - 6:00 PM)</option>
                  <option value="multi-day">📅 Multi-Day Booking</option>
                  <option value="weekly">📆 Weekly Booking (7 days)</option>
                </select>
                <label htmlFor="booking-type" className="select-label">
                  <span className="label-icon">🕒</span>
                  Booking Type *
                </label>
                <div className="select-arrow">▼</div>
              </div>
            </div>

            {formData.bookingType === 'hourly' && (
              <div className="form-field-group">
                <div className="select-field">
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="modern-select"
                    id="duration"
                  >
                    <option value={1}>⏱️ 1 hour</option>
                    <option value={2}>⏱️ 2 hours</option>
                    <option value={3}>⏱️ 3 hours</option>
                    <option value={4}>⏱️ 4 hours</option>
                  </select>
                  <label htmlFor="duration" className="select-label">
                    <span className="label-icon">⏰</span>
                    Duration
                  </label>
                  <div className="select-arrow">▼</div>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-field-group">
                <div className="date-field">
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleChange}
                    className="modern-date-input"
                    id="start-date"
                  />
                  <label htmlFor="start-date" className="date-label">
                    <span className="label-icon">📅</span>
                    Start Date *
                  </label>
                </div>
              </div>

              {formData.bookingType === 'multi-day' && (
                <div className="form-field-group">
                  <div className="date-field">
                    <input
                      type="date"
                      name="endDate"
                      required
                      value={formData.endDate}
                      onChange={handleChange}
                      className="modern-date-input"
                      id="end-date"
                      min={formData.startDate}
                    />
                    <label htmlFor="end-date" className="date-label">
                      <span className="label-icon">📅</span>
                      End Date *
                    </label>
                  </div>
                </div>
              )}
            </div>

            {formData.bookingType === 'hourly' && (
              <div className="form-row">
                <div className="form-field-group">
                  <div className="select-field">
                    <select
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="modern-select"
                      id="start-time"
                    >
                      {timeSlots.map(slot => {
                        const isSlotPast = isTimeSlotInPast(new Date(formData.startDate), slot);
                        return (
                          <option key={slot} value={slot} disabled={isSlotPast}>
                            🕐 {slot} {isSlotPast ? '(Past)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <label htmlFor="start-time" className="select-label">
                      <span className="label-icon">🕐</span>
                      Start Time *
                    </label>
                    <div className="select-arrow">▼</div>
                  </div>
                </div>

                <div className="form-field-group">
                  <div className="select-field">
                    <select
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="modern-select"
                      id="end-time"
                    >
                      {timeSlots.map(slot => {
                        const isSlotPast = isTimeSlotInPast(new Date(formData.startDate), slot);
                        return (
                          <option key={slot} value={slot} disabled={isSlotPast}>
                            🕐 {slot} {isSlotPast ? '(Past)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <label htmlFor="end-time" className="select-label">
                      <span className="label-icon">🕐</span>
                      End Time *
                    </label>
                    <div className="select-arrow">▼</div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-field-group full-width">
              <div className="textarea-field">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className={`modern-textarea ${formData.description ? 'has-value' : ''}`}
                  id="description"
                  placeholder=" "
                />
                <label htmlFor="description" className="floating-label">
                  <span className="label-icon">📝</span>
                  Description (optional)
                </label>
                <div className="field-border"></div>
              </div>
            </div>

            <div className="form-field-group">
              <div className="number-field">
                <input
                  type="number"
                  name="attendeeCount"
                  value={formData.attendeeCount}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  required
                  className={`modern-number-input ${formData.attendeeCount ? 'has-value' : ''}`}
                  id="attendee-count"
                />
                <label htmlFor="attendee-count" className="floating-label">
                  <span className="label-icon">👥</span>
                  Number of Attendees *
                </label>
                <div className="field-border"></div>
                <div className="capacity-indicator">
                  <span className="capacity-text">Max: {room.capacity}</span>
                  <div className="capacity-bar">
                    <div
                      className="capacity-fill"
                      style={{ width: `${Math.min((formData.attendeeCount / room.capacity) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-field-group full-width">
              <div className="procurement-card">
                <div className="procurement-header">
                  <div className="procurement-icon">🛍️</div>
                  <div className="procurement-title">
                    <h4>Procurement Orders</h4>
                    <p>Optional catering and supplies for your meeting</p>
                  </div>
                </div>
                <div className="procurement-content">
                  <ProcurementOrdersSection
                    orders={formData.procurementOrders}
                    attendeeCount={formData.attendeeCount}
                    onOrdersChange={(orders) => setFormData({ ...formData, procurementOrders: orders })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="booking-form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="booking-btn secondary"
            >
              <span className="btn-icon">❌</span>
              Cancel
            </button>
            <button
              type="submit"
              className="booking-btn primary"
            >
              <span className="btn-icon">✅</span>
              Book Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserLoginModal = ({ onLogin, onCancel, onSwitchToSignup, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container">
        <button onClick={onCancel} className="auth-close-btn">×</button>

        <div className="auth-split-layout">
          {/* Branding Sidebar */}
          <div className="auth-branding-sidebar">
            <div className="branding-logo">
              <img
                src="/ICPAC_Website_Header_Logo.svg"
                alt="ICPAC Logo"
              />
            </div>
            <h2 className="branding-title">Welcome Back!</h2>
            <p className="branding-subtitle">Sign in to access your ICPAC meeting room booking dashboard</p>
            <div className="branding-features">
              <div className="feature-item">
                <span className="feature-icon">📅</span>
                <span className="feature-text">Book meeting rooms instantly</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🏢</span>
                <span className="feature-text">Manage your reservations</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">View analytics dashboard</span>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="auth-form-section">
            <div className="auth-form-header">
              <h3 className="auth-form-title">Sign In</h3>
              <p className="auth-form-subtitle">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="floating-label-group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className={`floating-input ${email ? 'has-value' : ''}`}
                  required
                  id="login-email"
                />
                <label htmlFor="login-email" className="floating-label">
                  Email Address
                </label>
              </div>

              <div className="floating-label-group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`floating-input ${password ? 'has-value' : ''}`}
                  required
                  id="login-password"
                />
                <label htmlFor="login-password" className="floating-label">
                  Password
                </label>
              </div>

              <div className="forgot-password-link">
                <span className="auth-switch-link" onClick={onForgotPassword}>
                  Forgot Password?
                </span>
              </div>

              <div className="auth-form-actions">
                <button type="button" onClick={onCancel} className="auth-secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="auth-primary-btn">
                  Sign In
                </button>
              </div>
            </form>

            <div className="auth-form-footer">
              <p className="auth-switch-text">
                Don't have an account? <span className="auth-switch-link" onClick={onSwitchToSignup}>Sign up here</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserSignupModal = ({ onSignup, onCancel, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [focusedFields, setFocusedFields] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    text: '',
    color: '#e2e8f0'
  });
  const [validationErrors, setValidationErrors] = useState({});

  const calculatePasswordStrength = (password) => {
    let score = 0;
    let text = '';
    let color = '#e2e8f0';

    if (password.length === 0) {
      return { score: 0, text: '', color: '#e2e8f0' };
    }

    // Length check
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determine strength
    if (score <= 2) {
      text = 'Weak';
      color = '#ef4444';
    } else if (score <= 4) {
      text = 'Fair';
      color = '#f59e0b';
    } else if (score <= 5) {
      text = 'Good';
      color = '#3b82f6';
    } else {
      text = 'Strong';
      color = '#10b981';
    }

    return { score, text, color };
  };

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedDomains = ['@icpac.net', '@igad.int'];

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (!allowedDomains.some(domain => formData.email && formData.email.toLowerCase().endsWith(domain))) {
      errors.email = 'Email must be from @icpac.net or @igad.int domain';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    onSignup(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate password strength
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFocus = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleBlur = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: false }));
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container">
        <button onClick={onCancel} className="auth-close-btn">×</button>

        <div className="auth-split-layout">
          {/* Branding Sidebar */}
          <div className="auth-branding-sidebar">
            <div className="branding-logo">
              <img
                src="/ICPAC_Website_Header_Logo.svg"
                alt="ICPAC Logo"
              />
            </div>
            <h2 className="branding-title">Join ICPAC!</h2>
            <p className="branding-subtitle">Create your account to start booking meeting rooms and accessing our services</p>
            <div className="branding-features">
              <div className="feature-item">
                <span className="feature-icon">🚀</span>
                <span className="feature-text">Quick account setup</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔐</span>
                <span className="feature-text">Secure authentication</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">Personalized experience</span>
              </div>
            </div>
          </div>

          {/* Signup Form */}
          <div className="auth-form-section">
            <div className="auth-form-header">
              <h3 className="auth-form-title">Create Account</h3>
              <p className="auth-form-subtitle">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="floating-label-group">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => handleFocus('name')}
                  onBlur={() => handleBlur('name')}
                  className={`floating-input ${formData.name ? 'has-value' : ''} ${validationErrors.name ? 'error' : ''}`}
                  required
                  id="signup-name"
                />
                <label htmlFor="signup-name" className="floating-label">
                  Full Name
                </label>
                {validationErrors.name && <span className="error-message">{validationErrors.name}</span>}
              </div>

              <div className="floating-label-group">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  className={`floating-input ${formData.email ? 'has-value' : ''} ${validationErrors.email ? 'error' : ''}`}
                  required
                  id="signup-email"
                />
                <label htmlFor="signup-email" className="floating-label">
                  Email Address
                </label>
                {validationErrors.email && <span className="error-message">{validationErrors.email}</span>}
              </div>

              <div className="floating-label-group">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  className={`floating-input ${formData.password ? 'has-value' : ''} ${validationErrors.password ? 'error' : ''}`}
                  required
                  id="signup-password"
                />
                <label htmlFor="signup-password" className="floating-label">
                  Password (min 6 characters)
                </label>
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bar">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${(passwordStrength.score / 6) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      />
                    </div>
                    <span className="strength-text" style={{ color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                )}
                {validationErrors.password && <span className="error-message">{validationErrors.password}</span>}
              </div>

              <div className="floating-label-group">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => handleFocus('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`floating-input ${formData.confirmPassword ? 'has-value' : ''} ${validationErrors.confirmPassword ? 'error' : ''}`}
                  required
                  id="signup-confirm-password"
                />
                <label htmlFor="signup-confirm-password" className="floating-label">
                  Confirm Password
                </label>
                {validationErrors.confirmPassword && <span className="error-message">{validationErrors.confirmPassword}</span>}
              </div>

              <div className="auth-form-actions">
                <button type="button" onClick={onCancel} className="auth-secondary-btn">
                  Cancel
                </button>
                <button type="submit" className="auth-primary-btn">
                  Create Account
                </button>
              </div>
            </form>

            <div className="auth-form-footer">
              <p className="auth-switch-text">
                Already have an account? <span className="auth-switch-link" onClick={onSwitchToLogin}>Sign in here</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ForgotPasswordModal = ({ onCancel, onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedDomains = ['@icpac.net', '@igad.int'];

    // Check basic email format first
    if (!emailRegex.test(email)) {
      return false;
    }

    // Check if email ends with allowed domains
    return email && allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setValidationError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setValidationError('Email must be from @icpac.net or @igad.int domain');
      return;
    }

    setValidationError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2000);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (validationError) {
      setValidationError('');
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container">
        <button onClick={onCancel} className="auth-close-btn">×</button>

        <div className="auth-split-layout">
          {/* Branding Sidebar */}
          <div className="auth-branding-sidebar">
            <div className="branding-logo">🔐</div>
            <h2 className="branding-title">Reset Password</h2>
            <p className="branding-subtitle">
              {isSubmitted
                ? "Check your email for reset instructions"
                : "Enter your email to receive password reset instructions"
              }
            </p>
            <div className="branding-features">
              <div className="feature-item">
                <span className="feature-icon">📧</span>
                <span className="feature-text">Email verification</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Secure reset link</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Quick process</span>
              </div>
            </div>
          </div>

          {/* Forgot Password Form */}
          <div className="auth-form-section">
            <div className="auth-form-header">
              <h3 className="auth-form-title">
                {isSubmitted ? "Email Sent!" : "Forgot Password"}
              </h3>
              <p className="auth-form-subtitle">
                {isSubmitted
                  ? "We've sent password reset instructions to your email address"
                  : "Enter your email address and we'll send you instructions to reset your password"
                }
              </p>
            </div>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="floating-label-group">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`floating-input ${email ? 'has-value' : ''} ${validationError ? 'error' : ''}`}
                    required
                    id="forgot-email"
                    disabled={isLoading}
                  />
                  <label htmlFor="forgot-email" className="floating-label">
                    Email Address
                  </label>
                  {validationError && <span className="error-message">{validationError}</span>}
                </div>

                <div className="auth-form-actions">
                  <button type="button" onClick={onBackToLogin} className="auth-secondary-btn" disabled={isLoading}>
                    Back to Login
                  </button>
                  <button type="submit" className="auth-primary-btn" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="reset-success">
                <div className="success-icon">✅</div>
                <div className="success-message">
                  <h4>Instructions sent!</h4>
                  <p>Check your email inbox and spam folder for the password reset link.</p>
                  <p className="reset-email">Sent to: <strong>{email}</strong></p>
                </div>
                <div className="auth-form-actions">
                  <button onClick={onBackToLogin} className="auth-primary-btn">
                    Back to Login
                  </button>
                </div>
              </div>
            )}

            <div className="auth-form-footer">
              <p className="auth-switch-text">
                Remember your password? <span className="auth-switch-link" onClick={onBackToLogin}>Sign in here</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onLogin, onSignup, onViewDashboard }) => {
  return (
    <div className="booking-container">
      <div className="booking-wrapper">
        {/* Header */}
        <div className="booking-header">
          <div className="header-title-row">
            <div className="logo-section">
              <img src="/ICPAC_Website_Header_Logo.svg" alt="ICPAC Logo" className="icpac-logo" />
            </div>
            <div className="title-section">
              <h1 className="booking-title">ICPAC INTERNAL BOOKING SYSTEM</h1>
              <p className="booking-subtitle">Welcome to the ICPAC Internal Booking System - Streamline your conference room reservations, manage meeting schedules, and enhance team collaboration</p>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="date-section">
          <div className="date-header">
            <h2 className="date-title">Welcome to ICPAC Booking System</h2>
            <div className="admin-controls">
              <div className="auth-buttons">
                <button
                  onClick={onLogin}
                  className="admin-login-btn"
                  title="Login to your account"
                >
                  Login
                </button>
                <button
                  onClick={onSignup}
                  className="user-management-btn"
                  title="Create new account"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>

          <div className="date-picker-section">
            <label className="date-picker-label" style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff' }}>Get Started:</label>
            <p style={{ marginTop: '10px', color: '#ffffff', fontSize: '16px', fontStyle: 'italic', fontWeight: '500' }}>
              Please login to your account or create a new one to access the meeting room booking system.
            </p>
          </div>
        </div>

        {/* Dashboard Analytics Section */}
        <div className="date-section">
          <div className="date-header">
            <h2 className="date-title">Room Analytics & Insights</h2>
            <div className="admin-controls">
              <button
                onClick={onViewDashboard}
                className="admin-login-btn"
                title="View detailed analytics dashboard"
              >
                📊 View Dashboard
              </button>
            </div>
          </div>

          <div className="dashboard-preview" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            marginTop: '20px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
          }}>
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              boxShadow: '0 2px 4px rgba(56, 189, 248, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(56, 189, 248, 0.1)';
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏢</div>
              <h3 style={{ color: '#0369a1', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Total Rooms</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#0c4a6e', margin: '0' }}>6</p>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              boxShadow: '0 2px 4px rgba(34, 197, 94, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(34, 197, 94, 0.1)';
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📊</div>
              <h3 style={{ color: '#166534', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Available Features</h3>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#14532d', margin: '0' }}>Live Analytics</p>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.1)';
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎯</div>
              <h3 style={{ color: '#d97706', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Room Types</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#92400e', margin: '0' }}>3</p>
            </div>
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(139, 92, 246, 0.1)';
              }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚡</div>
              <h3 style={{ color: '#7c3aed', margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Real-time</h3>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#5b21b6', margin: '0' }}>Updates</p>
            </div>
          </div>

          <div className="dashboard-features" style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px'
          }}>
            <h3 style={{ color: '#374151', marginBottom: '15px' }}>Dashboard Features Available:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                <strong>📈 Room Utilization Stats</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Real-time usage percentages and booking counts</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                <strong>🏆 Room Rankings</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Busiest to least used rooms with analytics</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                <strong>🕐 Peak Hours Analysis</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Time-based usage patterns and trends</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                <strong>🔥 Usage Heatmaps</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Visual representation of room usage by time</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #8b5cf6' }}>
                <strong>📊 Interactive Charts</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Weekly/monthly booking trends and patterns</p>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', borderLeft: '4px solid #06b6d4' }}>
                <strong>🎯 Capacity Analysis</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Efficiency metrics and capacity utilization</p>
              </div>
            </div>
          </div>
        </div>


        {/* Footer */}
        <footer className="booking-footer">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img src="/ICPAC_Website_Header_Logo.svg" alt="ICPAC Logo" className="footer-logo-img" />
                <div className="footer-text">
                  <h3>ICPAC Boardroom System</h3>
                  <p>Streamlining meeting room reservations</p>
                </div>
              </div>
            </div>

            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); onLogin(); }}>Login</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); onSignup(); }}>Sign Up</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Contact Info</h4>
              <div className="contact-info">
                <p><strong>ICPAC</strong></p>
                <p>Climate Prediction and Applications Centre</p>
                <p>Email: info@icpac.net</p>
                <p>Phone: +254 20 7095000</p>
              </div>
            </div>

            <div className="footer-section">
              <h4>About the System</h4>
              <div className="system-stats">
                <p>Streamlined meeting room booking</p>
                <p>For ICPAC staff and partners</p>
                <p>Secure and easy to use</p>
                <p>Login required for access</p>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 ICPAC. All rights reserved. | Boardroom Booking System v1.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

const AdminLoginModal = ({ onLogin, onCancel }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="admin-logo-section" style={{ textAlign: 'center', marginBottom: '16px' }}>
            <img
              src="/ICPAC_Website_Header_Logo.svg"
              alt="ICPAC Logo"
              style={{ width: '48px', height: '48px', objectFit: 'contain' }}
            />
          </div>
          <h3 className="modal-title">Admin Login</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label className="form-label">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter admin password"
              required
            />
          </div>
          <div className="form-buttons">
            <button type="button" onClick={onCancel} className="form-button secondary">
              Cancel
            </button>
            <button type="submit" className="form-button primary">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditBookingForm = ({ booking, rooms, currentUser, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState({
    title: booking.title || '',
    organizer: booking.organizer || (currentUser ? currentUser.name : ''),
    duration: booking.duration || 1,
    description: booking.description || '',
    date: booking.date || '',
    time: booking.time || '',
    roomId: booking.roomId || 1,
    attendeeCount: booking.attendeeCount || 1,
    procurementOrders: booking.procurementOrders || []
  });

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'duration' || name === 'roomId' ? parseInt(value) : value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Edit Booking</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>

        <div className="booking-info">
          <h4>Editing: {booking.title}</h4>
          <p>Original: {booking.date} at {booking.time}</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label className="form-label">Meeting Title *</label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Organizer *</label>
            <input
              type="text"
              name="organizer"
              required
              value={formData.organizer}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Room *</label>
            <select
              name="roomId"
              value={formData.roomId}
              onChange={handleChange}
              className="form-select"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Time *</label>
            <select
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="form-select"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Duration (hours)</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="form-select"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={3}>3 hours</option>
              <option value={4}>4 hours</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Number of Attendees <span className="required">*</span>
            </label>
            <input
              type="number"
              name="attendeeCount"
              value={formData.attendeeCount}
              onChange={handleChange}
              min="1"
              max="100"
              required
              className="form-input"
              placeholder="Enter number of attendees"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Procurement Orders <span className="optional">(optional)</span>
            </label>
            <div className="procurement-section">
              <ProcurementOrdersSection
                orders={formData.procurementOrders}
                attendeeCount={formData.attendeeCount}
                onOrdersChange={(orders) => setFormData({ ...formData, procurementOrders: orders })}
              />
            </div>
          </div>

          <div className="form-buttons">
            <button type="button" onClick={onCancel} className="form-button secondary">
              Cancel
            </button>
            <button type="submit" className="form-button primary">
              Update Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserRegistrationModal = ({ rooms, onRegister, onCancel, user = null, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || '',
    role: user?.role || 'user',
    managedRooms: user?.managedRooms || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate email domain
    const allowedDomains = ['@icpac.net', '@igad.int'];
    if (!allowedDomains.some(domain => formData.email && formData.email.toLowerCase().endsWith(domain))) {
      alert('Email must be from @icpac.net or @igad.int domain');
      return;
    }

    onRegister(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoomSelection = (roomId) => {
    const updatedRooms = formData.managedRooms.includes(roomId)
      ? formData.managedRooms.filter(id => id !== roomId)
      : [...formData.managedRooms, roomId];

    setFormData({
      ...formData,
      managedRooms: updatedRooms
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{isEditing ? 'Edit User' : 'User Registration'}</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-registration-form">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
            >
              <option value="user">User</option>
              <option value="room_admin">Room Admin</option>
              <option value="procurement_officer">Procurement Officer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {formData.role === 'room_admin' && (
            <div className="form-group">
              <label className="form-label">Managed Rooms</label>
              <div className="room-checkboxes">
                {rooms.map(room => (
                  <label key={room.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.managedRooms.includes(room.id)}
                      onChange={() => handleRoomSelection(room.id)}
                    />
                    {room.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-buttons">
            <button type="button" onClick={onCancel} className="form-button secondary">
              Cancel
            </button>
            <button type="submit" className="form-button primary">
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagementModal = ({ users, rooms, onUpdateUsers, onCancel }) => {
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const handleAddUser = (userData) => {
    // Check if email already exists
    const emailExists = users.some(user => user.email && userData.email && user.email.toLowerCase() === userData.email.toLowerCase());
    if (emailExists) {
      alert('Error: A user with this email address already exists. Please use a different email.');
      return;
    }

    const newUser = {
      id: Date.now(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    const updatedUsers = [...users, newUser];
    onUpdateUsers(updatedUsers);
    localStorage.setItem('icpac_users', JSON.stringify(updatedUsers));
    setShowAddUser(false);
    alert('User added successfully!');
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete) {
      if (window.confirm(`⚠️ Are you sure you want to delete user "${userToDelete.name}" (${userToDelete.email})?\n\nThis action cannot be undone and will remove all their access to the system.`)) {
        const updatedUsers = users.filter(user => user.id !== userId);
        onUpdateUsers(updatedUsers);
        localStorage.setItem('icpac_users', JSON.stringify(updatedUsers));
        alert(`User "${userToDelete.name}" has been deleted successfully.`);
      }
    }
  };

  const handleEditUser = (userData) => {
    // Check if email already exists (excluding current user)
    const emailExists = users.some(user =>
      user.id !== editingUser.id && user.email && userData.email && user.email.toLowerCase() === userData.email.toLowerCase()
    );
    if (emailExists) {
      alert('Error: A user with this email address already exists. Please use a different email.');
      return;
    }

    const updatedUsers = users.map(user =>
      user.id === editingUser.id
        ? { ...user, ...userData, updatedAt: new Date().toISOString() }
        : user
    );
    onUpdateUsers(updatedUsers);
    localStorage.setItem('icpac_users', JSON.stringify(updatedUsers));
    setEditingUser(null);
    alert('User updated successfully!');
  };

  const getRoomNames = (roomIds) => {
    return roomIds.map(id => rooms.find(room => room.id === id)?.name).join(', ');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3 className="modal-title">User Management</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>
        <div className="user-management-content">
          <div className="user-management-header">
            <button
              onClick={() => setShowAddUser(true)}
              className="add-user-btn"
              title="Add new user"
            >
              Add New User
            </button>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Managed Rooms</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role === 'super_admin' ? 'Super Admin' :
                          user.role === 'room_admin' ? 'Room Admin' :
                            user.role === 'procurement_officer' ? 'Procurement Officer' : 'User'}
                      </span>
                    </td>
                    <td>{user.managedRooms ? getRoomNames(user.managedRooms) : 'None'}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="edit-user-btn"
                          title="Edit user"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="delete-user-btn"
                          title="Delete user"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-buttons">
            <button onClick={onCancel} className="form-button primary">
              Close
            </button>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUser && (
          <UserRegistrationModal
            rooms={rooms}
            onRegister={handleAddUser}
            onCancel={() => setShowAddUser(false)}
          />
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <UserRegistrationModal
            rooms={rooms}
            user={editingUser}
            onRegister={handleEditUser}
            onCancel={() => setEditingUser(null)}
            isEditing={true}
          />
        )}
      </div>
    </div>
  );
};

// Enhanced Procurement Dashboard Component
const ProcurementDashboard = ({ bookings, rooms, onClose }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState('date');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(10);

  const getAllProcurementOrders = () => {
    return bookings
      .filter(booking => booking.procurementOrders && booking.procurementOrders.length > 0)
      .map(booking => ({
        ...booking,
        roomName: rooms.find(room => room.id === booking.roomId)?.name || 'Unknown Room',
        roomLocation: getRoomLocation(rooms.find(room => room.id === booking.roomId)),
        // Normalize procurement orders data structure
        procurementOrders: booking.procurementOrders.map(item => ({
          ...item,
          itemName: item.itemName || item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          notes: item.notes || ''
        })),
        // Add booking duration info
        duration: getBookingDuration(booking),
        totalDays: getTotalBookingDays(booking),
        priority: calculateOrderPriority(booking)
      }))
      .sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate));
  };

  const getRoomLocation = (room) => {
    if (!room) return 'Unknown Location';
    const name = room.name.toLowerCase();
    if (name.includes('ground floor')) return 'Ground Floor';
    if (name.includes('first floor') || name.includes('1st floor')) return 'First Floor';
    if (name.includes('underground')) return 'Underground';
    return 'Main Building';
  };

  const calculateOrderPriority = (booking) => {
    const orderDate = new Date(booking.date || booking.startDate);
    const now = new Date();
    const hoursUntil = (orderDate - now) / (1000 * 60 * 60);

    if (hoursUntil < 0) return 'expired';
    if (hoursUntil <= 2) return 'urgent';
    if (hoursUntil <= 24) return 'high';
    if (hoursUntil <= 72) return 'medium';
    return 'low';
  };

  const getBookingDuration = (booking) => {
    if (booking.bookingType === 'weekly') return 'Weekly';
    if (booking.bookingType === 'multi-day') return 'Multi-day';
    if (booking.bookingType === 'full-day') return 'Full day';
    return 'Hourly';
  };

  const getTotalBookingDays = (booking) => {
    if (booking.bookingType === 'weekly') return 7;
    if (booking.bookingType === 'multi-day') {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const diffTime = Math.abs(endDate - startDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return 1;
  };

  const orders = getAllProcurementOrders();

  // Enhanced filtering and searching
  const getFilteredOrders = () => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.procurementOrders.some(item =>
          item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        const status = getOrderStatus(order);
        return status.status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.date || a.startDate);
          bVal = new Date(b.date || b.startDate);
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'organizer':
          aVal = a.organizer.toLowerCase();
          bVal = b.organizer.toLowerCase();
          break;
        case 'room':
          aVal = a.roomName.toLowerCase();
          bVal = b.roomName.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1, expired: 0 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Calculate enhanced stats
  const totalOrders = orders.length || 0;
  const totalItems = orders.reduce((total, order) => {
    if (!order.procurementOrders || !Array.isArray(order.procurementOrders)) {
      return total;
    }
    const orderTotal = order.procurementOrders.reduce((orderSum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const days = order.totalDays || 1;
      return orderSum + (quantity * days);
    }, 0);
    return total + orderTotal;
  }, 0);

  // Calculate additional stats for enhanced dashboard
  const urgentOrders = orders.filter(order => order.priority === 'urgent').length;
  const todayOrders = orders.filter(order => {
    try {
      return getOrderStatus(order).status === 'Today';
    } catch (e) {
      return false;
    }
  }).length;
  const upcomingOrders = orders.filter(order => {
    try {
      return getOrderStatus(order).status === 'Upcoming';
    } catch (e) {
      return false;
    }
  }).length;

  // Helper functions for styling
  const getPriorityColor = (priority) => {
    const colors = {
      urgent: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
      high: { bg: '#fef3c7', border: '#fde68a', color: '#d97706' },
      medium: { bg: '#dbeafe', border: '#bfdbfe', color: '#2563eb' },
      low: { bg: '#f0fdf4', border: '#bbf7d0', color: '#059669' },
      expired: { bg: '#f1f5f9', border: '#cbd5e1', color: '#64748b' }
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (orderStatus) => {
    const colors = {
      today: { bg: '#fef3c7', border: '#fde68a', color: '#d97706' },
      upcoming: { bg: '#dbeafe', border: '#bfdbfe', color: '#2563eb' },
      past: { bg: '#f1f5f9', border: '#cbd5e1', color: '#64748b' },
      declined: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' }
    };
    const statusKey = orderStatus.status.toLowerCase();
    return colors[statusKey] || colors.upcoming;
  };

  // Download functions
  const downloadPDF = (filterType = null) => {
    const filteredOrders = filterType ? orders.filter(order => order.duration === filterType) : orders;
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ICPAC Procurement Orders Report${filterType ? ` - ${filterType}` : ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .header h1 { color: #10b981; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; padding: 10px; background: #f8fafc; border-radius: 8px; }
          .stat h3 { color: #10b981; margin: 0; font-size: 24px; }
          .stat p { color: #374151; margin: 5px 0; font-size: 14px; }
          .order { margin: 20px 0; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .order-header { background: #f8fafc; padding: 10px; margin: -15px -15px 10px -15px; border-radius: 7px 7px 0 0; }
          .order-title { font-weight: bold; color: #1f2937; margin: 0; }
          .order-details { color: #6b7280; font-size: 14px; margin: 5px 0; }
          .items { margin: 10px 0; }
          .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
          .item:last-child { border-bottom: none; }
          .status { padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .status.past { background: #fee2e2; color: #dc2626; }
          .status.today { background: #fef3c7; color: #d97706; }
          .status.upcoming { background: #dbeafe; color: #2563eb; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #6b7280; font-size: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ICPAC Procurement Orders Report${filterType ? ` - ${filterType}` : ''}</h1>
          <p>Generated on ${currentDate}</p>
          <p>IGAD Climate Prediction and Applications Centre</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <h3>${filteredOrders.length || 0}</h3>
            <p>Total Orders</p>
          </div>
          <div class="stat">
            <h3>${filteredOrders.reduce((total, order) => {
      if (!order.procurementOrders || !Array.isArray(order.procurementOrders)) {
        return total;
      }
      const orderTotal = order.procurementOrders.reduce((orderSum, item) => {
        const quantity = parseInt(item.quantity) || 0;
        const days = order.totalDays || 1;
        return orderSum + (quantity * days);
      }, 0);
      return total + orderTotal;
    }, 0)}</h3>
            <p>Total Items</p>
          </div>
          <div class="stat">
            <h3>${filteredOrders.filter(order => {
      try {
        return getOrderStatus(order).status === 'Today';
      } catch (e) {
        return false;
      }
    }).length}</h3>
            <p>Today's Orders</p>
          </div>
        </div>

        ${filteredOrders.map(order => {
      const status = getOrderStatus(order);
      return `
            <div class="order">
              <div class="order-header">
                <div class="order-title">${order.title}</div>
                <div class="order-details">
                  <strong>Organizer:</strong> ${order.organizer} | 
                  <strong>Date:</strong> ${formatDate(order.date || order.startDate)} | 
                  <strong>Time:</strong> ${formatTime(order.time || order.startTime)} | 
                  ${order.endDate ? `<strong>End Date:</strong> ${formatDate(order.endDate)} | ` : ''}
                  <strong>Duration:</strong> ${order.duration} ${order.totalDays > 1 ? `(${order.totalDays} days)` : ''} | 
                  <strong>Room:</strong> ${order.roomName} | 
                  <strong>Attendees:</strong> ${order.attendeeCount || 1}
                  <span class="status ${status.className}">${status.status}</span>
                </div>
              </div>
              <div class="items">
                <strong>Items Required:</strong>
                ${order.procurementOrders.map(item => {
        const dailyQuantity = item.quantity;
        const totalQuantity = dailyQuantity * order.totalDays;
        return `
                    <div class="item">
                      <span>${item.itemName}</span>
                      <span><strong>×${totalQuantity}${order.totalDays > 1 ? ` (${dailyQuantity}/day)` : ''}</strong></span>
                    </div>
                    ${item.notes ? `<div style="font-size: 12px; color: #6b7280; margin-left: 10px;">Note: ${item.notes}</div>` : ''}
                  `;
      }).join('')}
              </div>
            </div>
          `;
    }).join('')}

        <div class="footer">
          <p>This report was generated automatically by the ICPAC Boardroom System</p>
          <p>For questions, contact: admin@icpac.net</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getOrderStatus = (order) => {
    const orderDate = new Date(order.date || order.startDate);
    const orderTime = order.time || order.startTime;

    // Create full datetime for the order
    const orderDateTime = new Date(orderDate);
    const [hours, minutes] = orderTime.split(':');
    orderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Calculate time difference in hours
    const currentTime = new Date();
    const timeDifferenceHours = (currentTime - orderDateTime) / (1000 * 60 * 60);

    // Check if order is declined (2+ hours past)
    if (timeDifferenceHours >= 2) {
      return { status: 'Declined', className: 'declined' };
    }

    // Check if order date is in the past
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const orderDateOnly = new Date(orderDate);
    orderDateOnly.setHours(0, 0, 0, 0);

    if (orderDateOnly < todayDate) {
      return { status: 'Past', className: 'past' };
    } else if (orderDateOnly.getTime() === todayDate.getTime()) {
      // If today, check if time has passed
      if (timeDifferenceHours > 0) {
        return { status: 'Past', className: 'past' };
      } else {
        return { status: 'Today', className: 'today' };
      }
    } else {
      return { status: 'Upcoming', className: 'upcoming' };
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large modern-procurement-modal">
        <div className="modal-header" style={{
          background: 'linear-gradient(135deg, #034930 0%, #065f46 100%)',
          padding: '2rem',
          borderRadius: '16px 16px 0 0',
          color: 'white',
          position: 'relative'
        }}>
          <div className="dashboard-title-section">
            <div className="dashboard-title-content">
              <h2 className="modal-title" style={{
                fontSize: '2rem',
                fontWeight: '800',
                color: 'white',
                margin: '0 0 0.5rem 0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
              }}>📊 Procurement Orders Dashboard</h2>
              <p style={{
                color: '#d1fae5',
                fontSize: '1rem',
                margin: '0',
                opacity: '0.9'
              }}>Real-time procurement insights and order management for ICPAC</p>
            </div>
          </div>
          <div className="download-section" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.75rem'
          }}>
            <div className="download-label" style={{
              fontSize: '0.875rem',
              color: '#d1fae5',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Download Orders</div>
            <div className="download-buttons">
              <div className="download-group" style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <button onClick={() => downloadPDF()} className="download-btn btn-pdf" title="Download all orders as PDF" style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}>
                  📄 All Orders PDF
                </button>
                <button onClick={() => downloadPDF('Hourly')} className="download-btn btn-hourly" title="Download hourly orders as PDF" style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}>
                  ⏰ Hourly Orders
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close dashboard" style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}>×</button>
        </div>

        <div className="procurement-dashboard" style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: 'var(--bg-main, #f8fafc)',
          padding: '2rem',
          minHeight: '400px'
        }}>
          {!orders || orders.length === 0 ? (
            <div className="no-orders" style={{
              textAlign: 'center',
              padding: '4rem',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📦</div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '1rem'
              }}>No Procurement Orders Found</h3>
              <p style={{
                color: '#64748b',
                fontSize: '1rem',
                marginBottom: '2rem'
              }}>No bookings have procurement orders yet. Orders will appear here when users submit procurement requests with their meeting bookings.</p>
              <div style={{
                background: '#f1f5f9',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#475569'
              }}>
                <strong>Tip:</strong> Procurement orders are automatically created when users add items to their booking requests during the meeting booking process.
              </div>
            </div>
          ) : (
            <div className="orders-container">
              {/* Enhanced Search and Filter Controls */}
              <div className="dashboard-controls" style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  alignItems: 'end'
                }}>
                  {/* Search Input */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>🔍 Search Orders</label>
                    <input
                      type="text"
                      placeholder="Search by title, organizer, room, or items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>📋 Filter by Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        background: '#ffffff',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="all">All Orders</option>
                      <option value="today">Today</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>

                  {/* Sort Controls */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>📊 Sort by</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                          flex: '1',
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          background: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="date">Date</option>
                        <option value="title">Title</option>
                        <option value="organizer">Organizer</option>
                        <option value="room">Room</option>
                        <option value="priority">Priority</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        style={{
                          padding: '0.75rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                        title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Summary */}
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}>
                  Showing {paginatedOrders.length} of {filteredOrders.length} orders
                  {searchTerm && ` (filtered from ${orders.length} total)`}
                </div>
              </div>
              <div className="dashboard-stats" role="region" aria-label="Dashboard statistics" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div className="stat-card total-orders" role="article" aria-label={`Total orders: ${totalOrders}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #3b82f6',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div className="stat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div className="stat-label" style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>Total<br />Orders</div>
                    <div className="stat-icon" role="img" aria-label="Orders icon" style={{
                      fontSize: '2rem',
                      opacity: '0.7'
                    }}>📦</div>
                  </div>
                  <div className="stat-value" aria-label={`${totalOrders} orders`} style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0'
                  }}>{totalOrders}</div>
                </div>
                <div className="stat-card total-items" role="article" aria-label={`Total items: ${totalItems}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #10b981',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div className="stat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div className="stat-label" style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>Total<br />Items</div>
                    <div className="stat-icon" role="img" aria-label="Items icon" style={{
                      fontSize: '2rem',
                      opacity: '0.7'
                    }}>📋</div>
                  </div>
                  <div className="stat-value" aria-label={`${totalItems} items`} style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0'
                  }}>{totalItems}</div>
                  <small className="stat-description" style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontStyle: 'italic',
                    marginTop: '0.5rem',
                    display: 'block'
                  }}>Including multi-day quantities</small>
                </div>
                <div className="stat-card today-orders" role="article" aria-label={`Today's orders: ${todayOrders}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #f59e0b',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div className="stat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div className="stat-label" style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>Today's<br />Orders</div>
                    <div className="stat-icon" role="img" aria-label="Today icon" style={{
                      fontSize: '2rem',
                      opacity: '0.7'
                    }}>📅</div>
                  </div>
                  <div className="stat-value" style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0'
                  }}>{todayOrders}</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontStyle: 'italic',
                    marginTop: '0.5rem'
                  }}>Requires immediate attention</div>
                </div>

                <div className="stat-card urgent-orders" role="article" aria-label={`Urgent orders: ${urgentOrders}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #ef4444',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div className="stat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div className="stat-label" style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>Urgent<br />Orders</div>
                    <div className="stat-icon" role="img" aria-label="Urgent icon" style={{
                      fontSize: '2rem',
                      opacity: '0.7'
                    }}>🚨</div>
                  </div>
                  <div className="stat-value" style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0'
                  }}>{urgentOrders}</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    fontWeight: '600',
                    marginTop: '0.5rem'
                  }}>Within 2 hours</div>
                </div>

                <div className="stat-card upcoming-orders" role="article" aria-label={`Upcoming orders: ${upcomingOrders}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                  borderLeft: '5px solid #8b5cf6',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <div className="stat-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem'
                  }}>
                    <div className="stat-label" style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: '1.2'
                    }}>Upcoming<br />Orders</div>
                    <div className="stat-icon" role="img" aria-label="Upcoming icon" style={{
                      fontSize: '2rem',
                      opacity: '0.7'
                    }}>📈</div>
                  </div>
                  <div className="stat-value" style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0'
                  }}>{upcomingOrders}</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontStyle: 'italic',
                    marginTop: '0.5rem'
                  }}>Future requirements</div>
                </div>
              </div>

              <div className="orders-table-container" role="region" aria-label="Procurement orders data table" style={{
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden'
              }}>
                <table className="orders-table" role="table" aria-label="List of procurement orders" style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}>
                  <thead>
                    <tr role="row" style={{
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                    }}>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Date</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Time</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Duration</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Meeting</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Organizer</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Room</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Attendees</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Items Required</th>
                      <th role="columnheader" scope="col" aria-sort="none" style={{
                        padding: '1.25rem 1rem',
                        textAlign: 'left',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid #e2e8f0'
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(order => {
                      const orderStatus = getOrderStatus(order);
                      return (
                        <tr key={order.id} style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'all 0.2s ease'
                        }}
                          onMouseEnter={(e) => e.target.closest('tr').style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.target.closest('tr').style.backgroundColor = 'transparent'}>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                          }}>{formatDate(order.date || order.startDate)}</td>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            color: '#64748b'
                          }}>{formatTime(order.time || order.startTime)}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#1e293b',
                              background: getPriorityColor(order.priority).bg,
                              border: `1px solid ${getPriorityColor(order.priority).border}`
                            }}>
                              {order.duration}
                            </span>
                            {order.totalDays > 1 && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                marginTop: '0.25rem'
                              }}>({order.totalDays} days)</div>
                            )}
                          </td>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#1e293b'
                          }}>{order.title}</td>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            color: '#64748b'
                          }}>{order.organizer}</td>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            color: '#64748b'
                          }}>
                            <div>{order.roomName}</div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              marginTop: '0.25rem'
                            }}>{order.roomLocation}</div>
                          </td>
                          <td style={{
                            padding: '1rem',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            fontWeight: '500',
                            color: '#64748b'
                          }}>{order.attendeeCount || 1}</td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}>
                              {order.procurementOrders.map((item, index) => {
                                const dailyQuantity = item.quantity;
                                const totalQuantity = dailyQuantity * order.totalDays;
                                return (
                                  <div key={index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem 0.75rem',
                                    background: '#f8fafc',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0'
                                  }}>
                                    <span style={{
                                      fontSize: '0.875rem',
                                      fontWeight: '500',
                                      color: '#374151',
                                      flex: '1'
                                    }}>{item.itemName}</span>
                                    <span style={{
                                      fontSize: '0.875rem',
                                      fontWeight: '700',
                                      color: '#059669',
                                      marginLeft: '0.5rem'
                                    }}>
                                      ×{totalQuantity}
                                      {order.totalDays > 1 && (
                                        <span style={{
                                          fontSize: '0.75rem',
                                          color: '#64748b',
                                          fontWeight: '400'
                                        }}> ({dailyQuantity}/day)</span>
                                      )}
                                    </span>
                                    {item.notes && (
                                      <div style={{
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        marginTop: '0.25rem',
                                        fontStyle: 'italic'
                                      }}>{item.notes}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: getStatusColor(orderStatus).color,
                              backgroundColor: getStatusColor(orderStatus).bg,
                              border: `1px solid ${getStatusColor(orderStatus).border}`
                            }}>
                              {orderStatus.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#64748b'
                    }}>
                      Page {currentPage} of {totalPages} • {filteredOrders.length} total orders
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: currentPage <= 1 ? '#f9fafb' : '#ffffff',
                          color: currentPage <= 1 ? '#9ca3af' : '#374151',
                          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        ← Previous
                      </button>

                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              background: pageNum === currentPage ? '#3b82f6' : '#ffffff',
                              color: pageNum === currentPage ? '#ffffff' : '#374151',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: pageNum === currentPage ? '600' : '400'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: currentPage >= totalPages ? '#f9fafb' : '#ffffff',
                          color: currentPage >= totalPages ? '#9ca3af' : '#374151',
                          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MeetingSpaceSelectionModal = ({ rooms, onSelect, currentUser }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedRoomId) {
      onSelect(selectedRoomId);
    } else {
      alert('Please select a meeting space to continue.');
    }
  };

  const getLocationFromName = (name) => {
    if (name.toLowerCase().includes('ground floor')) return 'Ground Floor';
    if (name.toLowerCase().includes('first floor')) return 'First Floor';
    if (name.toLowerCase().includes('1st floor')) return '1st Floor';
    if (name.toLowerCase().includes('underground')) return 'Underground';
    return 'Main Building';
  };

  return (
    <div className="modal-overlay meeting-space-modal-overlay">
      <div className="modal-content meeting-space-modal">
        <div className="modal-header">
          <h3 className="modal-title">Select Your Meeting Space</h3>
          <div className="modal-subtitle">
            Welcome, {currentUser?.name}! Please choose a meeting space to continue.
          </div>
        </div>
        <form onSubmit={handleSubmit} className="meeting-space-form">
          <div className="form-group">
            <label className="form-label">Available Meeting Spaces</label>
            <div className="meeting-spaces-grid">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className={`meeting-space-card ${selectedRoomId === room.id.toString() ? 'selected' : ''}`}
                  onClick={() => setSelectedRoomId(room.id.toString())}
                >
                  <div className="space-header">
                    <h4 className="space-name">{room.name}</h4>
                    <span className="space-location">{getLocationFromName(room.name)}</span>
                  </div>
                  <div className="space-details">
                    <div className="space-capacity">
                      <span className="capacity-icon">👥</span>
                      <span>Capacity: {room.capacity}</span>
                    </div>
                    <div className="space-amenities">
                      {room.amenities?.slice(0, 3).map(amenity => (
                        <span key={amenity} className="amenity-chip-small">
                          {amenity}
                        </span>
                      ))}
                      {room.amenities?.length > 3 && (
                        <span className="amenity-more">+{room.amenities.length - 3} more</span>
                      )}
                    </div>
                  </div>
                  <div className="selection-indicator">
                    {selectedRoomId === room.id.toString() && <span className="checkmark">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="form-buttons">
            <button
              type="submit"
              className="form-button primary large"
              disabled={!selectedRoomId}
            >
              Continue to Dashboard
            </button>
          </div>
          <div className="modal-footer-note">
            You can only book and view the meeting space you select here.
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingBoard;
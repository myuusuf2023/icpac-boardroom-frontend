import React, { useState, useEffect } from 'react';
import './BookingBoard.css';

const BookingBoard = () => {
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState('all'); // all, pending, approved, rejected

  // localStorage functions
  const saveBookingsToStorage = (bookingsData) => {
    try {
      localStorage.setItem('icpac_bookings', JSON.stringify(bookingsData));
    } catch (error) {
      console.error('Error saving bookings to localStorage:', error);
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

    // For today, show bookings only if it's before 16:00 (4 PM)
    const currentHour = now.getHours();
    return currentHour < 16;
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

      // Set admin status based on user role
      if (user.role === 'super_admin') {
        setIsAdmin(true);
        localStorage.setItem('icpac_admin', 'true');
      }
    } else {
      alert('Invalid email or password');
    }
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setIsAuthenticated(false);
    setShowLandingPage(true);
    localStorage.removeItem('icpac_current_user');
    localStorage.removeItem('icpac_admin');
  };

  const handleUserSignup = (userData) => {
    // Check if email already exists
    const emailExists = users.some(user => user.email.toLowerCase() === userData.email.toLowerCase());
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
    // If not logged in, show all rooms for general viewing
    if (!currentUser) return rooms;

    // Super admin can see all rooms
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
    return booking.organizer === currentUser.email; // Users can manage their own bookings
  };

  const cancelBooking = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      const updatedBookings = bookings.filter(booking => booking.id !== bookingId);
      setBookings(updatedBookings);
      saveBookingsToStorage(updatedBookings);
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
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'room_admin') {
      return currentUser.managedRooms && currentUser.managedRooms.includes(booking.roomId);
    }
    return false;
  };

  const approveBooking = (bookingId) => {
    if (window.confirm('Are you sure you want to approve this booking?')) {
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
    }
  };

  const rejectBooking = (bookingId) => {
    if (window.confirm('Are you sure you want to reject this booking?')) {
      const updatedBookings = bookings.map(booking =>
        booking.id === bookingId
          ? { 
              ...booking, 
              approvalStatus: 'rejected',
              approvedBy: currentUser.name,
              approvedAt: new Date().toISOString()
            }
          : booking
      );
      setBookings(updatedBookings);
      saveBookingsToStorage(updatedBookings);
    }
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
        { id: 1, roomId: 1, date: '2025-01-08', time: '09:00', duration: 2, title: 'ICPAC Staff Meeting', organizer: 'Dr. Guleid Artan' },
        { id: 2, roomId: 2, date: '2025-01-08', time: '14:00', duration: 1, title: 'Climate Advisory Meeting', organizer: 'ICPAC Team' },
        { id: 3, roomId: 4, date: '2025-01-08', time: '10:00', duration: 3, title: 'Emergency Response Planning', organizer: 'Disaster Risk Management' },
        { id: 4, roomId: 5, date: '2025-01-08', time: '08:00', duration: 2, title: 'GIS Training Workshop', organizer: 'IT Department' },
        { id: 5, roomId: 6, date: '2025-01-08', time: '15:00', duration: 2, title: 'Climate Data Analysis Training', organizer: 'Research Team' },
      ];
      setBookings(defaultBookings);
      saveBookingsToStorage(defaultBookings);
    }
  }, []);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00'
  ];

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getTimeSlotIndex = (time) => {
    return timeSlots.findIndex(slot => slot === time);
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
      if (approvalFilter !== 'all' && canApproveBooking(booking)) {
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
      if (approvalFilter !== 'all' && canApproveBooking(booking)) {
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
    // Check if the time slot is in the past
    if (isTimeSlotInPast(selectedDate, time)) {
      alert('Cannot book past time slots. Please select a future time.');
      return;
    }

    setSelectedRoom(room);
    setSelectedTime(time);
    setShowBookingForm(true);
  };

  const confirmBooking = (bookingData) => {
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
          />
        )}
        
        {/* Signup Modal */}
        {showSignup && (
          <UserSignupModal
            onSignup={handleUserSignup}
            onCancel={() => setShowSignup(false)}
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
              <h1 className="booking-title">ICPAC MEETING BOOKING SYSTEM</h1>
              <p className="booking-subtitle">Reserve your meeting space with ease</p>
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
                  {getVisibleRooms().length === 0 ? (
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
                    getVisibleRooms().map(room => {
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

                            return (
                              <td key={time}>
                                {isBooked && isPast ? (
                                  <div className="time-slot past">
                                    <div className="slot-title">Past</div>
                                    <div className="slot-subtitle">{booking.title}</div>
                                  </div>
                                ) : isBooked ? (
                                  <div className={`time-slot booked ${booking.bookingType || 'hourly'} ${booking.approvalStatus || 'pending'}`}>
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
                                    {/* Approval Status Display */}
                                    <div className={`approval-status ${booking.approvalStatus || 'pending'}`}>
                                      {booking.approvalStatus === 'approved' && '✅ Approved'}
                                      {booking.approvalStatus === 'rejected' && '❌ Rejected'}
                                      {(!booking.approvalStatus || booking.approvalStatus === 'pending') && '⏳ Pending'}
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
                                          onClick={() => approveBooking(booking.id)}
                                          className="approve-booking-btn"
                                          title="Approve this booking"
                                        >
                                          ✅ Approve
                                        </button>
                                        <button
                                          onClick={() => rejectBooking(booking.id)}
                                          className="reject-booking-btn"
                                          title="Reject this booking"
                                        >
                                          ❌ Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : isPast ? (
                                  <div className="time-slot past">
                                    <div className="slot-title">Past</div>
                                    <div className="slot-subtitle">Cannot book</div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleBooking(room, time)}
                                    className="time-slot available"
                                  >
                                    <div className="slot-title">Available</div>
                                    <div className="slot-subtitle">Click to book</div>
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
                        <p>Booking for today is no longer available (after 4:00 PM).</p>
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
            rooms={getVisibleRooms()}
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

const BookingForm = ({ room, time, date, onConfirm, onCancel }) => {
  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00'
  ];

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    bookingType: 'hourly',
    duration: 1,
    startDate: date.toISOString().split('T')[0],
    endDate: date.toISOString().split('T')[0],
    startTime: time || '08:00',
    endTime: time ? (time === '16:00' ? '16:00' : timeSlots[timeSlots.findIndex(t => t === time) + 1]) : '09:00',
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
            newData.endTime = '16:00';
            break;
          case 'weekly':
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            newData.endDate = endDate.toISOString().split('T')[0];
            newData.startTime = '08:00';
            newData.endTime = '16:00';
            break;
          case 'multi-day':
            const multiEndDate = new Date(startDate);
            multiEndDate.setDate(startDate.getDate() + 1);
            newData.endDate = multiEndDate.toISOString().split('T')[0];
            newData.startTime = '08:00';
            newData.endTime = '16:00';
            break;
          default: // hourly
            newData.endDate = prev.startDate;
            break;
        }
      }

      // Ensure end date is not before start date
      if (name === 'endDate' && new Date(value) < new Date(prev.startDate)) {
        newData.endDate = prev.startDate;
      }

      return newData;
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Book Meeting Room</h3>
          <button
            onClick={onCancel}
            className="modal-close"
          >
            ×
          </button>
        </div>

        <div className="booking-info">
          <h4>{room.name}</h4>
          <p>
            {formData.bookingType === 'hourly'
              ? `${new Date(formData.startDate).toLocaleDateString()} at ${formData.startTime} - ${formData.endTime}`
              : `${new Date(formData.startDate).toLocaleDateString()} to ${new Date(formData.endDate).toLocaleDateString()}`
            } • Capacity: {room.capacity} people
          </p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-group">
            <label className="form-label">
              Meeting Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter meeting title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Organizer *
            </label>
            <input
              type="text"
              name="organizer"
              required
              value={formData.organizer}
              onChange={handleChange}
              className="form-input"
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Booking Type *
            </label>
            <select
              name="bookingType"
              value={formData.bookingType}
              onChange={handleChange}
              className="form-select"
            >
              <option value="hourly">Hourly Booking</option>
              <option value="full-day">Full Day (8:00 AM - 4:00 PM)</option>
              <option value="multi-day">Multi-Day Booking</option>
              <option value="weekly">Weekly Booking (7 days)</option>
            </select>
          </div>

          {formData.bookingType === 'hourly' && (
            <div className="form-group">
              <label className="form-label">
                Duration (hours)
              </label>
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
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {formData.bookingType === 'multi-day' && (
              <div className="form-group">
                <label className="form-label">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleChange}
                  className="form-input"
                  min={formData.startDate}
                />
              </div>
            )}
          </div>

          {formData.bookingType === 'hourly' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Start Time *
                </label>
                <select
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-select"
                >
                  {timeSlots.map(slot => {
                    const isSlotPast = isTimeSlotInPast(new Date(formData.startDate), slot);
                    return (
                      <option key={slot} value={slot} disabled={isSlotPast}>
                        {slot} {isSlotPast ? '(Past)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  End Time *
                </label>
                <select
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-select"
                >
                  {timeSlots.map(slot => {
                    const isSlotPast = isTimeSlotInPast(new Date(formData.startDate), slot);
                    return (
                      <option key={slot} value={slot} disabled={isSlotPast}>
                        {slot} {isSlotPast ? '(Past)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Description (optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="form-textarea"
              placeholder="Meeting description or agenda"
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
            <button
              type="button"
              onClick={onCancel}
              className="form-button secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="form-button primary"
            >
              Book Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserLoginModal = ({ onLogin, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">User Login</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-login-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
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

const UserSignupModal = ({ onSignup, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    onSignup(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Create Account</h3>
          <button onClick={onCancel} className="modal-close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="user-signup-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password (min 6 characters)"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
              required
            />
          </div>
          <div className="form-buttons">
            <button type="button" onClick={onCancel} className="form-button secondary">
              Cancel
            </button>
            <button type="submit" className="form-button primary">
              Sign Up
            </button>
          </div>
        </form>
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
              <h1 className="booking-title">ICPAC MEETING BOOKING SYSTEM</h1>
              <p className="booking-subtitle">Welcome to the ICPAC Meeting Room Booking System</p>
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

const EditBookingForm = ({ booking, rooms, onUpdate, onCancel }) => {
  const [formData, setFormData] = useState({
    title: booking.title || '',
    organizer: booking.organizer || '',
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
    '14:00', '15:00', '16:00'
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

const UserRegistrationModal = ({ rooms, onRegister, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    managedRooms: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
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
          <h3 className="modal-title">User Registration</h3>
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


  const handleAddUser = (userData) => {
    // Check if email already exists
    const emailExists = users.some(user => user.email.toLowerCase() === userData.email.toLowerCase());
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
                      <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No actions</span>
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
      </div>
    </div>
  );
};

// Procurement Dashboard Component
const ProcurementDashboard = ({ bookings, rooms, onClose }) => {
  const getAllProcurementOrders = () => {
    return bookings
      .filter(booking => booking.procurementOrders && booking.procurementOrders.length > 0)
      .map(booking => ({
        ...booking,
        roomName: rooms.find(room => room.id === booking.roomId)?.name || 'Unknown Room',
        // Normalize procurement orders data structure
        procurementOrders: booking.procurementOrders.map(item => ({
          ...item,
          itemName: item.itemName || item.name || 'Unknown Item',
          quantity: item.quantity || 1,
          notes: item.notes || ''
        })),
        // Add booking duration info
        duration: getBookingDuration(booking),
        totalDays: getTotalBookingDays(booking)
      }))
      .sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate));
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

  // Removed getTotalQuantity function - replaced with inline calculations that include multi-day multipliers

  const orders = getAllProcurementOrders();

  // Debug: Log orders to see what's happening
  console.log('Procurement Orders:', orders);
  console.log('Orders length:', orders.length);
  console.log('Sample order:', orders[0]);

  // Calculate stats with debugging
  const totalOrders = orders.length || 0;

  // Fix total items calculation - sum up all quantities, not just count items
  const totalItems = orders.reduce((total, order) => {
    if (!order.procurementOrders || !Array.isArray(order.procurementOrders)) {
      console.log(`Order ${order.id}: No procurement orders`);
      return total;
    }

    const orderTotal = order.procurementOrders.reduce((orderSum, item) => {
      const quantity = parseInt(item.quantity) || 0;
      const days = order.totalDays || 1;
      const itemTotal = quantity * days;
      console.log(`Item ${item.itemName}: ${quantity} × ${days} days = ${itemTotal}`);
      return orderSum + itemTotal;
    }, 0);

    console.log(`Order ${order.id}: ${orderTotal} total items`);
    return total + orderTotal;
  }, 0);

  console.log('Total Orders:', totalOrders);
  console.log('Total Items:', totalItems);

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
      <div className="modal-content large">
        <div className="modal-header">
          <h2 className="modal-title">Procurement Orders Dashboard</h2>
          <div className="download-buttons">
            <div className="download-section">
              <h4>Download Orders</h4>
              <div className="download-group">
                <button onClick={() => downloadPDF()} className="download-btn pdf-btn" title="Download all orders as PDF">
                  📄 All Orders PDF
                </button>

                {/* Duration-specific downloads - only show if orders exist for that type */}
                {orders.some(order => order.duration === 'Hourly') && (
                  <button onClick={() => downloadPDF('Hourly')} className="download-btn green-btn duration-btn" title="Download hourly orders as PDF">
                    📄 Hourly Orders
                  </button>
                )}

                {orders.some(order => order.duration === 'Full day') && (
                  <button onClick={() => downloadPDF('Full day')} className="download-btn blue-btn duration-btn" title="Download full day orders as PDF">
                    📄 Full Day Orders
                  </button>
                )}

                {orders.some(order => order.duration === 'Multi-day') && (
                  <button onClick={() => downloadPDF('Multi-day')} className="download-btn yellow-btn duration-btn" title="Download multi-day orders as PDF">
                    📄 Multi-day Orders
                  </button>
                )}

                {orders.some(order => order.duration === 'Weekly') && (
                  <button onClick={() => downloadPDF('Weekly')} className="download-btn purple-btn duration-btn" title="Download weekly orders as PDF">
                    📄 Weekly Orders
                  </button>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="procurement-dashboard">
          {!orders || orders.length === 0 ? (
            <div className="no-orders">
              <h3>No Procurement Orders</h3>
              <p>No bookings have procurement orders yet.</p>
            </div>
          ) : (
            <div className="orders-container">
              <div className="dashboard-stats">
                <div className="stat-card">
                  <h4>Total Orders</h4>
                  <span className="stat-number">{totalOrders}</span>
                </div>
                <div className="stat-card">
                  <h4>Total Items Needed</h4>
                  <span className="stat-number">{totalItems}</span>
                  <small className="stat-description">Including multi-day quantities</small>
                </div>
                <div className="stat-card">
                  <h4>Today's Orders</h4>
                  <span className="stat-number">
                    {orders.filter(order => {
                      try {
                        return getOrderStatus(order).status === 'Today';
                      } catch (e) {
                        return false;
                      }
                    }).length}
                  </span>
                </div>
                <div className="stat-card declined-stat">
                  <h4>Declined Orders</h4>
                  <span className="stat-number declined-number">
                    {orders.filter(order => {
                      try {
                        return getOrderStatus(order).status === 'Declined';
                      } catch (e) {
                        return false;
                      }
                    }).length}
                  </span>
                </div>
              </div>

              <div className="orders-table-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Meeting</th>
                      <th>Organizer</th>
                      <th>Room</th>
                      <th>Attendees</th>
                      <th>Items Required</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const orderStatus = getOrderStatus(order);
                      return (
                        <tr key={order.id} className={orderStatus.className}>
                          <td>{formatDate(order.date || order.startDate)}</td>
                          <td>{formatTime(order.time || order.startTime)}</td>
                          <td>
                            <span className={`duration-badge ${order.duration.toLowerCase().replace(' ', '-')}`}>
                              {order.duration}
                            </span>
                            {order.totalDays > 1 && (
                              <div className="duration-days">({order.totalDays} days)</div>
                            )}
                          </td>
                          <td>{order.title}</td>
                          <td>{order.organizer}</td>
                          <td>{order.roomName}</td>
                          <td>{order.attendeeCount || 1}</td>
                          <td>
                            <div className="items-list">
                              {order.procurementOrders.map((item, index) => {
                                const dailyQuantity = item.quantity;
                                const totalQuantity = dailyQuantity * order.totalDays;
                                return (
                                  <div key={index} className="item-row">
                                    <span className="item-name">{item.itemName}</span>
                                    <span className="item-quantity">
                                      ×{totalQuantity}
                                      {order.totalDays > 1 && (
                                        <span className="daily-quantity"> ({dailyQuantity}/day)</span>
                                      )}
                                    </span>
                                    {item.notes && (
                                      <div className="item-notes">{item.notes}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${orderStatus.className}`}>
                              {orderStatus.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingBoard;
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

  const clearAllBookings = () => {
    if (window.confirm('Are you sure you want to clear all bookings? This cannot be undone.')) {
      setBookings([]);
      localStorage.removeItem('icpac_bookings');
    }
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
    localStorage.removeItem('icpac_current_user');
    localStorage.removeItem('icpac_admin');
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

  // Check for admin status and current user on load
  useEffect(() => {
    const adminStatus = localStorage.getItem('icpac_admin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }

    const currentUserData = localStorage.getItem('icpac_current_user');
    if (currentUserData) {
      setCurrentUser(JSON.parse(currentUserData));
    }

    // Load users or create default super admin
    const savedUsers = loadUsersFromStorage();
    if (savedUsers && savedUsers.length > 0) {
      setUsers(savedUsers);
    } else {
      // Create default super admin
      const defaultUsers = [
        {
          id: 1,
          name: 'Super Admin',
          email: 'admin@icpac.net',
          password: 'admin123',
          role: 'super_admin',
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
    // Set up rooms
    setRooms([
      { id: 1, name: 'Conference Room - Ground Floor', capacity: 100, amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'] },
      { id: 2, name: 'Big Conference Room - First Floor', capacity: 50, amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'] },
      { id: 3, name: 'Boardroom - 1st Floor', capacity: 8, amenities: ['TV Screen', 'Whiteboard'] },
      { id: 4, name: 'Situation Room', capacity: 12, amenities: ['Screen'] },
      { id: 5, name: 'Computer Lab 1 - Underground', capacity: 25, amenities: ['Computers', 'Projector', 'Whiteboard', 'Internet Access', 'Printers'] },
      { id: 6, name: 'Computer Lab 2 - First Floor', capacity: 25, amenities: ['Computers', 'Projector', 'Whiteboard', 'Internet Access', 'Printers'] },
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
    '14:00', '15:00', '16:00', '17:00', '18:00'
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
      procurementOrders: bookingData.procurementOrders || []
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

  return (
    <div className="booking-container">
      <div className="booking-wrapper">
        {/* Header */}
        <div className="booking-header">
          <div className="header-content">
            <div className="logo-section">
              <img src="/icpaclogo.png" alt="ICPAC Logo" className="icpac-logo" />
            </div>
            <div className="title-section">
              <h1 className="booking-title">Icpac Boardroom Booking System</h1>
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
                    <span className="role-badge role-{currentUser.role}">
                      {currentUser.role === 'super_admin' ? 'Super Admin' :
                        currentUser.role === 'room_admin' ? 'Room Admin' : 'User'}
                    </span>
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
                      <button
                        onClick={clearAllBookings}
                        className="clear-bookings-btn"
                        title="Clear all bookings"
                      >
                        Clear All
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleUserLogout}
                    className="admin-logout-btn"
                    title="Logout"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <button
                    onClick={() => setShowUserLogin(true)}
                    className="admin-login-btn"
                    title="Login"
                  >
                    Login
                  </button>
                </div>
              )}
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

          <div className="grid-table-container">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Room</th>
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
                  getVisibleRooms().map(room => (
                    <tr key={room.id}>
                      <td>
                        <div className="room-info">
                          <h3 className="room-name">{room.name}</h3>
                          <p className="room-capacity">Capacity: {room.capacity} people</p>
                          <div className="room-amenities">
                            {room.amenities.map(amenity => (
                              <span key={amenity} className="amenity-tag">
                                {amenity}
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
                              <div className={`time-slot booked ${booking.bookingType || 'hourly'}`}>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
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

        {/* User Login Modal */}
        {showUserLogin && (
          <UserLoginModal
            onLogin={handleUserLogin}
            onCancel={() => setShowUserLogin(false)}
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

        {/* Footer */}
        <footer className="booking-footer">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <img src="/icpaclogo.png" alt="ICPAC Logo" className="footer-logo-img" />
                <div className="footer-text">
                  <h3>ICPAC Boardroom System</h3>
                  <p>Streamlining meeting room reservations</p>
                </div>
              </div>
            </div>

            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul className="footer-links">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setShowUserLogin(true); }}>User Login</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setShowAdminLogin(true); }}>Admin Login</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Refresh</a></li>
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
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    bookingType: 'hourly',
    duration: 1,
    startDate: date.toISOString().split('T')[0],
    endDate: date.toISOString().split('T')[0],
    startTime: time || '08:00',
    endTime: time ? (time === '18:00' ? '18:00' : timeSlots[timeSlots.findIndex(t => t === time) + 1]) : '09:00',
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
              <option value="full-day">Full Day (8:00 AM - 6:00 PM)</option>
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

  const deleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(user => user.id !== userId);
      onUpdateUsers(updatedUsers);
      localStorage.setItem('icpac_users', JSON.stringify(updatedUsers));
    }
  };

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
                          user.role === 'room_admin' ? 'Room Admin' : 'User'}
                      </span>
                    </td>
                    <td>{user.managedRooms ? getRoomNames(user.managedRooms) : 'None'}</td>
                    <td>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="delete-user-btn"
                        title="Delete user"
                      >
                        Delete
                      </button>
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

export default BookingBoard;
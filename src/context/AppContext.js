import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

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

  // Initialize data
  useEffect(() => {
    // Set up rooms with categories
    setRooms([
      { id: 1, name: 'Conference Room - Ground Floor', capacity: 200, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'] },
      { id: 2, name: 'Boardroom - First Floor', capacity: 25, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing'] },
      { id: 3, name: 'SmallBoardroom - 1st Floor', capacity: 12, category: 'conference', amenities: ['TV Screen', 'Whiteboard'] },
      { id: 4, name: 'Situation Room', capacity: 8, category: 'special', amenities: ['Screen'] },
      { id: 5, name: 'Computer Lab 1 - Underground', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard'] },
      { id: 6, name: 'Computer Lab 2 - First Floor', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard'] },
    ]);

    // Load bookings from localStorage or use default
    const savedBookings = loadBookingsFromStorage();
    if (savedBookings && savedBookings.length > 0) {
      setBookings(savedBookings);
    } else {
      // Default bookings for demo
      const defaultBookings = [
        {
          id: 1,
          roomId: 1,
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          duration: 2,
          title: 'Strategic Planning Meeting',
          organizer: 'John Doe',
          attendees: 15,
          email: 'john.doe@icpac.net',
          purpose: 'Strategic planning for Q1 2024',
          catering: 'Coffee and pastries',
          status: 'confirmed'
        },
        {
          id: 2,
          roomId: 2,
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          duration: 1,
          title: 'Team Standup',
          organizer: 'Jane Smith',
          attendees: 8,
          email: 'jane.smith@icpac.net',
          purpose: 'Weekly team synchronization',
          catering: 'None',
          status: 'confirmed'
        }
      ];
      setBookings(defaultBookings);
      saveBookingsToStorage(defaultBookings);
    }
  }, []);

  const value = {
    rooms,
    setRooms,
    bookings,
    setBookings,
    saveBookingsToStorage,
    loadBookingsFromStorage
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
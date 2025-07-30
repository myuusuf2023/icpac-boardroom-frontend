import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Authentication functions
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await apiService.login(email, password);
      setUser(userData.user);
      return userData;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.register(userData);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setRooms([]);
    setBookings([]);
  };

  // Data fetching functions
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const roomsData = await apiService.getRooms();
      setRooms(roomsData.results || roomsData);
    } catch (error) {
      setError(error.message);
      // Fallback to localStorage if API fails
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const bookingsData = await apiService.getBookings();
      setBookings(bookingsData.results || bookingsData);
    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async (bookingData) => {
    try {
      setLoading(true);
      const newBooking = await apiService.createBooking(bookingData);
      setBookings(prev => [...prev, newBooking]);
      return newBooking;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (id, bookingData) => {
    try {
      setLoading(true);
      const updatedBooking = await apiService.updateBooking(id, bookingData);
      setBookings(prev => prev.map(booking => 
        booking.id === id ? updatedBooking : booking
      ));
      return updatedBooking;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (id) => {
    try {
      setLoading(true);
      await apiService.cancelBooking(id);
      setBookings(prev => prev.map(booking => 
        booking.id === id ? { ...booking, status: 'cancelled' } : booking
      ));
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fallback data for when API is not available
  const loadFallbackData = () => {
    const fallbackRooms = [
      { id: 1, name: 'Conference Room - Ground Floor', capacity: 200, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'] },
      { id: 2, name: 'Boardroom - First Floor', capacity: 25, category: 'conference', amenities: ['Projector', 'Whiteboard', 'Video Conferencing'] },
      { id: 3, name: 'SmallBoardroom - 1st Floor', capacity: 12, category: 'conference', amenities: ['TV Screen', 'Whiteboard'] },
      { id: 4, name: 'Situation Room', capacity: 8, category: 'special', amenities: ['Screen'] },
      { id: 5, name: 'Computer Lab 1 - Underground', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard'] },
      { id: 6, name: 'Computer Lab 2 - First Floor', capacity: 20, category: 'computer_lab', amenities: ['Computers', 'Projector', 'Whiteboard'] },
    ];
    setRooms(fallbackRooms);
  };

  // localStorage functions (kept for fallback)
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
    // Check if user is already logged in
    const currentUser = apiService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Fetch real data
      fetchRooms();
      fetchBookings();
    } else {
      // Load fallback data if not authenticated
      loadFallbackData();
      // Load bookings from localStorage for demo
      const savedBookings = loadBookingsFromStorage();
      if (savedBookings && savedBookings.length > 0) {
        setBookings(savedBookings);
      }
    }
  }, []);

  const value = {
    // Data
    rooms,
    setRooms,
    bookings,
    setBookings,
    user,
    setUser,
    loading,
    error,
    setError,
    
    // Auth functions
    login,
    register,
    logout,
    
    // API functions
    fetchRooms,
    fetchBookings,
    createBooking,
    updateBooking,
    cancelBooking,
    
    // Fallback functions (for backward compatibility)
    saveBookingsToStorage,
    loadBookingsFromStorage
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
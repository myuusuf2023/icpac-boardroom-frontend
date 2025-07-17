import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useApp } from '../context/AppContext';
import './DashboardPage.css';

const DashboardPage = () => {
  const { rooms, bookings } = useApp();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const filteredBookings = useMemo(() => {
    const now = new Date();
    let startDate, endDate;

    if (timeRange === 'week') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return isWithinInterval(bookingDate, { start: startDate, end: endDate });
    });
  }, [bookings, timeRange]);

  const totalRooms = rooms.length;
  const totalBookings = filteredBookings.length;
  const uniqueBookedRooms = new Set(filteredBookings.map(b => b.roomId)).size;
  const utilizationRate = totalRooms > 0 ? ((uniqueBookedRooms / totalRooms) * 100).toFixed(1) : 0;

  const roomUtilizationData = useMemo(() => {
    const roomStats = rooms.map(room => {
      const roomBookings = filteredBookings.filter(b => b.roomId === room.id);
      const utilizationCount = roomBookings.length;
      const utilizationPercentage = totalBookings > 0 ? (utilizationCount / totalBookings * 100).toFixed(1) : 0;
      
      return {
        name: room.name.split(' - ')[0],
        bookings: utilizationCount,
        percentage: parseFloat(utilizationPercentage),
        capacity: room.capacity,
        category: room.category
      };
    });

    return roomStats.sort((a, b) => b.bookings - a.bookings);
  }, [rooms, filteredBookings, totalBookings]);

  const roomTypeData = useMemo(() => {
    const typeStats = {};
    rooms.forEach(room => {
      const roomBookings = filteredBookings.filter(b => b.roomId === room.id);
      const categoryName = room.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      if (!typeStats[categoryName]) {
        typeStats[categoryName] = { count: 0, bookings: 0 };
      }
      typeStats[categoryName].count += 1;
      typeStats[categoryName].bookings += roomBookings.length;
    });

    return Object.entries(typeStats).map(([type, stats]) => ({
      type,
      rooms: stats.count,
      bookings: stats.bookings
    }));
  }, [rooms, filteredBookings]);

  const peakHoursData = useMemo(() => {
    const hourStats = {};
    filteredBookings.forEach(booking => {
      const hour = booking.time.split(':')[0];
      const hourKey = `${hour}:00`;
      hourStats[hourKey] = (hourStats[hourKey] || 0) + 1;
    });

    const hours = [];
    for (let i = 8; i <= 18; i++) {
      const hourKey = `${i}:00`;
      hours.push({
        hour: hourKey,
        bookings: hourStats[hourKey] || 0
      });
    }

    return hours;
  }, [filteredBookings]);

  const weeklyTrends = useMemo(() => {
    const weeklyData = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    filteredBookings.forEach(booking => {
      const date = new Date(booking.date);
      const dayName = dayNames[date.getDay()];
      weeklyData[dayName] = (weeklyData[dayName] || 0) + 1;
    });

    return dayNames.map(day => ({
      day,
      bookings: weeklyData[day] || 0
    }));
  }, [filteredBookings]);

  const capacityUtilization = useMemo(() => {
    return rooms.map(room => {
      const roomBookings = filteredBookings.filter(b => b.roomId === room.id);
      const totalCapacityUsed = roomBookings.reduce((sum, booking) => sum + (booking.attendees || 0), 0);
      const maxPossibleCapacity = roomBookings.length * room.capacity;
      const utilizationPercentage = maxPossibleCapacity > 0 ? (totalCapacityUsed / maxPossibleCapacity * 100).toFixed(1) : 0;

      return {
        name: room.name.split(' - ')[0],
        capacity: room.capacity,
        used: totalCapacityUsed,
        efficiency: parseFloat(utilizationPercentage),
        bookings: roomBookings.length
      };
    });
  }, [rooms, filteredBookings]);

  // Show loading state if data is not yet loaded
  if (!rooms.length) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="date-section">
      <div className="date-header">
        <h2 className="date-title">📈 Overview Statistics</h2>
      </div>
      
      <div className="booking-grid">
        <div className="grid-header">
          <h2>Key Metrics</h2>
        </div>
        <div className="grid-table-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', padding: '20px' }}>
            <div className="room-info stat-card-dashboard" style={{ borderLeftColor: '#3B82F6' }}>
              <div className="room-header">
                <h3 className="room-name">
                  <span className="room-category-icon">🏢</span>
                  Total Rooms
                </h3>
              </div>
              <p className="stat-value-large">{totalRooms}</p>
            </div>
            <div className="room-info stat-card-dashboard" style={{ borderLeftColor: '#10B981' }}>
              <div className="room-header">
                <h3 className="room-name">
                  <span className="room-category-icon">📅</span>
                  Total Bookings
                </h3>
              </div>
              <p className="stat-value-large">{totalBookings}</p>
            </div>
            <div className="room-info stat-card-dashboard" style={{ borderLeftColor: '#F59E0B' }}>
              <div className="room-header">
                <h3 className="room-name">
                  <span className="room-category-icon">🎯</span>
                  Rooms Used
                </h3>
              </div>
              <p className="stat-value-large">{uniqueBookedRooms}</p>
            </div>
            <div className="room-info stat-card-dashboard" style={{ borderLeftColor: '#8B5CF6' }}>
              <div className="room-header">
                <h3 className="room-name">
                  <span className="room-category-icon">📊</span>
                  Utilization Rate
                </h3>
              </div>
              <p className="stat-value-large">{utilizationRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="booking-grid compact-charts">
        <div className="grid-header compact-header">
          <h3>📊 Room Usage Ranking</h3>
        </div>
        <div className="grid-table-container chart-container-compact">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={roomUtilizationData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="booking-grid compact-charts">
        <div className="grid-header compact-header">
          <h3>🎯 Room Type Distribution</h3>
        </div>
        <div className="grid-table-container chart-container-compact">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={roomTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, bookings }) => `${type}: ${bookings}`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="bookings"
              >
                {roomTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="dashboard-tab-content">
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Peak Hours Analysis</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={peakHoursData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="bookings" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Weekly Booking Trends</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card full-width">
          <h3>Capacity Utilization Efficiency</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={capacityUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [
                name === 'efficiency' ? `${value}%` : value,
                name === 'efficiency' ? 'Efficiency' : 'Max Capacity'
              ]} />
              <Legend />
              <Bar dataKey="capacity" fill="#E5E7EB" />
              <Bar dataKey="efficiency" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="dashboard-tab-content">
      <div className="reports-section">
        <h3>Room Statistics Summary</h3>
        <div className="table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>Room Name</th>
                <th>Category</th>
                <th>Capacity</th>
                <th>Bookings</th>
                <th>Usage %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {roomUtilizationData.map((room, index) => (
                <tr key={index}>
                  <td className="font-medium">{room.name}</td>
                  <td>
                    <span className={`category-badge ${room.category}`}>
                      {room.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td>{room.capacity}</td>
                  <td>{room.bookings}</td>
                  <td>{room.percentage}%</td>
                  <td>
                    <span className={`status-badge ${room.bookings > 0 ? 'active' : 'inactive'}`}>
                      {room.bookings > 0 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="booking-container">
        <div className="booking-wrapper">
          {/* Header */}
          <div className="booking-header">
            <div className="header-title-row">
              <div className="logo-section">
                <img src="/ICPAC_Website_Header_Logo.svg" alt="ICPAC Logo" className="icpac-logo" />
              </div>
              <div className="title-section">
                <div className="dashboard-title-container">
                  <div className="dashboard-icon-group compact-icon-group">
                    <div className="main-dashboard-icon compact-main-icon">📊</div>
                    <div className="floating-icons">
                      <span className="float-icon icon-1">📈</span>
                      <span className="float-icon icon-2">📋</span>
                      <span className="float-icon icon-3">🎯</span>
                    </div>
                  </div>
                  <h1 className="booking-title dashboard-main-title">ROOM ANALYTICS DASHBOARD</h1>
                  <p className="booking-subtitle dashboard-subtitle">Real-time insights and statistics for ICPAC meeting rooms</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-controls-row">
              <button 
                onClick={() => navigate('/')}
                className="admin-login-btn back-to-home-btn"
                title="Back to Home"
              >
                ← Back to Home
              </button>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="admin-login-btn time-range-select"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="date-section">
            <div className="date-header">
              <h2 className="date-title">Dashboard Navigation</h2>
              <div className="admin-controls">
                <div className="auth-buttons">
                  <button 
                    className={`admin-login-btn ${activeTab === 'overview' ? 'active-tab' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    📈 Overview
                  </button>
                  <button 
                    className={`admin-login-btn ${activeTab === 'analytics' ? 'active-tab' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    📊 Analytics
                  </button>
                  <button 
                    className={`admin-login-btn ${activeTab === 'reports' ? 'active-tab' : ''}`}
                    onClick={() => setActiveTab('reports')}
                  >
                    📋 Reports
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="dashboard-main-content">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
            {activeTab === 'reports' && renderReportsTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
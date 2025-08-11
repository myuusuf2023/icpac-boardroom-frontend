# Backend-Frontend Integration Guide

## Current Status
- ✅ Django Backend: http://localhost:8001/api/
- ✅ React Frontend: http://localhost:3000 (assumed)
- ❌ Integration: Currently using localStorage, needs API connection

## Step-by-Step Integration

### 1. Create API Service File

Create `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8001/api';

class APIService {
  constructor() {
    this.token = localStorage.getItem('access_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      this.logout();
      throw new Error('Authentication required');
    }

    return response;
  }

  // Authentication
  async login(email, password) {
    const response = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      this.token = data.access;
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      return data;
    }
    throw new Error('Login failed');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  // Rooms
  async getRooms() {
    const response = await this.request('/rooms/');
    return response.json();
  }

  async getRoomDetail(roomId) {
    const response = await this.request(`/rooms/${roomId}/`);
    return response.json();
  }

  // Bookings
  async getBookings(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await this.request(`/bookings/?${params}`);
    return response.json();
  }

  async createBooking(bookingData) {
    const response = await this.request('/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
    return response.json();
  }

  async approveBooking(bookingId) {
    const response = await this.request(`/bookings/${bookingId}/approve-reject/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    return response.json();
  }

  async rejectBooking(bookingId, reason) {
    const response = await this.request(`/bookings/${bookingId}/approve-reject/`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
    });
    return response.json();
  }
}

export default new APIService();
```

### 2. Update BookingBoard.js

Replace localStorage functions with API calls:

```javascript
import APIService from '../services/api';

// Replace the useEffect that loads from localStorage
useEffect(() => {
  const loadData = async () => {
    try {
      const [roomsData, bookingsData] = await Promise.all([
        APIService.getRooms(),
        APIService.getBookings()
      ]);
      setRooms(roomsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading data:', error);
      // Handle authentication redirect
    }
  };

  loadData();
}, []);

// Replace approval functions
const approveBooking = async (bookingId) => {
  try {
    await APIService.approveBooking(bookingId);
    // Reload bookings
    const updatedBookings = await APIService.getBookings();
    setBookings(updatedBookings);
  } catch (error) {
    console.error('Error approving booking:', error);
  }
};
```

### 3. Test Integration

#### A. Manual Testing:

1. **Open Browser**:
   ```
   http://localhost:3000
   ```

2. **Check Console**: Open Developer Tools (F12) and look for:
   - Network requests to `localhost:8001`
   - Any CORS errors
   - Authentication errors

3. **Test Login**:
   - Use: admin@icpac.net / admin123
   - Check if JWT token is stored in localStorage

#### B. Network Tab Testing:

1. Open DevTools → Network tab
2. Try to log in
3. You should see:
   - POST request to `/auth/login/`
   - GET requests to `/rooms/` and `/bookings/`

### 4. Fix CORS Issues (if any)

If you see CORS errors, add to Django settings.py:

```python
# Add to INSTALLED_APPS
'corsheaders',

# Add to MIDDLEWARE (at the top)
'corsheaders.middleware.CorsMiddleware',

# Add CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# For development only
CORS_ALLOW_ALL_ORIGINS = True
```

### 5. Quick Test Commands

```bash
# Check if both servers are running
curl http://localhost:8001/api/rooms/  # Should ask for auth
curl http://localhost:3000             # Should return HTML

# Test authentication
curl -X POST http://localhost:8001/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@icpac.net", "password": "admin123"}'
```

## Expected Results

After integration:
1. ✅ Login form connects to Django API
2. ✅ Rooms loaded from Django database  
3. ✅ Bookings saved to Django database
4. ✅ Real-time approval workflow
5. ✅ No more localStorage dependency

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS Error | Install django-cors-headers |
| 401 Unauthorized | Check JWT token in localStorage |
| Network Error | Verify both servers running |
| Data not loading | Check API endpoints in DevTools |

## Testing Credentials

- **Super Admin**: admin@icpac.net / admin123
- **Regular User**: user@icpac.net / user123
- **Procurement**: procurement@icpac.net / procurement123
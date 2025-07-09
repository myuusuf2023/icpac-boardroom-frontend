# ICPAC Boardroom Booking System - Installation Guide

## Overview
The ICPAC Boardroom Booking System is a React-based web application for managing conference room bookings at the ICPAC (IGAD Climate Prediction and Applications Centre). The system features user authentication, role-based access control, and comprehensive room management capabilities.

## System Requirements

### Prerequisites
- **Node.js**: Version 14.0.0 or higher
- **npm**: Version 6.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Web Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

### Recommended System Specifications
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space minimum
- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/myuusuf2023/icpac-boardroom-frontend.git
cd icpac-boardroom-frontend
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required dependencies including:
- React 19.1.0
- React Router DOM 7.6.3
- Axios 1.10.0
- TailwindCSS 4.1.11
- Testing utilities

### 3. Environment Configuration
The application includes a `.env` file with default settings:
```
PORT=8080
REACT_APP_NAME="ICPAC Boardroom Booking System"
```

**Optional**: Modify the `.env` file to customize:
- Port number (default: 8080)
- Application name

### 4. Start the Development Server
```bash
npm start
```

The application will be available at:
- **Local**: http://localhost:8080
- **Network**: http://[your-ip-address]:8080

### 5. Access the Application
Open your web browser and navigate to `http://localhost:8080`

## Default Login Credentials

### Super Admin Account
- **Email**: `admin@icpac.net`
- **Password**: `admin123`
- **Role**: Super Admin (full system access)

### Legacy Admin Login
- **Password**: `admin123` (for quick admin access)

## Available Scripts

### Development
```bash
npm start          # Start development server
npm test           # Run test suite
npm run build      # Build for production
```

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `build/` folder.

## Project Structure
```
icpac-boardroom-frontend/
├── public/
│   ├── icpaclogo.png         # ICPAC logo
│   ├── index.html            # Main HTML template
│   └── manifest.json         # PWA manifest
├── src/
│   ├── components/
│   │   ├── BookingBoard.js   # Main application component
│   │   ├── BookingBoard.css  # Styling
│   │   ├── Header.js         # Navigation header
│   │   ├── Footer.js         # Footer component
│   │   └── Sidebar.js        # Navigation sidebar
│   ├── App.js               # Root component
│   ├── App.css              # Global styles
│   └── index.js             # Entry point
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables
└── README.md               # Basic documentation
```

## Key Features

### User Management
- **Role-based Access Control**: Super Admin, Room Admin, User
- **User Registration**: With email validation
- **Authentication**: Login/logout functionality
- **Permission System**: Room-specific access control

### Room Management
- **6 Pre-configured Rooms**:
  - Executive Boardroom (Ground Floor)
  - Small Boardroom (First Floor)
  - Big Conference Room (Ground Floor)
  - Big Conference Room (First Floor)
  - Computer Lab 1 (Underground)
  - Computer Lab 2 (First Floor)

### Booking System
- **Time Slot Management**: Hourly bookings (8:00 AM - 6:00 PM)
- **Conflict Prevention**: Automatic overlap detection
- **Past Booking Validation**: Prevents booking in past time slots
- **Booking History**: Track all reservations

### Data Storage
- **Local Storage**: Client-side data persistence
- **No Backend Required**: Fully frontend-based solution
- **Data Export**: localStorage can be backed up/restored

## Configuration Options

### Customizing Rooms
To modify room configurations, edit the `rooms` array in `src/components/BookingBoard.js`:

```javascript
const rooms = [
  {
    id: 1,
    name: "Your Room Name",
    floor: "Your Floor",
    capacity: 50,
    equipment: ["Projector", "Whiteboard"]
  }
];
```

### Modifying Time Slots
Time slots can be customized in the `timeSlots` array:

```javascript
const timeSlots = [
  "08:00", "09:00", "10:00", // Add or remove slots
];
```

## Troubleshooting

### Common Issues

#### Port Already in Use
If port 8080 is occupied:
```bash
# Option 1: Use different port
PORT=3000 npm start

# Option 2: Kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

#### Dependencies Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Build Failures
```bash
# Check for ESLint errors
npm run build

# Fix common issues
npm audit fix
```

### Browser Compatibility
- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

## Security Considerations

### Authentication
- Client-side only authentication
- Local storage for session management
- No server-side validation

### Data Security
- All data stored locally in browser
- No external data transmission
- Regular localStorage cleanup recommended

### Production Deployment
For production use, consider:
- Implementing server-side authentication
- Adding HTTPS encryption
- Database integration
- Input sanitization
- CORS configuration

## Support & Maintenance

### Backup Data
To backup user data:
```javascript
// In browser console
localStorage.getItem('icpac_users');
localStorage.getItem('icpac_bookings');
```

### Reset System
To reset all data:
```javascript
// In browser console
localStorage.clear();
```

### Updates
To update the application:
```bash
git pull origin main
npm install
npm start
```

## Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes in `src/components/`
3. Test thoroughly
4. Commit: `git commit -m "Add new feature"`
5. Push: `git push origin feature/new-feature`

### Code Style
- Follow React best practices
- Use consistent naming conventions
- Add comments for complex logic
- Maintain component structure

## License
This project is developed for ICPAC (IGAD Climate Prediction and Applications Centre) internal use.

## Contact
For technical support or questions, contact the development team.

---

**Note**: This is a client-side application designed for internal use. For production deployment, additional security measures and server-side integration are recommended.
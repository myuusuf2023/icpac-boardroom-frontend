# 👑 SUPER ADMIN WORKFLOW

## Login Process
1. 🌐 Go to system URL
2. 📧 Enter: admin@icpac.net  
3. 🔑 Enter: admin123
4. ✅ System validates and shows admin dashboard

## Admin Dashboard Overview
```
👑 SUPER ADMIN DASHBOARD
├── 📊 System Statistics
│   ├── Total Bookings: 125
│   ├── Pending Approvals: 8
│   ├── Active Rooms: 5
│   ├── Total Users: 45
│   └── This Week: 23 bookings
├── 🚨 Urgent Actions
│   ├── 🔔 8 bookings need approval
│   ├── ⚠️ 2 room conflicts to resolve  
│   └── 📧 3 user requests pending
├── 📈 Quick Stats Charts
│   ├── Room Utilization Rates
│   ├── Peak Booking Hours
│   └── Popular Room Types
└── 🔗 Quick Actions
    ├── [Approve Bookings]
    ├── [Manage Rooms]
    ├── [User Management]
    └── [System Reports]
```

## 1. BOOKING MANAGEMENT WORKFLOW

### A. Pending Approvals Dashboard
```
GET /api/bookings/pending-approvals/

🔔 PENDING APPROVALS (8 bookings)
┌─────────────────────────────────────────────────────────┐
│ 📋 #12345 | John Doe | Conference Room A               │
│ 📅 Feb 1, 2024 | 09:00-10:00 | Team Meeting          │
│ 👥 8 attendees | 📝 Need projector and coffee          │
│ 📊 Status: 🟡 Pending | ⏰ Submitted: 2 hours ago      │
│ [✅ Approve] [❌ Reject] [📝 Add Note] [👁️ Details]    │
├─────────────────────────────────────────────────────────┤
│ 📋 #12346 | Sarah Smith | Boardroom                   │
│ 📅 Feb 2, 2024 | 14:00-16:00 | Client Meeting        │
│ 👥 12 attendees | 📝 VIP client, need A/V setup       │
│ 📊 Status: 🟡 Pending | ⏰ Submitted: 4 hours ago      │
│ [✅ Approve] [❌ Reject] [📝 Add Note] [👁️ Details]    │
└─────────────────────────────────────────────────────────┘
```

### B. Approval Process
```
ADMIN CLICKS: [✅ Approve] on Booking #12345

POST /api/bookings/12345/approve-reject/
{
  "action": "approve"
}

✅ BOOKING APPROVED!
├── 📧 Email sent to John Doe
├── 📅 Calendar updated
├── 🔔 Notifications sent
└── 📊 Statistics updated

───────────────────────────────────────

ADMIN CLICKS: [❌ Reject] on Booking #12346

┌─────────────────────────────────┐
│ 📝 REJECTION REASON (Required)  │
├─────────────────────────────────┤
│ Reason: [Room needed for       │
│         emergency board meeting]│
│                                 │
│ [Cancel] [Submit Rejection] ❌   │
└─────────────────────────────────┘

POST /api/bookings/12346/approve-reject/
{
  "action": "reject",
  "rejection_reason": "Room needed for emergency board meeting"
}

❌ BOOKING REJECTED!
├── 📧 Email sent to Sarah Smith with reason
├── 📝 Rejection reason logged
└── 📊 Statistics updated
```

### C. Batch Operations
```
🔲 BULK ACTIONS
├── ☑️ Select All Visible
├── ☑️ Booking #12345 (John Doe)
├── ☑️ Booking #12346 (Sarah Smith)  
├── ☐ Booking #12347 (Mike Johnson)
└── ☑️ Booking #12348 (Lisa Brown)

Selected: 3 bookings
[✅ Approve Selected] [❌ Reject Selected] [📧 Email Users]
```

## 2. ROOM MANAGEMENT WORKFLOW  

### A. Room Overview
```
GET /api/rooms/stats/overview/

🏢 ROOM MANAGEMENT DASHBOARD
├── 📊 Room Statistics
│   ├── Total Rooms: 5
│   ├── Average Utilization: 68%
│   ├── Most Popular: Conference Room A
│   └── Least Used: Training Room C
├── 📈 Utilization Rates (Last 30 days)
│   ├── Conference Room A: 85% (🔥 High demand)
│   ├── Event Hall: 72%
│   ├── Boardroom: 65%
│   ├── Meeting Room B: 58%
│   └── Training Room C: 45% (📉 Low usage)
└── 🔧 Actions
    ├── [Add New Room] ➕
    ├── [Manage Amenities] 
    ├── [Room Maintenance]
    └── [Utilization Reports]
```

### B. Create New Room
```
ADMIN CLICKS: [Add New Room]

┌─────────────────────────────────────┐
│ 🏠 CREATE NEW ROOM                  │
├─────────────────────────────────────┤
│ Name: [Innovation Lab - Tech Wing]  │
│ Category: [▼ Training Room]         │
│ Capacity: [25] people              │
│ Location: [Tech Wing, 1st Floor]   │
│ Description: [Modern tech lab...]   │
│                                     │
│ 🔧 Amenities:                      │
│ ☑️ Projector    ☑️ Computers       │
│ ☑️ Whiteboard   ☑️ Internet        │
│ ☑️ A/C          ☐ Video Conf       │
│                                     │
│ 📋 Booking Rules:                  │
│ Max Advance: [30] days             │
│ Min Duration: [1] hour             │
│ Max Duration: [8] hours            │
│                                     │
│ [Cancel] [Create Room] ✅           │
└─────────────────────────────────────┘

POST /api/rooms/
{
  "name": "Innovation Lab - Tech Wing",
  "category": "training_room", 
  "capacity": 25,
  "location": "Tech Wing, 1st Floor",
  "amenities": ["Projector", "Computers", "Whiteboard"],
  ...
}

✅ ROOM CREATED SUCCESSFULLY!
Room ID: 6 | Ready for bookings
```

### C. Room Analytics Deep Dive
```
GET /api/rooms/1/stats/

📊 CONFERENCE ROOM A - DETAILED ANALYTICS
├── 📈 Usage Statistics (Last 90 days)
│   ├── Total Bookings: 45
│   ├── Approved: 42 (93%)
│   ├── Rejected: 3 (7%)
│   └── Average Duration: 2.3 hours
├── ⏰ Popular Time Slots
│   ├── 09:00-10:00: 12 bookings (🔥)
│   ├── 14:00-15:00: 10 bookings
│   ├── 10:00-11:00: 8 bookings
│   └── 15:00-16:00: 7 bookings
├── 👥 Booking Patterns
│   ├── Average Attendees: 12 people
│   ├── Peak Capacity: 20 (100% full)
│   └── Most Common: Team meetings (60%)
└── 📅 Calendar Heatmap
    [Visual calendar showing busy/free patterns]
```

## 3. USER MANAGEMENT WORKFLOW

### A. User Management Dashboard
```
GET /api/auth/users/

👥 USER MANAGEMENT
├── 📊 User Statistics
│   ├── Total Users: 45
│   ├── Super Admins: 2
│   ├── Room Admins: 5
│   ├── Regular Users: 35
│   └── Procurement: 3
├── 🔍 Filter Users
│   ├── By Role: [▼ All Roles]
│   ├── By Status: [▼ Active]
│   └── Search: [Enter name/email]
└── 📋 User List
    └── [Create New User] ➕
```

### B. User List View
```
┌────────────────────────────────────────────────────────────┐
│ 👤 John Doe (john@icpac.net)                              │
│ 🔑 Role: user | 📅 Joined: Jan 15, 2024                  │
│ 📊 Bookings: 12 | 📈 Last Login: 2 days ago              │
│ [✏️ Edit] [🔄 Change Role] [❌ Deactivate] [📧 Email]     │
├────────────────────────────────────────────────────────────┤
│ 👤 Sarah Admin (sarah@icpac.net)                          │
│ 🔑 Role: room_admin | 📅 Joined: Dec 1, 2023             │
│ 📊 Manages: 2 rooms | 📈 Last Login: 1 hour ago          │
│ [✏️ Edit] [🔄 Change Role] [❌ Deactivate] [📧 Email]     │
└────────────────────────────────────────────────────────────┘
```

### C. Create New User
```
ADMIN CLICKS: [Create New User]

┌─────────────────────────────────────┐
│ 👤 CREATE NEW USER                  │
├─────────────────────────────────────┤
│ Email: [newuser@icpac.net]         │
│ First Name: [Michael]              │
│ Last Name: [Johnson]               │
│ Username: [mjohnson]               │
│ Department: [Finance]              │
│ Phone: [+254712345678]             │
│                                     │
│ 🔑 Role:                          │
│ ○ Super Admin                      │
│ ○ Room Admin                       │
│ ● Regular User                     │
│ ○ Procurement Officer              │
│                                     │
│ 📧 [✓] Send welcome email          │
│                                     │
│ [Cancel] [Create User] ✅           │
└─────────────────────────────────────┘

POST /api/auth/users/
{
  "email": "newuser@icpac.net",
  "first_name": "Michael",
  "role": "user",
  ...
}

✅ USER CREATED!
├── 📧 Welcome email sent
├── 🔑 Temporary password: temp123
└── 📝 User must change password on first login
```

## 4. SYSTEM REPORTS & ANALYTICS

### A. Executive Dashboard
```
GET /api/bookings/dashboard/stats/

📈 EXECUTIVE SUMMARY
├── 📊 Key Metrics (This Month)
│   ├── Total Bookings: 89
│   ├── Approval Rate: 94%
│   ├── Average Response Time: 2.3 hours
│   └── Room Utilization: 72%
├── 📈 Trends
│   ├── 📈 Bookings: +15% vs last month
│   ├── 📉 Rejections: -8% vs last month  
│   ├── 📈 New Users: +12% vs last month
│   └── 📈 Satisfaction: 4.8/5 rating
├── 🏆 Top Performers
│   ├── Most Popular Room: Conference Room A
│   ├── Power User: Sarah Smith (15 bookings)
│   └── Peak Day: Wednesdays (avg 12 bookings)
└── ⚠️ Issues & Recommendations
    ├── Training Room C underutilized
    ├── Need more morning slots
    └── Consider adding small meeting room
```

### B. Detailed Reports
```
📋 SYSTEM REPORTS
├── 📊 Booking Reports
│   ├── Monthly Booking Summary
│   ├── Room Utilization Report  
│   ├── User Activity Report
│   └── Peak Times Analysis
├── 👥 User Reports
│   ├── User Registration Trends
│   ├── Role Distribution
│   └── Login Activity Report
├── 💰 Financial Reports
│   ├── Procurement Order Summary
│   ├── Cost Center Analysis
│   └── Budget vs Actual
└── 🏢 Room Performance
    ├── Individual Room Stats
    ├── Amenity Usage Report
    └── Maintenance Schedule
```

## 5. SYSTEM SETTINGS & CONFIGURATION

### A. Global Settings
```
⚙️ SYSTEM CONFIGURATION
├── 📧 Email Settings
│   ├── SMTP Configuration
│   ├── Email Templates
│   └── Notification Rules
├── 📅 Booking Rules
│   ├── Max Advance Days: [30]
│   ├── Auto-Approval: [Disabled]
│   ├── Cancellation Window: [24 hours]
│   └── Reminder Settings
├── 🔐 Security Settings
│   ├── JWT Token Expiry: [1 hour]
│   ├── Password Policy
│   ├── Session Timeout: [8 hours]
│   └── Failed Login Attempts: [5]
└── 🎨 UI Customization
    ├── Company Logo
    ├── Color Theme
    └── Default Language
```

## Admin Action Permissions

### What Super Admin CAN Do:
✅ View ALL bookings system-wide
✅ Approve/reject ANY booking
✅ Create/edit/delete rooms
✅ Create/edit/delete users
✅ Change user roles
✅ View system-wide statistics
✅ Manage amenities
✅ Configure system settings
✅ Export reports
✅ Handle procurement orders

### Emergency Actions:
🚨 Force-cancel bookings
🚨 Override booking conflicts  
🚨 Bulk user operations
🚨 System maintenance mode
🚨 Data backup/restore

## Admin Notifications

### Real-time Admin Alerts:
```
🔔 ADMIN NOTIFICATIONS
├── 🟡 8 bookings await approval
├── 🔴 Room conflict detected
├── 🟢 New user registered
├── ⚪ System backup completed
└── 🟠 Procurement order urgent
```
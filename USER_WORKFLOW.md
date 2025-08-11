# 👤 REGULAR USER WORKFLOW

## Login Process
1. 🌐 Go to system URL
2. 📧 Enter: user@icpac.net
3. 🔑 Enter: user123
4. ✅ System validates and shows user dashboard

## Main Dashboard Features
```
📊 USER DASHBOARD
├── 📈 My Booking Statistics
│   ├── Total Bookings: X
│   ├── Approved: X  
│   ├── Pending: X
│   └── Rejected: X
├── 📅 Upcoming Bookings (Next 5)
├── 🕒 Recent Bookings (Last 10)
└── ➕ Quick Book Room Button
```

## Step-by-Step: Creating a Booking

### Step 1: Browse Available Rooms
```
GET /api/rooms/
🏢 User sees list of all active rooms:

┌─────────────────────────────────┐
│ 🏠 Conference Room A            │
│ 👥 Capacity: 20 people         │
│ 📍 Main Building, 2nd Floor    │
│ 🔧 Projector, Whiteboard, A/C  │
│ 📅 [Check Availability] [Book] │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 🏠 Meeting Room B               │
│ 👥 Capacity: 10 people         │
│ 📍 Annex Building, Ground      │
│ 🔧 TV Screen, Internet, A/C    │
│ 📅 [Check Availability] [Book] │
└─────────────────────────────────┘
```

### Step 2: Check Room Availability
```
POST /api/rooms/1/availability/
{
  "date": "2024-02-01",
  "start_time": "09:00:00",
  "end_time": "17:00:00"
}

Response:
┌─────────────────────────────────┐
│ 📅 Conference Room A - Feb 1    │
├─────────────────────────────────┤
│ ✅ Available Slots:             │
│ • 08:00 - 10:00 (2 hours)      │
│ • 11:30 - 14:00 (2.5 hours)    │
│ • 15:30 - 17:00 (1.5 hours)    │
├─────────────────────────────────┤
│ ❌ Booked Slots:                │
│ • 10:00 - 11:30 (Team Meeting) │
│ • 14:00 - 15:30 (Client Call)  │
└─────────────────────────────────┘
```

### Step 3: Fill Booking Form
```
┌─────────────────────────────────┐
│ 📝 NEW BOOKING REQUEST         │
├─────────────────────────────────┤
│ 🏠 Room: Conference Room A      │
│ 📅 Date: [2024-02-01]          │
│ 🕐 Start: [09:00] End: [10:00]  │
│ 📋 Purpose: [Weekly Team Meet]  │
│ 👥 Attendees: [8] people       │
│ 📝 Special Requirements:        │
│   [Need projector and coffee]   │
│                                 │
│ [Cancel] [Submit Booking] ✅    │
└─────────────────────────────────┘
```

### Step 4: System Validation
```
🔍 SYSTEM CHECKS:
├── ✅ Room exists and active
├── ✅ Date not in past  
├── ✅ Time slot available
├── ✅ Attendees ≤ room capacity (8 ≤ 20)
├── ✅ Within advance booking limit
└── ✅ No conflicts with other bookings

Result: ✅ BOOKING CREATED
Status: 🟡 PENDING APPROVAL
```

### Step 5: Booking Confirmation
```
┌─────────────────────────────────┐
│ 🎉 BOOKING SUBMITTED!           │
├─────────────────────────────────┤
│ 📋 Booking ID: #12345          │
│ 🏠 Room: Conference Room A      │
│ 📅 Date: Feb 1, 2024          │
│ 🕐 Time: 09:00 - 10:00        │
│ 📊 Status: Pending Approval    │
├─────────────────────────────────┤
│ 📧 Confirmation email sent     │
│ ⏰ Admin will review soon       │
│                                 │
│ [View My Bookings] [Book More]  │
└─────────────────────────────────┘
```

## My Bookings Management

### View All My Bookings
```
GET /api/bookings/my-bookings/

📅 MY BOOKINGS
├── 🔄 Upcoming Bookings
│   ├── Feb 1 - Weekly Team Meeting (🟡 Pending)
│   ├── Feb 5 - Project Review (✅ Approved)  
│   └── Feb 8 - Client Presentation (✅ Approved)
├── 📜 Recent History
│   ├── Jan 25 - Budget Meeting (✅ Completed)
│   ├── Jan 20 - Training Session (❌ Rejected)
│   └── Jan 15 - All Hands (✅ Completed)
└── 📊 My Statistics
    ├── Total: 15 bookings
    ├── Approved: 12
    ├── Pending: 2  
    └── Rejected: 1
```

### Booking Status Tracking
```
📋 BOOKING #12345 - Weekly Team Meeting
├── 📊 Status: 🟡 Pending Approval
├── 📅 Submitted: Jan 30, 2024 10:30 AM
├── ⏰ Last Updated: Jan 30, 2024 10:30 AM
├── 👤 Reviewed By: (Not yet assigned)
└── 📝 Admin Notes: (None yet)

Available Actions:
├── ✏️ [Edit Booking] (if still pending)
├── ❌ [Cancel Booking]
└── 📧 [Contact Admin]
```

## Booking Notifications

### Email Notifications User Receives:
```
📧 BOOKING SUBMITTED
Subject: Booking Request #12345 Submitted
Body: Your booking for Conference Room A has been submitted...

📧 BOOKING APPROVED  
Subject: Booking #12345 Approved ✅
Body: Great news! Your booking has been approved...

📧 BOOKING REJECTED
Subject: Booking #12345 Rejected ❌  
Body: Unfortunately, your booking was rejected...
Reason: Room needed for emergency meeting

📧 BOOKING REMINDER
Subject: Reminder: Meeting Tomorrow 📅
Body: Don't forget your upcoming meeting...
```

## User Restrictions

### What Users CAN Do:
✅ View all available rooms
✅ Check room availability  
✅ Create new bookings
✅ View their own bookings
✅ Edit pending bookings
✅ Cancel their bookings
✅ View their statistics

### What Users CANNOT Do:
❌ View other users' bookings
❌ Approve/reject any bookings  
❌ Manage rooms or amenities
❌ Access admin statistics
❌ Create/manage users
❌ Handle procurement orders

## Error Handling for Users

### Common User Errors:
```
❌ BOOKING CONFLICT
"This time slot conflicts with existing booking: Board Meeting"

❌ PAST DATE
"Cannot book rooms for past dates"

❌ CAPACITY EXCEEDED  
"Attendee count (25) exceeds room capacity (20)"

❌ TOO FAR AHEAD
"Cannot book more than 30 days in advance"

❌ INVALID TIME
"End time must be after start time"
```

## User Calendar Integration

### Calendar View
```
GET /api/bookings/calendar/events/

📅 MY CALENDAR VIEW
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7  │
│     │     │ 🟢  │     │ 🟡  │     │     │
│     │     │10AM │     │2PM  │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │
│ 🟢  │     │     │     │     │     │     │
│9AM  │     │     │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

Legend:
🟢 Approved Booking
🟡 Pending Booking  
🔴 Rejected Booking
```
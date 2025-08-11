# 💰 PROCUREMENT OFFICER WORKFLOW

## Login Process
1. 🌐 Go to system URL
2. 📧 Enter: procurement@icpac.net
3. 🔑 Enter: procurement123
4. ✅ System shows procurement dashboard

## Procurement Dashboard
```
💰 PROCUREMENT DASHBOARD
├── 📦 Active Orders (12)
│   ├── 🟡 Pending: 5 orders
│   ├── 🔄 In Progress: 4 orders
│   ├── 🚚 Ordered: 2 orders
│   └── ✅ Delivered: 1 order
├── 💵 Budget Summary
│   ├── This Month: $3,420
│   ├── Remaining Budget: $8,580
│   ├── Average Order: $285
│   └── Largest Order: $850
├── 🔔 Urgent Actions
│   ├── 2 orders need immediate approval
│   ├── 1 delivery confirmation needed
│   └── 3 quotes pending
└── 📊 Quick Stats
    ├── Orders This Week: 8
    ├── On-time Delivery: 94%
    └── Vendor Performance: 4.7/5
```

## Order Management Workflow

### A. View All Procurement Orders
```
GET /api/bookings/procurement-orders/

📦 ALL PROCUREMENT ORDERS
┌─────────────────────────────────────────────────────────┐
│ 🍽️ Order #PO-001 | Catering | $150.00                  │
│ 📋 For: Team Meeting (John Doe)                        │
│ 📅 Conference Room A | Feb 1, 09:00-10:00              │
│ 📝 Coffee, pastries for 8 people                       │
│ 🔥 Priority: High | 📊 Status: 🟡 Pending              │
│ [✅ Approve] [💰 Set Budget] [📝 Add Note] [👁️ View]   │
├─────────────────────────────────────────────────────────┤
│ 🔧 Order #PO-002 | Equipment | $420.00                 │
│ 📋 For: Client Presentation (Sarah Smith)              │
│ 📅 Boardroom | Feb 2, 14:00-16:00                     │
│ 📝 Wireless microphone system                          │
│ 🔥 Priority: Medium | 📊 Status: 🔄 Approved          │
│ [🚚 Mark Ordered] [📋 Track] [📝 Note] [👁️ View]       │
└─────────────────────────────────────────────────────────┘
```

### B. Order Approval Process
```
PROCUREMENT CLICKS: [✅ Approve] on Order #PO-001

┌─────────────────────────────────────┐
│ 💰 APPROVE PROCUREMENT ORDER         │
├─────────────────────────────────────┤
│ 📦 Order: #PO-001                  │
│ 🍽️ Type: Catering                 │
│ 💵 Estimated: $150.00              │
│                                     │
│ 💰 Final Budget: [$150.00]         │
│ 🏪 Vendor: [▼ Select Vendor]       │
│ 📅 Delivery Date: [Feb 1, 08:30]   │
│ 📝 Special Instructions:            │
│   [Deliver 30 min before meeting]  │
│                                     │
│ [Cancel] [Approve & Order] ✅       │
└─────────────────────────────────────┘

POST /api/bookings/procurement-orders/1/
{
  "status": "approved",
  "final_cost": 150.00,
  "vendor": "Catering Plus Ltd",
  "delivery_date": "2024-02-01T08:30:00"
}

✅ ORDER APPROVED!
├── 📧 Email sent to vendor
├── 📅 Delivery scheduled
├── 💰 Budget updated
└── 📝 Booking owner notified
```

### C. Order Status Management
```
📊 ORDER STATUS WORKFLOW

🟡 PENDING → 🔄 APPROVED → 🚚 ORDERED → 📦 DELIVERED

Each Status Actions:
├── 🟡 Pending:
│   ├── [✅ Approve] [❌ Reject] [💰 Adjust Budget]
│   └── [📝 Request More Info] [⏰ Set Priority]
├── 🔄 Approved:  
│   ├── [🚚 Mark as Ordered] [📋 Select Vendor]
│   └── [📅 Schedule Delivery] [💰 Update Cost]
├── 🚚 Ordered:
│   ├── [📋 Track Shipment] [📞 Contact Vendor]  
│   └── [📦 Confirm Delivery] [⚠️ Report Issue]
└── 📦 Delivered:
    ├── [✅ Quality Check] [💰 Process Payment]
    └── [⭐ Rate Vendor] [📝 Close Order]
```

## Vendor Management

### A. Vendor Dashboard
```
🏪 VENDOR MANAGEMENT
├── 🔝 Top Vendors
│   ├── Catering Plus Ltd (95% rating, 24 orders)
│   ├── Tech Equipment Co (92% rating, 18 orders)
│   ├── Office Supplies Inc (89% rating, 31 orders)
│   └── Event Decorators (87% rating, 12 orders)
├── 📊 Vendor Performance
│   ├── On-time Delivery Rate: 94%
│   ├── Quality Rating: 4.7/5
│   ├── Response Time: 2.3 hours avg
│   └── Cost Competitiveness: 8.5/10
└── 🔍 Find Vendors
    ├── By Category: [▼ All Categories]
    ├── By Location: [▼ All Areas]
    └── By Rating: [▼ 4+ Stars]
```

### B. Budget Management
```
💰 BUDGET DASHBOARD
├── 📊 Monthly Budget
│   ├── Allocated: $12,000
│   ├── Spent: $3,420 (28.5%)
│   ├── Committed: $1,850 (pending orders)
│   └── Available: $6,730 (56.1%)
├── 📈 Spending by Category
│   ├── 🍽️ Catering: $1,240 (36%)
│   ├── 🔧 Equipment: $980 (29%) 
│   ├── 📄 Supplies: $720 (21%)
│   ├── 🎨 Decoration: $320 (9%)
│   └── 🚗 Transport: $160 (5%)
├── ⚠️ Budget Alerts
│   ├── 🟡 Catering approaching limit (80% used)
│   ├── 🟢 Equipment well within budget
│   └── 🔴 Transport over budget (+$60)
└── 📋 Budget Actions
    ├── [💰 Request Budget Increase]
    ├── [📊 Generate Budget Report]
    └── [⚙️ Set Category Limits]
```

## Procurement Reports

### A. Executive Summary
```
📋 PROCUREMENT EXECUTIVE REPORT
├── 📊 Key Performance Indicators
│   ├── Orders Processed: 89 this month
│   ├── Average Processing Time: 4.2 hours
│   ├── Budget Utilization: 67%
│   ├── Vendor Satisfaction: 4.8/5
│   └── On-time Delivery: 94%
├── 💰 Cost Analysis
│   ├── Total Spend: $15,670 (last 30 days)
│   ├── Cost per Booking: $28.50 average
│   ├── Savings Achieved: $2,340 (bulk orders)
│   └── ROI on Procurement: 340%
├── 🏆 Top Performance
│   ├── Most Efficient Vendor: Catering Plus
│   ├── Fastest Delivery: Tech Equipment Co
│   ├── Best Value: Office Supplies Inc
│   └── Highest Quality: Event Decorators
└── 🎯 Recommendations
    ├── Negotiate better rates with top 3 vendors
    ├── Consider bulk catering contracts  
    ├── Evaluate new equipment suppliers
    └── Implement vendor performance bonuses
```

## Integration with Booking System

### A. Order Creation Flow
```
📅 BOOKING APPROVED → 💰 PROCUREMENT NEEDED

1. User creates booking: "Board Meeting for 15 people"
2. Booking gets approved by admin
3. User/Admin adds procurement request:
   
┌─────────────────────────────────────┐
│ 💰 ADD PROCUREMENT REQUEST          │
├─────────────────────────────────────┤
│ 📅 Linked Booking: Board Meeting   │
│ 🏠 Room: Boardroom                 │
│ 👥 Attendees: 15 people            │
│                                     │
│ 🍽️ Order Type: [▼ Catering]       │
│ 📝 Description:                    │
│   [Breakfast: coffee, pastries,    │
│    fruits for 15 people. Premium   │
│    service for board members.]     │
│                                     │
│ 💵 Est. Cost: [$350.00]           │
│ 🔥 Priority: [▼ High]             │
│                                     │
│ [Cancel] [Submit Request] ✅        │
└─────────────────────────────────────┘

4. Procurement officer gets notification
5. Reviews and processes the order
6. Updates booking with procurement status
```

## Procurement Officer Permissions

### What Procurement Officer CAN Do:
✅ View all procurement orders system-wide
✅ Approve/reject procurement requests
✅ Manage vendors and contracts
✅ Set budgets and spending limits
✅ Generate procurement reports
✅ Track order delivery status
✅ Rate vendor performance
✅ Communicate with vendors

### What Procurement Officer CANNOT Do:
❌ Approve/reject room bookings
❌ Manage users or rooms
❌ Access booking system admin features
❌ Change user roles
❌ View detailed booking information (only procurement-related)

## Notifications & Alerts

### Procurement Officer Receives:
```
🔔 PROCUREMENT NOTIFICATIONS
├── 📦 New order request submitted
├── ⏰ Order delivery due in 2 hours
├── 💰 Budget threshold reached (80%)
├── ⭐ Vendor rating request
├── 🚨 Order delivery delayed
└── 💳 Payment approval needed
```
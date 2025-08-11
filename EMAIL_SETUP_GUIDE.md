# 📧 Email Notifications Setup Guide

The ICPAC booking system currently shows email notifications on screen but **does not send real emails**. Here's how to activate real email sending:

## 🚀 Option 1: EmailJS (Recommended - Easiest)

### Step 1: Create EmailJS Account
1. Go to [https://www.emailjs.com](https://www.emailjs.com)
2. Sign up for a free account
3. Create a new email service (Gmail, Outlook, etc.)

### Step 2: Create Email Templates
Create these templates in your EmailJS dashboard:

#### Template 1: Booking Confirmation
- **Template ID**: `template_booking_confirm`
- **Subject**: `Booking Confirmed: {{meeting_title}}`
- **Body**:
```
Hi {{to_name}},

Your booking has been confirmed!

📅 Meeting: {{meeting_title}}
👤 Organizer: {{organizer}}
🏢 Room: {{room_name}}
📆 Date: {{booking_date}}
⏰ Time: {{booking_time}}
⏱️ Duration: {{duration}}
👥 Attendees: {{attendee_count}}

Status: {{approval_status}}

Best regards,
ICPAC Booking System
```

#### Template 2: Booking Approval
- **Template ID**: `template_booking_approval`
- **Subject**: `✅ Booking Approved: {{meeting_title}}`
- **Body**:
```
Hi {{to_name}},

Great news! Your booking has been APPROVED.

📅 Meeting: {{meeting_title}}
🏢 Room: {{room_name}}
📆 Date: {{booking_date}}
⏰ Time: {{booking_time}}
✅ Approved by: {{approved_by}}
📝 Approved at: {{approved_at}}

Your meeting is now confirmed and ready to go!

Best regards,
ICPAC Booking System
```

#### Template 3: Booking Rejection
- **Template ID**: `template_booking_rejection`
- **Subject**: `❌ Booking Declined: {{meeting_title}}`
- **Body**:
```
Hi {{to_name}},

Unfortunately, your booking has been declined.

📅 Meeting: {{meeting_title}}
🏢 Room: {{room_name}}
📆 Date: {{booking_datetime}}
❌ Declined by: {{rejected_by}}
📝 Reason: {{rejection_reason}}

Please contact the administrator if you have questions.

Best regards,
ICPAC Booking System
```

#### Template 4: Admin Notification
- **Template ID**: `template_admin_notify`
- **Subject**: `🔔 New Booking Requires Approval: {{meeting_title}}`

#### Template 5: Meeting Reminder
- **Template ID**: `template_meeting_reminder`
- **Subject**: `⏰ Meeting Reminder: {{meeting_title}} in 30 minutes`

### Step 3: Configure Environment Variables
Create a `.env` file in your project root:

```bash
# EmailJS Configuration
REACT_APP_EMAILJS_SERVICE_ID=your_service_id_here
REACT_APP_EMAILJS_PUBLIC_KEY=your_public_key_here

# Template IDs
REACT_APP_EMAILJS_TEMPLATE_CONFIRMATION=template_booking_confirm
REACT_APP_EMAILJS_TEMPLATE_APPROVAL=template_booking_approval
REACT_APP_EMAILJS_TEMPLATE_REJECTION=template_booking_rejection
REACT_APP_EMAILJS_TEMPLATE_ADMIN=template_admin_notify
REACT_APP_EMAILJS_TEMPLATE_REMINDER=template_meeting_reminder
REACT_APP_EMAILJS_TEMPLATE_CANCEL=template_booking_cancel
REACT_APP_EMAILJS_TEMPLATE_UPDATE=template_booking_update
```

### Step 4: Restart Application
```bash
npm start
```

## 🏢 Option 2: Enterprise SMTP Server

If ICPAC has an internal email server, contact your IT department for:
- SMTP server details
- Authentication credentials
- Allowed sender domains

## 🛡️ Option 3: Professional Email Service (Production)

For production deployment, consider:
- **SendGrid**: Professional email delivery
- **Mailgun**: Developer-focused email API  
- **AWS SES**: Amazon's email service
- **Microsoft Graph API**: If using Office 365

## 🔧 Current Status

**What works now:**
- ✅ Email notifications appear on screen
- ✅ Email content is logged to browser console
- ✅ All notification triggers are functional

**What needs configuration:**
- ❌ Actual email sending to user inboxes
- ❌ Environment variables setup
- ❌ Email templates creation

## 🧪 Testing

Once configured, test with:
1. Create a booking → Check for confirmation email
2. Admin approves booking → Check for approval email
3. Admin rejects booking → Check for rejection email

## ⚠️ Important Notes

1. **Free EmailJS account**: Limited to 200 emails/month
2. **Domain verification**: May be required for production
3. **Spam filters**: Test with multiple email providers
4. **GDPR compliance**: Ensure user consent for email notifications

## 🆘 Need Help?

If you need assistance setting this up:
1. Contact your IT administrator
2. Share this guide with them
3. Test in development environment first

The system is **ready** for real emails - it just needs the email service configuration!
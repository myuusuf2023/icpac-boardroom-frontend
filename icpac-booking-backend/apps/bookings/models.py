"""
Booking models for ICPAC Booking System
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, time, timedelta

User = get_user_model()


class Booking(models.Model):
    """
    Main booking model for room reservations
    """
    BOOKING_TYPE_CHOICES = [
        ('hourly', 'Hourly'),
        ('full_day', 'Full Day'),
        ('multi_day', 'Multi Day'),
        ('weekly', 'Weekly'),
    ]
    
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Basic booking information
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text='Room being booked'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bookings',
        help_text='User making the booking'
    )
    
    purpose = models.CharField(
        max_length=255,
        help_text='Meeting/event purpose or title'
    )
    
    special_requirements = models.TextField(
        blank=True,
        help_text='Special requirements or notes'
    )
    
    # Date and time information
    start_date = models.DateField(help_text='Start date of booking')
    end_date = models.DateField(help_text='End date of booking')
    start_time = models.TimeField(help_text='Start time')
    end_time = models.TimeField(help_text='End time')
    
    # Booking configuration
    booking_type = models.CharField(
        max_length=20,
        choices=BOOKING_TYPE_CHOICES,
        default='hourly',
        help_text='Type of booking'
    )
    
    expected_attendees = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text='Expected number of attendees'
    )
    
    # Approval workflow
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default='pending',
        help_text='Booking approval status'
    )
    
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_bookings',
        help_text='Admin who approved/rejected the booking'
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the booking was approved/rejected'
    )
    
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection if booking was rejected'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings'
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']
        
        # Prevent double booking (same room, overlapping times)
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_date__lte=models.F('end_date')),
                name='check_start_date_before_end_date'
            ),
        ]
    
    def __str__(self):
        return f"{self.purpose} - {self.room.name} ({self.start_date})"
    
    def clean(self):
        """Validate booking data"""
        errors = {}
        
        # Validate dates
        if self.start_date and self.end_date and self.start_date > self.end_date:
            errors['end_date'] = 'End date must be after start date.'
        
        # Validate times
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            errors['end_time'] = 'End time must be after start time.'
        
        # Check if booking is in the past
        if self.start_date and self.start_date < timezone.now().date():
            errors['start_date'] = 'Cannot book in the past.'
        
        if self.start_date == timezone.now().date():
            current_time = timezone.now().time()
            if self.start_time <= current_time:
                errors['start_time'] = 'Cannot book in the past.'
        
        # Check attendee count doesn't exceed room capacity
        if self.room and self.expected_attendees > self.room.capacity:
            errors['expected_attendees'] = f'Attendee count ({self.expected_attendees}) exceeds room capacity ({self.room.capacity}).'
        
        # Check for overlapping bookings (only for approved/pending bookings)
        if self.room:
            overlapping = Booking.objects.filter(
                room=self.room,
                approval_status__in=['pending', 'approved'],
                start_date__lte=self.end_date,
                end_date__gte=self.start_date,
            ).exclude(pk=self.pk if self.pk else None)
            
            # Check time overlap for same dates
            for booking in overlapping:
                if (self.start_date <= booking.end_date and self.end_date >= booking.start_date):
                    # Same day, check time overlap
                    if (self.start_time < booking.end_time and self.end_time > booking.start_time):
                        errors['start_time'] = f'Time slot conflicts with existing booking: {booking.purpose}'
                        break
        
        if errors:
            raise ValidationError(errors)
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_duration_hours(self):
        """Calculate booking duration in hours"""
        if self.start_time and self.end_time:
            start_datetime = datetime.combine(self.start_date, self.start_time)
            end_datetime = datetime.combine(self.end_date, self.end_time)
            duration = end_datetime - start_datetime
            return duration.total_seconds() / 3600
        return 0
    
    @property
    def duration_hours(self):
        """Calculate booking duration in hours"""
        return self.get_duration_hours()
    
    @property
    def duration_days(self):
        """Calculate booking duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 1
    
    @property
    def is_approved(self):
        """Check if booking is approved"""
        return self.approval_status == 'approved'
    
    @property
    def is_pending(self):
        """Check if booking is pending approval"""
        return self.approval_status == 'pending'
    
    @property
    def is_rejected(self):
        """Check if booking is rejected"""
        return self.approval_status == 'rejected'
    
    @property
    def is_in_progress(self):
        """Check if booking is currently in progress"""
        if not self.is_approved:
            return False
            
        now = timezone.now()
        current_date = now.date()
        current_time = now.time()
        
        return (
            self.start_date <= current_date <= self.end_date and
            self.start_time <= current_time <= self.end_time
        )
    
    @property
    def is_upcoming(self):
        """Check if booking is upcoming"""
        if not self.is_approved:
            return False
            
        now = timezone.now()
        start_datetime = datetime.combine(self.start_date, self.start_time)
        start_datetime = timezone.make_aware(start_datetime)
        
        return start_datetime > now
    
    @property
    def is_completed(self):
        """Check if booking is completed"""
        now = timezone.now()
        end_datetime = datetime.combine(self.end_date, self.end_time)
        end_datetime = timezone.make_aware(end_datetime)
        
        return end_datetime < now
    
    def approve(self, approved_by_user):
        """Approve the booking"""
        self.approval_status = 'approved'
        self.approved_by = approved_by_user
        self.approved_at = timezone.now()
        self.rejection_reason = ''
        self.save()
    
    def reject(self, rejected_by_user, reason=''):
        """Reject the booking"""
        self.approval_status = 'rejected'
        self.approved_by = rejected_by_user
        self.approved_at = timezone.now()
        self.rejection_reason = reason
        self.save()
    
    def can_be_modified_by(self, user):
        """Check if user can modify this booking"""
        # Super admin can modify any booking
        if user.role == 'super_admin':
            return True
        
        # Room admin can modify bookings for their rooms
        if user.role == 'room_admin':
            return True
        
        # User can modify their own bookings (pending or approved)
        if self.user == user and self.approval_status in ['pending', 'approved']:
            return True
        
        return False
    
    def can_approve_booking(self, user):
        """Check if user can approve this booking"""
        # Only pending bookings can be approved
        if not self.is_pending:
            return False
        
        # Super admin can approve any booking
        if user.role == 'super_admin':
            return True
        
        # Room admin can approve bookings for their rooms
        if user.role == 'room_admin':
            return True
        
        return False


class BookingNote(models.Model):
    """
    Notes/comments on bookings for communication between users and admins
    """
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    note = models.TextField()
    is_internal = models.BooleanField(
        default=False,
        help_text='Internal notes visible only to admins'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'booking_notes'
        ordering = ['created_at']
    
    def __str__(self):
        return f"Note for {self.booking.purpose} by {self.user.get_full_name()}"


class ProcurementOrder(models.Model):
    """
    Procurement orders for booking-related purchases
    """
    ORDER_TYPE_CHOICES = [
        ('catering', 'Catering'),
        ('equipment', 'Equipment'),
        ('supplies', 'Office Supplies'),
        ('decoration', 'Decoration'),
        ('transport', 'Transportation'),
        ('other', 'Other'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('ordered', 'Ordered'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='procurement_orders',
        help_text='Related booking'
    )
    
    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        default='other',
        help_text='Type of procurement order'
    )
    
    items_description = models.TextField(
        help_text='Detailed description of items to be procured'
    )
    
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Estimated cost in local currency'
    )
    
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text='Order priority level'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Order processing status'
    )
    
    notes = models.TextField(
        blank=True,
        help_text='Additional notes or requirements'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_procurement_orders',
        help_text='User who created this order'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'procurement_orders'
        verbose_name = 'Procurement Order'
        verbose_name_plural = 'Procurement Orders'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Procurement Order #{self.id} - {self.get_order_type_display()} for {self.booking.purpose}"
"""
Room models for ICPAC Booking System
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Room(models.Model):
    """
    Room model representing meeting rooms, conference rooms, etc.
    """
    CATEGORY_CHOICES = [
        ('conference_room', 'Conference Room'),
        ('meeting_room', 'Meeting Room'),
        ('boardroom', 'Boardroom'),
        ('training_room', 'Training Room'),
        ('event_hall', 'Event Hall'),
        ('auditorium', 'Auditorium'),
    ]
    
    name = models.CharField(
        max_length=255,
        help_text='Room name (e.g., "Conference Room A - Main Building")'
    )
    
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(1000)],
        help_text='Maximum number of people the room can accommodate'
    )
    
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        help_text='Type/category of the room'
    )
    
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text='Physical location of the room (building, floor, etc.)'
    )
    
    description = models.TextField(
        blank=True,
        help_text='Detailed description of the room'
    )
    
    # JSON field to store amenities list
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text='List of available amenities (projector, whiteboard, etc.)'
    )
    
    # Room image
    image = models.ImageField(
        upload_to='rooms/',
        blank=True,
        null=True,
        help_text='Room photo'
    )
    
    # Room availability
    is_active = models.BooleanField(
        default=True,
        help_text='Whether the room is available for booking'
    )
    
    # Booking settings
    advance_booking_days = models.PositiveIntegerField(
        default=30,
        help_text='How many days in advance room can be booked'
    )
    
    min_booking_duration = models.PositiveIntegerField(
        default=1,
        help_text='Minimum booking duration in hours'
    )
    
    max_booking_duration = models.PositiveIntegerField(
        default=8,
        help_text='Maximum booking duration in hours'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'rooms'
        verbose_name = 'Room'
        verbose_name_plural = 'Rooms'
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} (Capacity: {self.capacity})"
    
    @property
    def category_display(self):
        """Get the display name for category"""
        return dict(self.CATEGORY_CHOICES).get(self.category, self.category)
    
    @property
    def is_large_room(self):
        """Check if room has large capacity (>50 people)"""
        return self.capacity > 50
    
    def get_amenities_list(self):
        """Get amenities as a formatted list"""
        if isinstance(self.amenities, list):
            return self.amenities
        return []
    
    def has_amenity(self, amenity):
        """Check if room has a specific amenity"""
        amenities = self.get_amenities_list()
        return amenity.lower() in [a.lower() for a in amenities]
    
    def is_available_for_booking(self):
        """Check if room is available for booking"""
        return self.is_active
    
    def get_bookings_for_date(self, date):
        """Get all bookings for a specific date"""
        from apps.bookings.models import Booking
        return Booking.objects.filter(
            room=self,
            start_date__lte=date,
            end_date__gte=date,
            approval_status__in=['pending', 'approved']
        ).order_by('start_time')


class RoomAmenity(models.Model):
    """
    Predefined room amenities for consistency
    """
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True, help_text='Emoji or icon code')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'room_amenities'
        verbose_name = 'Room Amenity'
        verbose_name_plural = 'Room Amenities'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_default_amenities(cls):
        """Get list of default amenities"""
        defaults = [
            {'name': 'Projector', 'icon': '📽️', 'description': 'Digital projector for presentations'},
            {'name': 'Whiteboard', 'icon': '📝', 'description': 'Whiteboard with markers'},
            {'name': 'Video Conferencing', 'icon': '📹', 'description': 'Video conference setup'},
            {'name': 'Audio System', 'icon': '🎤', 'description': 'Sound system with microphones'},
            {'name': 'TV Screen', 'icon': '📺', 'description': 'Large TV screen'},
            {'name': 'Screen', 'icon': '🖥️', 'description': 'Projection screen'},
            {'name': 'Computers', 'icon': '💻', 'description': 'Computer workstations'},
            {'name': 'Internet Access', 'icon': '🌐', 'description': 'WiFi internet access'},
            {'name': 'Printers', 'icon': '🖨️', 'description': 'Printing facilities'},
            {'name': 'Air Conditioning', 'icon': '❄️', 'description': 'Climate control'},
            {'name': 'Natural Light', 'icon': '☀️', 'description': 'Windows with natural lighting'},
            {'name': 'Catering Setup', 'icon': '🍽️', 'description': 'Setup for food and beverages'},
        ]
        return defaults
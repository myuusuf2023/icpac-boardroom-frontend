"""
Custom User model for ICPAC Booking System
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model with role-based permissions for ICPAC
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('room_admin', 'Room Admin'),
        ('super_admin', 'Super Admin'),
        ('procurement_officer', 'Procurement Officer'),
    ]
    
    # Override email to be unique and required
    email = models.EmailField(unique=True)
    
    # Additional fields
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='user',
        help_text='User role determines access permissions'
    )
    
    phone_number = models.CharField(
        max_length=15, 
        blank=True,
        help_text='Contact phone number'
    )
    
    department = models.CharField(
        max_length=100, 
        blank=True,
        help_text='User department at ICPAC'
    )
    
    # Many-to-many relationship with rooms (for room admins)
    managed_rooms = models.ManyToManyField(
        'rooms.Room', 
        blank=True, 
        related_name='admins',
        help_text='Rooms this user can manage (for room admins)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email as the primary identifier
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'auth_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    @property
    def is_super_admin(self):
        """Check if user is super admin"""
        return self.role == 'super_admin'
    
    @property
    def is_room_admin(self):
        """Check if user is room admin"""
        return self.role == 'room_admin'
    
    @property
    def is_procurement_officer(self):
        """Check if user is procurement officer"""
        return self.role == 'procurement_officer'
    
    def can_manage_room(self, room):
        """Check if user can manage a specific room"""
        if self.is_super_admin:
            return True
        if self.is_room_admin:
            return self.managed_rooms.filter(id=room.id).exists()
        return False
    
    def can_approve_booking(self, booking):
        """Check if user can approve a booking"""
        if self.is_super_admin:
            return True
        if self.is_room_admin:
            return self.managed_rooms.filter(id=booking.room.id).exists()
        return False
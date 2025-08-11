"""
Booking serializers for ICPAC Booking System
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Booking, ProcurementOrder
from apps.rooms.models import Room
from django.contrib.auth import get_user_model

User = get_user_model()


class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for bookings
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    duration_hours = serializers.SerializerMethodField()
    can_modify = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'room', 'room_name', 'user', 'user_name',
            'start_date', 'end_date', 'start_time', 'end_time',
            'purpose', 'expected_attendees', 'special_requirements',
            'approval_status', 'approval_status_display', 'approved_by',
            'approved_at', 'rejection_reason', 'duration_hours',
            'can_modify', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'approval_status', 'approved_by', 'approved_at',
            'rejection_reason', 'created_at', 'updated_at'
        ]
    
    def get_duration_hours(self, obj):
        """Get booking duration in hours"""
        return obj.get_duration_hours()
    
    def get_can_modify(self, obj):
        """Check if current user can modify this booking"""
        request = self.context.get('request')
        if request and request.user:
            return obj.can_be_modified_by(request.user)
        return False
    
    def validate(self, attrs):
        """Validate booking data"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date', start_date)
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        room = attrs.get('room')
        expected_attendees = attrs.get('expected_attendees', 1)
        
        # Basic date/time validation
        if start_date < timezone.now().date():
            raise serializers.ValidationError({
                'start_date': 'Cannot book rooms for past dates.'
            })
        
        if end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date cannot be before start date.'
            })
        
        if start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        
        # Room capacity validation
        if room and expected_attendees > room.capacity:
            raise serializers.ValidationError({
                'expected_attendees': f'Number of attendees ({expected_attendees}) exceeds room capacity ({room.capacity}).'
            })
        
        # Advance booking validation
        if room:
            max_advance_days = room.advance_booking_days
            max_booking_date = timezone.now().date() + timedelta(days=max_advance_days)
            if start_date > max_booking_date:
                raise serializers.ValidationError({
                    'start_date': f'Cannot book more than {max_advance_days} days in advance.'
                })
        
        # Duration validation
        duration = datetime.combine(start_date, end_time) - datetime.combine(start_date, start_time)
        duration_hours = duration.total_seconds() / 3600
        
        if room:
            if duration_hours < room.min_booking_duration:
                raise serializers.ValidationError({
                    'end_time': f'Minimum booking duration is {room.min_booking_duration} hours.'
                })
            
            if duration_hours > room.max_booking_duration:
                raise serializers.ValidationError({
                    'end_time': f'Maximum booking duration is {room.max_booking_duration} hours.'
                })
        
        # Check for overlapping bookings
        if room:
            overlapping_bookings = Booking.objects.filter(
                room=room,
                approval_status__in=['approved', 'pending'],
                start_date__lte=end_date,
                end_date__gte=start_date,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            # Exclude current instance if updating
            if self.instance:
                overlapping_bookings = overlapping_bookings.exclude(pk=self.instance.pk)
            
            if overlapping_bookings.exists():
                raise serializers.ValidationError({
                    'non_field_errors': 'This time slot conflicts with an existing booking.'
                })
        
        return attrs


class BookingListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for booking listings
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'room_name', 'user_name', 'start_date', 'end_date',
            'start_time', 'end_time', 'purpose', 'expected_attendees',
            'approval_status', 'approval_status_display'
        ]


class BookingCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating bookings
    """
    class Meta:
        model = Booking
        fields = [
            'room', 'start_date', 'end_date', 'start_time', 'end_time',
            'purpose', 'expected_attendees', 'special_requirements'
        ]
    
    def validate(self, attrs):
        """Validate booking data"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date', start_date)
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        room = attrs.get('room')
        expected_attendees = attrs.get('expected_attendees', 1)
        
        # Basic validations
        if start_date < timezone.now().date():
            raise serializers.ValidationError({
                'start_date': 'Cannot book rooms for past dates.'
            })
        
        if end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date cannot be before start date.'
            })
        
        if start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        
        # Room validation
        if room and not room.is_active:
            raise serializers.ValidationError({
                'room': 'This room is currently unavailable.'
            })
        
        if room and expected_attendees > room.capacity:
            raise serializers.ValidationError({
                'expected_attendees': f'Exceeds room capacity ({room.capacity}).'
            })
        
        # Check overlapping bookings
        if room:
            overlapping = Booking.objects.filter(
                room=room,
                approval_status__in=['approved', 'pending'],
                start_date__lte=end_date,
                end_date__gte=start_date,
                start_time__lt=end_time,
                end_time__gt=start_time
            )
            
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)
            
            if overlapping.exists():
                raise serializers.ValidationError({
                    'non_field_errors': 'Time slot is already booked.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create booking with current user"""
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class BookingApprovalSerializer(serializers.Serializer):
    """
    Serializer for booking approval/rejection
    """
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text='Required when rejecting a booking'
    )
    
    def validate(self, attrs):
        action = attrs.get('action')
        rejection_reason = attrs.get('rejection_reason', '').strip()
        
        if action == 'reject' and not rejection_reason:
            raise serializers.ValidationError({
                'rejection_reason': 'Rejection reason is required when rejecting a booking.'
            })
        
        return attrs


class ProcurementOrderSerializer(serializers.ModelSerializer):
    """
    Serializer for procurement orders
    """
    booking_details = BookingListSerializer(source='booking', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ProcurementOrder
        fields = [
            'id', 'booking', 'booking_details', 'order_type', 'items_description',
            'estimated_cost', 'priority', 'status', 'status_display',
            'notes', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def validate_estimated_cost(self, value):
        """Validate estimated cost"""
        if value <= 0:
            raise serializers.ValidationError('Estimated cost must be greater than zero.')
        return value


class ProcurementOrderCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating procurement orders
    """
    class Meta:
        model = ProcurementOrder
        fields = [
            'booking', 'order_type', 'items_description',
            'estimated_cost', 'priority', 'notes'
        ]
    
    def validate_booking(self, value):
        """Validate booking"""
        request = self.context.get('request')
        
        # Check if booking exists and is approved
        if value.approval_status != 'approved':
            raise serializers.ValidationError('Can only create orders for approved bookings.')
        
        # Check if user has permission to create orders for this booking
        if (request.user != value.user and 
            request.user.role not in ['super_admin', 'room_admin', 'procurement_officer']):
            raise serializers.ValidationError('You can only create orders for your own bookings.')
        
        return value
    
    def create(self, validated_data):
        """Create order with current user"""
        request = self.context.get('request')
        validated_data['created_by'] = request.user
        return super().create(validated_data)


class BookingStatsSerializer(serializers.Serializer):
    """
    Serializer for booking statistics
    """
    total_bookings = serializers.IntegerField()
    approved_bookings = serializers.IntegerField()
    pending_bookings = serializers.IntegerField()
    rejected_bookings = serializers.IntegerField()
    cancelled_bookings = serializers.IntegerField()
    most_popular_room = serializers.CharField()
    busiest_day = serializers.CharField()
    average_duration = serializers.FloatField()
    
    
class DashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for dashboard statistics
    """
    user_bookings = BookingStatsSerializer()
    system_stats = serializers.DictField(required=False)
    recent_bookings = BookingListSerializer(many=True)
    upcoming_bookings = BookingListSerializer(many=True)
"""
Booking views for ICPAC Booking System
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Avg
from datetime import datetime, timedelta
from .models import Booking, ProcurementOrder
from .serializers import (
    BookingSerializer,
    BookingListSerializer,
    BookingCreateUpdateSerializer,
    BookingApprovalSerializer,
    ProcurementOrderSerializer,
    ProcurementOrderCreateSerializer,
    BookingStatsSerializer,
    DashboardStatsSerializer
)


class BookingListView(generics.ListCreateAPIView):
    """
    List all bookings or create a new booking
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BookingCreateUpdateSerializer
        return BookingListSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.all().order_by('-created_at')
        
        # Filter based on user role
        if user.role == 'super_admin':
            # Super admin can see all bookings
            pass
        elif user.role == 'room_admin':
            # Room admin can see bookings for their managed rooms
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            queryset = queryset.filter(
                Q(room_id__in=managed_room_ids) | Q(user=user)
            )
        else:
            # Regular users can only see their own bookings
            queryset = queryset.filter(user=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(approval_status=status_filter)
        
        room_id = self.request.query_params.get('room')
        if room_id:
            try:
                queryset = queryset.filter(room_id=int(room_id))
            except ValueError:
                pass
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(start_date__gte=date_from)
            except ValueError:
                pass
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(end_date__lte=date_to)
            except ValueError:
                pass
        
        return queryset


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a booking
    """
    queryset = Booking.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return BookingCreateUpdateSerializer
        return BookingSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'super_admin':
            return Booking.objects.all()
        elif user.role == 'room_admin':
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            return Booking.objects.filter(
                Q(room_id__in=managed_room_ids) | Q(user=user)
            )
        else:
            return Booking.objects.filter(user=user)
    
    def perform_update(self, serializer):
        booking = self.get_object()
        
        # Check if user can modify this booking
        if not booking.can_be_modified_by(self.request.user):
            raise permissions.PermissionDenied('You cannot modify this booking.')
        
        # Reset approval status if booking is modified
        if booking.approval_status == 'approved':
            serializer.save(
                approval_status='pending',
                approved_by=None,
                approved_at=None,
                rejection_reason=''
            )
        else:
            serializer.save()
    
    def perform_destroy(self, instance):
        # Check if user can delete this booking
        if not instance.can_be_modified_by(self.request.user):
            raise permissions.PermissionDenied('You cannot delete this booking.')
        
        # Soft delete - mark as cancelled
        instance.approval_status = 'cancelled'
        instance.save()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def approve_reject_booking(request, booking_id):
    """
    Approve or reject a booking
    """
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Booking not found.'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check permissions
    if not booking.can_approve_booking(request.user):
        raise permissions.PermissionDenied('You do not have permission to approve/reject this booking.')
    
    serializer = BookingApprovalSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    action = serializer.validated_data['action']
    rejection_reason = serializer.validated_data.get('rejection_reason', '')
    
    if action == 'approve':
        booking.approve(request.user)
        message = f'Booking approved successfully.'
    else:
        booking.reject(request.user, rejection_reason)
        message = f'Booking rejected successfully.'
    
    return Response({
        'message': message,
        'booking': BookingSerializer(booking).data
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_bookings(request):
    """
    Get current user's bookings
    """
    user = request.user
    
    # Get upcoming bookings
    upcoming = Booking.objects.filter(
        user=user,
        start_date__gte=timezone.now().date()
    ).order_by('start_date', 'start_time')[:5]
    
    # Get recent bookings
    recent = Booking.objects.filter(user=user).order_by('-created_at')[:10]
    
    # Get statistics
    total = Booking.objects.filter(user=user).count()
    approved = Booking.objects.filter(user=user, approval_status='approved').count()
    pending = Booking.objects.filter(user=user, approval_status='pending').count()
    
    return Response({
        'upcoming_bookings': BookingListSerializer(upcoming, many=True).data,
        'recent_bookings': BookingListSerializer(recent, many=True).data,
        'statistics': {
            'total_bookings': total,
            'approved_bookings': approved,
            'pending_bookings': pending
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pending_approvals(request):
    """
    Get bookings pending approval (admin only)
    """
    user = request.user
    
    if user.role not in ['super_admin', 'room_admin']:
        raise permissions.PermissionDenied('Only admins can view pending approvals.')
    
    # Get pending bookings based on user role
    if user.role == 'super_admin':
        pending_bookings = Booking.objects.filter(approval_status='pending')
    else:
        # Room admin can only see bookings for their managed rooms
        managed_room_ids = user.managed_rooms.values_list('id', flat=True)
        pending_bookings = Booking.objects.filter(
            approval_status='pending',
            room_id__in=managed_room_ids
        )
    
    pending_bookings = pending_bookings.order_by('created_at')
    
    return Response({
        'pending_bookings': BookingSerializer(pending_bookings, many=True).data,
        'count': pending_bookings.count()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def booking_dashboard_stats(request):
    """
    Get booking dashboard statistics
    """
    user = request.user
    
    # Base queryset based on user role
    if user.role == 'super_admin':
        all_bookings = Booking.objects.all()
    elif user.role == 'room_admin':
        managed_room_ids = user.managed_rooms.values_list('id', flat=True)
        all_bookings = Booking.objects.filter(room_id__in=managed_room_ids)
    else:
        all_bookings = Booking.objects.filter(user=user)
    
    # Get date range (default: last 30 days)
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    
    recent_bookings = all_bookings.filter(
        start_date__range=[start_date, end_date]
    )
    
    # Calculate statistics
    stats = {
        'total_bookings': all_bookings.count(),
        'recent_bookings_count': recent_bookings.count(),
        'approved_bookings': all_bookings.filter(approval_status='approved').count(),
        'pending_bookings': all_bookings.filter(approval_status='pending').count(),
        'rejected_bookings': all_bookings.filter(approval_status='rejected').count(),
    }
    
    # Add admin-specific stats
    if user.role in ['super_admin', 'room_admin']:
        today = timezone.now().date()
        
        stats.update({
            'todays_bookings': all_bookings.filter(
                start_date=today,
                approval_status='approved'
            ).count(),
            'this_week_bookings': all_bookings.filter(
                start_date__range=[today, today + timedelta(days=7)],
                approval_status='approved'
            ).count(),
        })
        
        # Most popular room
        popular_room = all_bookings.filter(
            approval_status='approved'
        ).values('room__name').annotate(
            count=Count('id')
        ).order_by('-count').first()
        
        stats['most_popular_room'] = popular_room['room__name'] if popular_room else 'N/A'
    
    # Recent bookings for timeline
    recent_list = recent_bookings.order_by('-created_at')[:10]
    
    return Response({
        'statistics': stats,
        'recent_bookings': BookingListSerializer(recent_list, many=True).data,
        'date_range': {
            'start_date': start_date,
            'end_date': end_date
        }
    })


# Procurement Order Views

class ProcurementOrderListView(generics.ListCreateAPIView):
    """
    List all procurement orders or create a new one
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProcurementOrderCreateSerializer
        return ProcurementOrderSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['super_admin', 'procurement_officer']:
            return ProcurementOrder.objects.all().order_by('-created_at')
        elif user.role == 'room_admin':
            # Room admin can see orders for bookings in their managed rooms
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            return ProcurementOrder.objects.filter(
                Q(booking__room_id__in=managed_room_ids) | Q(created_by=user)
            ).order_by('-created_at')
        else:
            # Regular users can see their own orders
            return ProcurementOrder.objects.filter(
                Q(created_by=user) | Q(booking__user=user)
            ).order_by('-created_at')


class ProcurementOrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a procurement order
    """
    queryset = ProcurementOrder.objects.all()
    serializer_class = ProcurementOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['super_admin', 'procurement_officer']:
            return ProcurementOrder.objects.all()
        elif user.role == 'room_admin':
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            return ProcurementOrder.objects.filter(
                Q(booking__room_id__in=managed_room_ids) | Q(created_by=user)
            )
        else:
            return ProcurementOrder.objects.filter(
                Q(created_by=user) | Q(booking__user=user)
            )
    
    def perform_update(self, serializer):
        # Only procurement officers and super admin can update order status
        if (self.request.user.role not in ['super_admin', 'procurement_officer'] and
            'status' in self.request.data):
            raise permissions.PermissionDenied('Only procurement officers can update order status.')
        
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only creator or super admin can delete
        if (instance.created_by != self.request.user and 
            self.request.user.role != 'super_admin'):
            raise permissions.PermissionDenied('You can only delete your own orders.')
        
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def calendar_events(request):
    """
    Get booking events for calendar display
    """
    user = request.user
    
    # Get date range from query params
    start_date = request.query_params.get('start')
    end_date = request.query_params.get('end')
    
    try:
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        else:
            start_date = timezone.now().date()
        
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        else:
            end_date = start_date + timedelta(days=30)
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get bookings based on user role
    if user.role == 'super_admin':
        bookings = Booking.objects.filter(
            start_date__lte=end_date,
            end_date__gte=start_date,
            approval_status='approved'
        )
    elif user.role == 'room_admin':
        managed_room_ids = user.managed_rooms.values_list('id', flat=True)
        bookings = Booking.objects.filter(
            Q(room_id__in=managed_room_ids) | Q(user=user),
            start_date__lte=end_date,
            end_date__gte=start_date,
            approval_status='approved'
        )
    else:
        bookings = Booking.objects.filter(
            user=user,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
    
    # Format events for calendar
    events = []
    for booking in bookings:
        events.append({
            'id': booking.id,
            'title': f"{booking.room.name} - {booking.purpose}",
            'start': f"{booking.start_date}T{booking.start_time}",
            'end': f"{booking.end_date}T{booking.end_time}",
            'backgroundColor': {
                'approved': '#28a745',
                'pending': '#ffc107',
                'rejected': '#dc3545',
                'cancelled': '#6c757d'
            }.get(booking.approval_status, '#007bff'),
            'extendedProps': {
                'room': booking.room.name,
                'user': booking.user.get_full_name(),
                'status': booking.approval_status,
                'attendees': booking.expected_attendees
            }
        })
    
    return Response({
        'events': events,
        'total_events': len(events)
    })

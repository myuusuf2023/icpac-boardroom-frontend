"""
Authentication views for ICPAC Booking System
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    AdminUserSerializer
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom login view that returns JWT tokens with user info
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class UserRegistrationView(generics.CreateAPIView):
    """
    User registration endpoint
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens for the new user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User registered successfully.',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get and update current user profile
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'PUT' or self.request.method == 'PATCH':
            return UserUpdateSerializer
        return UserSerializer


class PasswordChangeView(APIView):
    """
    Change user password
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    Logout user by blacklisting refresh token
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'message': 'Logged out successfully.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Invalid token.'
            }, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListCreateAPIView):
    """
    List and create users (admin only)
    """
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admin can see all users
        if user.role == 'super_admin':
            return User.objects.all().order_by('-date_joined')
        
        # Room admin can see users who have booked their rooms
        elif user.role == 'room_admin':
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            return User.objects.filter(
                bookings__room_id__in=managed_room_ids
            ).distinct().order_by('-date_joined')
        
        # Regular users can only see themselves
        return User.objects.filter(id=user.id)
    
    def perform_create(self, serializer):
        # Only super admin can create users through API
        if self.request.user.role != 'super_admin':
            raise permissions.PermissionDenied('Only super admins can create users.')
        
        user = serializer.save()
        
        # Send welcome email (optional)
        if hasattr(settings, 'EMAIL_HOST_USER') and settings.EMAIL_HOST_USER:
            try:
                send_mail(
                    subject='Welcome to ICPAC Booking System',
                    message=f"""
                    Hello {user.get_full_name()},
                    
                    Your account has been created for the ICPAC Booking System.
                    
                    Email: {user.email}
                    Role: {user.get_role_display()}
                    
                    Please contact an administrator to get your login credentials.
                    
                    Best regards,
                    ICPAC IT Team
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                pass  # Don't fail user creation if email fails


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a user (admin only)
    """
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Super admin can manage all users
        if user.role == 'super_admin':
            return User.objects.all()
        
        # Room admin can view users who have booked their rooms
        elif user.role == 'room_admin':
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            return User.objects.filter(
                bookings__room_id__in=managed_room_ids
            ).distinct()
        
        # Regular users can only access themselves
        return User.objects.filter(id=user.id)
    
    def perform_update(self, serializer):
        # Only super admin can update other users' roles
        if (serializer.instance != self.request.user and 
            self.request.user.role != 'super_admin'):
            raise permissions.PermissionDenied('Only super admins can modify other users.')
        
        serializer.save()
    
    def perform_destroy(self, instance):
        # Only super admin can delete users, and can't delete themselves
        if self.request.user.role != 'super_admin':
            raise permissions.PermissionDenied('Only super admins can delete users.')
        
        if instance == self.request.user:
            raise permissions.PermissionDenied('You cannot delete your own account.')
        
        instance.delete()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_dashboard_stats(request):
    """
    Get user dashboard statistics
    """
    user = request.user
    
    # Get user's bookings count
    from apps.bookings.models import Booking
    
    total_bookings = Booking.objects.filter(user=user).count()
    pending_bookings = Booking.objects.filter(user=user, approval_status='pending').count()
    approved_bookings = Booking.objects.filter(user=user, approval_status='approved').count()
    
    stats = {
        'total_bookings': total_bookings,
        'pending_bookings': pending_bookings,
        'approved_bookings': approved_bookings,
        'user_role': user.role,
    }
    
    # Add admin stats if user is admin
    if user.role in ['super_admin', 'room_admin']:
        if user.role == 'super_admin':
            all_bookings = Booking.objects.all()
            managed_rooms_count = user.managed_rooms.count() if user.role == 'room_admin' else 0
        else:
            # Room admin stats for their managed rooms
            managed_room_ids = user.managed_rooms.values_list('id', flat=True)
            all_bookings = Booking.objects.filter(room_id__in=managed_room_ids)
            managed_rooms_count = user.managed_rooms.count()
        
        stats.update({
            'total_system_bookings': all_bookings.count(),
            'pending_approvals': all_bookings.filter(approval_status='pending').count(),
            'managed_rooms_count': managed_rooms_count,
        })
    
    return Response(stats)
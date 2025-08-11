"""
Booking URLs for ICPAC Booking System
"""
from django.urls import path
from . import views

app_name = 'bookings'

urlpatterns = [
    # Booking management endpoints
    path('', views.BookingListView.as_view(), name='booking_list'),
    path('<int:pk>/', views.BookingDetailView.as_view(), name='booking_detail'),
    
    # Booking approval
    path('<int:booking_id>/approve-reject/', views.approve_reject_booking, name='approve_reject_booking'),
    
    # User booking endpoints
    path('my-bookings/', views.my_bookings, name='my_bookings'),
    path('pending-approvals/', views.pending_approvals, name='pending_approvals'),
    
    # Dashboard and statistics
    path('dashboard/stats/', views.booking_dashboard_stats, name='booking_dashboard_stats'),
    path('calendar/events/', views.calendar_events, name='calendar_events'),
    
    # Procurement order endpoints
    path('procurement-orders/', views.ProcurementOrderListView.as_view(), name='procurement_order_list'),
    path('procurement-orders/<int:pk>/', views.ProcurementOrderDetailView.as_view(), name='procurement_order_detail'),
]
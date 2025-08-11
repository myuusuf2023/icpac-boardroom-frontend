"""
URL configuration for icpac_booking project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

from wagtail.admin import urls as wagtailadmin_urls
from wagtail import urls as wagtail_urls
from wagtail.documents import urls as wagtaildocs_urls

def api_info(request):
    return JsonResponse({
        'message': 'ICPAC Booking API',
        'version': '1.0',
        'endpoints': {
            'auth': '/api/auth/',
            'rooms': '/api/rooms/',
            'bookings': '/api/bookings/',
            'admin': '/admin/'
        }
    })

urlpatterns = [
    path('', api_info, name='api_info'),
    path('admin/', admin.site.urls),
    path('cms-admin/', include(wagtailadmin_urls)),
    path('documents/', include(wagtaildocs_urls)),
    
    # API endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/rooms/', include('apps.rooms.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    
    # Wagtail pages (keep at the end)
    path('', include(wagtail_urls)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

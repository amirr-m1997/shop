from rest_framework import viewsets, permissions
from rest_framework.response import Response
from .models import FAQ, ContactInfo, ContactMessage, LookbookItem, SiteSettings, Testimonial, SiteFeature
from .serializers import (
    FAQSerializer, ContactInfoSerializer, ContactMessageSerializer,
    LookbookItemSerializer, SiteSettingsSerializer,
    TestimonialReadSerializer, TestimonialWriteSerializer,
    SiteFeatureSerializer,
)


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return FAQ.objects.filter(is_active=True)


class ContactInfoView(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactInfoSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return ContactInfo.objects.all()

    def list(self, request, *args, **kwargs):
        obj, _ = ContactInfo.objects.get_or_create(pk=1)
        return Response(self.get_serializer(obj).data)


class ContactMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ContactMessageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ContactMessage.objects.all()
        return ContactMessage.objects.none()


class LookbookItemViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LookbookItemSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return LookbookItem.objects.filter(is_active=True)


class SiteSettingsView(viewsets.ReadOnlyModelViewSet):
    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return SiteSettings.objects.all()

    def list(self, request, *args, **kwargs):
        obj = SiteSettings.load()
        return Response(self.get_serializer(obj).data)


class TestimonialViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TestimonialWriteSerializer
        return TestimonialReadSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Testimonial.objects.all()
        return Testimonial.objects.filter(is_approved=True, is_featured=True)

    def perform_create(self, serializer):
        serializer.save()


class SiteFeatureViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SiteFeatureSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return SiteFeature.objects.filter(is_active=True)

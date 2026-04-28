from rest_framework.permissions import BasePermission


class IsFileOwner(BasePermission):
    """
    Allows access only to the owner of a UserFile object.
    Used as an object-level permission for defense in depth —
    views also filter querysets by owner.
    """
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user
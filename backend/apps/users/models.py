from django.contrib.auth.models import (
    AbstractBaseUser, 
    BaseUserManager, 
    PermissionsMixin
)
from django.db import models
from django.utils import timezone
from django.db import models as django_models


class CloudropeUserManager(BaseUserManager):
    def get_queryset(self):
        # Exclude soft-deleted users from all default queries
        return super().get_queryset().filter(deleted_at__isnull=True)

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self.create_user(email, password, **extra_fields)


class CloudropeUser(AbstractBaseUser, PermissionsMixin):
    first_name     = models.CharField(max_length=50)
    last_name      = models.CharField(max_length=50)
    email          = models.EmailField(unique=True)
    date_of_birth  = models.DateField()
    is_active = models.BooleanField(default=False)
    is_staff       = models.BooleanField(default=False)
    date_joined    = models.DateTimeField(default=timezone.now)
    deleted_at    = models.DateTimeField(null=True, blank=True, default=None)

    objects = CloudropeUserManager()
    all_objects = django_models.Manager() # Unfiltered — includes soft-deleted users

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "date_of_birth"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def soft_delete(self):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at"])
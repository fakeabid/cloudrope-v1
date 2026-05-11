from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password as validate_password_func
from django.db import IntegrityError, transaction
from datetime import date
import re

from .utils import (
    generate_verification_token, send_verification_email,
    generate_reset_token, send_password_reset_email,
    verify_reset_token, normalize_email
)

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    email = serializers.EmailField(validators=[])

    class Meta:
        model  = User
        fields = (
            "first_name",
            "last_name", 
            "email", 
            "date_of_birth", 
            "password", 
            "confirm_password"
        )

    def validate_first_name(self, value):
        if not re.match(r"^[a-zA-Z\s\-\']+$", value):
            raise serializers.ValidationError("Please enter only letters, spaces, hyphens, and apostrophes.")
        return value.strip()

    def validate_last_name(self, value):
        if not re.match(r"^[a-zA-Z\s\-\']+$", value):
            raise serializers.ValidationError("Please enter only letters, spaces, hyphens, and apostrophes.")
        return value.strip()
    
    def validate_email(self, value):
        value = normalize_email(value)
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email address cannot be used. Please try a different one.")
        return value

    def validate_date_of_birth(self, value):
        today = date.today()
        if value > today:
            raise serializers.ValidationError("Please provide a valid date of birth.")
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 13:
            raise serializers.ValidationError("You must be at least 13 years old to register.")
        return value

    def validate_password(self, value):
        validate_password_func(value)
        return value

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        
        try:
            with transaction.atomic():
                # Remove soft-deleted duplicates
                User.all_objects.filter(
                    email=validated_data['email'],
                    deleted_at__isnull=False
                ).delete()

                # Create user
                return User.objects.create_user(**validated_data)

        except IntegrityError:
            raise serializers.ValidationError({
                "email": "This email address cannot be used. Please try a different one."
            })
    

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return normalize_email(value)

    def validate(self, data):
        email    = data["email"]
        password = data["password"]

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user:
            try:
                deleted_user = User.all_objects.get(email=email)
                if deleted_user.check_password(password) and deleted_user.deleted_at is not None:
                    raise serializers.ValidationError(
                        "This account has been deleted. Please contact support if you believe this is a mistake."
                    )
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials. Please try again.")

        if not user.is_active:
            raise serializers.ValidationError(
                "Please verify your email before logging in. Check your inbox for the verification link."
            )

        data["user"] = user
        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            self.refresh_token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError('Token is invalid or already blacklisted.')
        return value

    def save(self):
        self.refresh_token.blacklist()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "date_joined",
        )
        read_only_fields = fields


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = normalize_email(value)
        self.user = None
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            return value

        if user.is_active:
            user = None

        self.user = user
        return value

    def save(self):
        if self.user is not None:
            token = generate_verification_token(self.user)
            send_verification_email(self.user, token)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = normalize_email(value)
        try:
            self.user = User.objects.get(email=value)
        except User.DoesNotExist:
            self.user = None
        return value

    def save(self):
        if self.user is not None:
            token = generate_reset_token(self.user)
            send_password_reset_email(self.user, token)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token            = serializers.CharField()
    password         = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password_func(value)
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })

        user_pk, error = verify_reset_token(data['token'])

        if error:
            raise serializers.ValidationError({'token': error})

        try:
            self.user = User.objects.get(pk=user_pk)
        except User.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid reset link.'})

        return data

    def save(self):
        self.user.set_password(self.validated_data['password'])
        self.user.save(update_fields=['password'])
        # Invalidate all outstanding tokens
        for token in OutstandingToken.objects.filter(
            user=self.user, 
            expires_at__gt=timezone.now()
        ):
            BlacklistedToken.objects.get_or_create(token=token)


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)
    refresh  = serializers.CharField(write_only=True)

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect password.")
        return value

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError("Invalid or expired refresh token.")
        return value

    def save(self):
        user = self.context['request'].user

        # Blacklist all active refresh tokens
        for token in OutstandingToken.objects.filter(
            user=user, 
            expires_at__gt=timezone.now()
        ):
            BlacklistedToken.objects.get_or_create(token=token)

        # Soft delete user
        user.soft_delete()
from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView,
    TokenRefreshView, MeView,
    VerifyEmailView, ResendVerificationView,
    PasswordResetRequestView, PasswordResetConfirmView,
    DeleteAccountView, UpdateProfileView, ChangePasswordView
)

urlpatterns = [
    path('register/',             RegisterView.as_view(),            name='register'),
    path('login/',                LoginView.as_view(),                name='login'),
    path('logout/',               LogoutView.as_view(),               name='logout'),
    path('token/refresh/',        TokenRefreshView.as_view(),         name='token_refresh'),
    path('me/',                   MeView.as_view(),                   name='me'),
    path('verify-email/',         VerifyEmailView.as_view(),          name='verify_email'),
    path('resend-verification/',  ResendVerificationView.as_view(),   name='resend_verification'),
    path('password-reset/',        PasswordResetRequestView.as_view(), name='password_reset'),
    path('password-reset/confirm/',PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('delete-account/',        DeleteAccountView.as_view(),        name='delete_account'),
    path('profile/update/',  UpdateProfileView.as_view(),  name='profile_update'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
]
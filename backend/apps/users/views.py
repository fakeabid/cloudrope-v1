from rest_framework import status, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    LogoutSerializer,
    UserSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    DeleteAccountSerializer,
    UpdateProfileSerializer,
    ChangePasswordSerializer,
)
from .utils import (
    generate_verification_token,
    send_verification_email,
    verify_verification_token,
)
from .tokens import get_tokens_for_user
from .throttles import (
    LoginRateThrottle,
    RegisterRateThrottle,
    PasswordResetRateThrottle,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (RegisterRateThrottle,)

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = generate_verification_token(user)
        send_verification_email(user, token)

        return Response({
            'message': 'Account created. Please check your email to verify your account.'
        }, status=status.HTTP_201_CREATED)
    

class LoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (LoginRateThrottle,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        return Response({
            'user': UserSerializer(user, context={"request": request}).data,
            'tokens': get_tokens_for_user(user),
            'message': 'Login successful.'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'message': 'Logged out successfully.'},
            status=status.HTTP_205_RESET_CONTENT
        )


class TokenRefreshView(BaseTokenRefreshView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            access_token = AccessToken(response.data['access'])
            user_id = access_token['user_id']

            try:
                user = User.objects.get(id=user_id)
                response.data['user'] = UserSerializer(user, context={"request": request}).data
            except User.DoesNotExist:
                return Response({'error': 'User not found.'}, status=status.HTTP_401_UNAUTHORIZED)

        return response


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        token = request.query_params.get('token')

        if not token:
            return Response(
                {'error': 'Verification token is missing.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_pk, error = verify_verification_token(token)

        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_pk)
        except User.DoesNotExist:
            return Response({'error': 'Invalid Verification Link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({'message': 'Account is already verified.'}, status=status.HTTP_200_OK)

        user.is_active = True
        user.save(update_fields=['is_active'])

        return Response({
            'message': 'Email verified successfully.',
            'user': UserSerializer(user, context={"request": request}).data,
        }, status=status.HTTP_200_OK)
    

class ResendVerificationView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (RegisterRateThrottle,)  # Reuse register throttle to prevent spam

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'If this email is registered and unverified, a new verification link has been sent.'
        }, status=status.HTTP_200_OK)
    

class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = (PasswordResetRateThrottle,)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Always return the same response — don't reveal if email exists
        return Response({
            'message': 'If an account with that email exists, a password reset link has been sent.'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Password reset successful. You can now log in with your new password.'
        }, status=status.HTTP_200_OK)
    

class UpdateProfileView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)


class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        new_tokens = serializer.save()
        return Response({
            'message': 'Password changed successfully.',
            'tokens': new_tokens
        })
    

class DeleteAccountView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = DeleteAccountSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {"message": "Your account has been deleted."},
            status=status.HTTP_200_OK
        )
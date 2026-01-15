# Authentication Implementation Guide

## Overview
This authentication system integrates with the SunAPI backend and supports:
- User login with email and password
- User registration with OTP verification
- Password reset with OTP verification
- Token-based authentication with automatic refresh
- Secure token storage using AsyncStorage

## Files Modified/Created

### 1. `app/Auth.tsx`
The main authentication screen with three modes:
- **Login**: Email and password authentication
- **Register**: New user registration with full name, email, phone, password, and OTP
- **Forgot Password**: Password reset flow with email, OTP, and new password

### 2. `utils/api.ts` (New)
Centralized API utility functions:
- `apiRequest()`: Make authenticated API calls with auto token refresh
- `login()`: User login
- `register()`: User registration
- `resetPassword()`: Password reset
- `refreshAccessToken()`: Refresh expired access tokens
- `storeTokens()`, `getAccessToken()`, `clearTokens()`: Token management
- `isAuthenticated()`: Check authentication status
- `logout()`: Clear user session

### 3. `.env.example` (New)
Environment variable template for API configuration

## Setup Instructions

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
EXPO_PUBLIC_API_KEY=your_actual_api_key
```

### 2. Install Dependencies
All required dependencies are already in `package.json`:
```bash
npm install
# or
yarn install
```

### 3. Update API Base URL
Make sure your API base URL in `.env` matches your backend server.

## API Endpoints Used

Based on `api.json`, the following endpoints are integrated:

### Login
- **Endpoint**: `POST /api/auth/login`
- **Body**: `{ email, password }`
- **Response**: `{ access_token, token_type, expires_in, refresh_token }`

### Register
- **Endpoint**: `POST /api/auth/signup/register`
- **Body**: `{ name, email, phone, password, password_confirmation, otp }`
- **Response**: `{ access_token, refresh_token }` (if auto-login enabled)

### Reset Password
- **Endpoint**: `POST /api/auth/forgot-password/reset-password`
- **Body**: `{ email, otp, password, password_confirmation }`
- **Response**: Success message

### Refresh Token
- **Endpoint**: `POST /api/auth/refresh-token`
- **Body**: `{ refresh_token }`
- **Response**: `{ access_token, refresh_token }`

## Features

### 1. Token Management
- Access tokens are stored securely in AsyncStorage
- Automatic token refresh on 401 responses
- Tokens persist across app restarts

### 2. OTP Flow
The API requires OTP verification for:
- **Registration**: User must enter OTP received via email/phone
- **Password Reset**: User must enter OTP to verify identity

**Note**: The current implementation assumes the OTP is sent separately. You may need to add endpoints to request OTP:
- `POST /api/auth/signup/request-otp` (if available)
- `POST /api/auth/forgot-password/request-otp` (if available)

### 3. Error Handling
- Network errors are caught and displayed to users
- API error messages are shown in alerts
- Loading states prevent duplicate submissions

### 4. Guest Mode
Users can continue as guests without authentication by clicking "Continue as Guest".

## Usage Examples

### Using API Utilities in Other Screens

```typescript
import { apiRequest, isAuthenticated, logout } from '@/utils/api';

// Check if user is logged in
const checkAuth = async () => {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    router.push('/Auth');
  }
};

// Make authenticated API request
const fetchUserProfile = async () => {
  try {
    const profile = await apiRequest('/api/user/profile', 'GET');
    console.log(profile);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
};

// Logout user
const handleLogout = async () => {
  await logout();
  router.push('/Auth');
};
```

### Protecting Routes

Create a middleware or check in your screens:

```typescript
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isAuthenticated } from '@/utils/api';

export default function ProtectedScreen() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      router.replace('/Auth');
    }
  };

  return (
    // Your protected content
  );
}
```

## Security Considerations

### Current Implementation
- ✅ Tokens stored in AsyncStorage
- ✅ HTTPS should be used in production
- ✅ Automatic token refresh
- ✅ API key support

### Recommendations for Production
1. **Use Expo SecureStore** instead of AsyncStorage for tokens (requires Expo Go or custom dev client)
2. **Enable HTTPS**: Ensure `EXPO_PUBLIC_API_BASE_URL` uses `https://`
3. **Implement Biometric Auth**: Add fingerprint/face recognition for re-authentication
4. **Add Rate Limiting**: Protect against brute force attacks
5. **Certificate Pinning**: Pin SSL certificates for additional security

### Upgrading to SecureStore

```typescript
// Replace AsyncStorage with SecureStore
import * as SecureStore from 'expo-secure-store';

// Instead of:
await AsyncStorage.setItem('access_token', token);

// Use:
await SecureStore.setItemAsync('access_token', token);
```

## Testing

### Test Credentials
Update these based on your backend setup:
```
Email: user@example.com
Password: Password123!
```

### Testing Flow
1. **Registration**:
   - Fill all fields
   - Request OTP from backend (if endpoint exists)
   - Enter OTP and submit

2. **Login**:
   - Enter email and password
   - Submit and verify redirect to home

3. **Password Reset**:
   - Enter email
   - Request OTP
   - Enter OTP and new password
   - Verify you can login with new password

4. **Guest Mode**:
   - Click "Continue as Guest"
   - Verify access to non-protected screens

## Troubleshooting

### Network Errors
- Check if `EXPO_PUBLIC_API_BASE_URL` is correct
- Verify backend server is running
- Check network connectivity
- For local development, use your machine's IP instead of `localhost`

### Token Issues
- Clear app data and retry
- Check token expiration times
- Verify refresh token endpoint is working

### OTP Not Received
- Verify backend email/SMS configuration
- Check spam folder
- Ensure phone number format is correct

## Future Enhancements

1. **Social Login**: Add Google, Facebook, Apple authentication
2. **Email Verification**: Verify email before allowing login
3. **Remember Me**: Add option to stay logged in
4. **Two-Factor Authentication**: Add 2FA for enhanced security
5. **Biometric Authentication**: Fingerprint/Face ID support
6. **Password Strength Indicator**: Visual feedback for password strength
7. **Account Recovery**: Additional recovery options

## API Response Examples

### Successful Login
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200..."
}
```

### Error Response
```json
{
  "message": "Invalid credentials",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

## Support

For issues or questions:
1. Check the API documentation
2. Verify environment variables are set correctly
3. Check backend server logs
4. Review error messages in app console

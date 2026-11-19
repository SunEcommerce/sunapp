# Quick Start Guide - Authentication

## 🚀 Getting Started in 5 Minutes

### Step 1: Configure API (2 minutes)
```bash
# Copy environment template
cp .env.example .env

# Edit .env file
EXPO_PUBLIC_API_BASE_URL=http://your-api-url.com
EXPO_PUBLIC_API_KEY=your_api_key
```

### Step 2: Start the App (1 minute)
```bash
# Install dependencies (if not done)
npm install

# Start Expo
npm start
```

### Step 3: Test Authentication (2 minutes)

#### Test Login
1. Navigate to `/Auth` screen
2. Enter credentials:
   - Email: `user@example.com`
   - Password: `your_password`
3. Click "Login"
4. Should redirect to home on success

#### Test Registration
1. Switch to "Register" tab
2. Fill all fields including OTP
3. Click "Register"
4. Should create account and switch to login

#### Test Guest Mode
1. Click "Continue as Guest"
2. Should access app without authentication

## 🔧 Common Issues

### Issue: "Network Error"
**Solution**: Check if API URL is correct and server is running
```bash
# In .env file, make sure URL is correct
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000  # Use IP for local dev
```

### Issue: Browser requests show "CORS error"
Allow the Expo web origin in the backend's `sunapi/.env`:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:8000,http://localhost:8081,http://127.0.0.1:8081
```

Use the exact origin shown in your browser's address bar, including its port. If Expo starts on another port or you use a LAN address, add that origin to the comma-separated list. For production, use your deployed frontend origins.

Origins contain only the scheme, host, and port (no path or trailing slash). Leaving `CORS_ALLOWED_ORIGINS` empty allows no cross-origin callers; remove the key to fall back to the backend's `APP_URL`.

From `sunapi`, run `php artisan config:clear`, then reload the browser. Keep `EXPO_PUBLIC_API_BASE_URL` pointed at the API server (`http://localhost:8000` for local web development).

### Issue: "Invalid Credentials"
**Solution**: Verify user exists in backend or create test account

### Issue: OTP Required
**Solution**: Get OTP from backend logs or email/SMS

## 📖 Usage in Your Code

### Check if User is Logged In
```typescript
import { isAuthenticated } from '@/utils/api';

const checkAuth = async () => {
  const loggedIn = await isAuthenticated();
  if (!loggedIn) {
    router.push('/Auth');
  }
};
```

### Make API Request
```typescript
import { apiRequest } from '@/utils/api';

const fetchData = async () => {
  try {
    const data = await apiRequest('/api/your-endpoint', 'GET');
    console.log(data);
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

### Logout User
```typescript
import { logout } from '@/utils/api';

const handleLogout = async () => {
  await logout();
  router.push('/Auth');
};
```

## 📚 Full Documentation

For complete documentation, see:
- **`docs/AUTHENTICATION.md`** - Complete implementation guide
- **`IMPLEMENTATION_SUMMARY.md`** - What was implemented
- **`examples/ProfileScreenExample.tsx`** - Code examples

## ✅ Verification Checklist

- [ ] `.env` file created with correct API URL
- [ ] App starts without errors
- [ ] Can navigate to Auth screen
- [ ] Can see login/register forms
- [ ] Backend API is running
- [ ] Test credentials available

## 🆘 Need Help?

1. Check `docs/AUTHENTICATION.md` for detailed guide
2. Review error messages in console
3. Verify backend API is running
4. Check network connectivity
5. Ensure environment variables are set

---

**Ready to go!** Your authentication system is fully implemented and ready for testing. 🎉

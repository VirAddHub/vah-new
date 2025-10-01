# How to Clear Authentication and See the Login Page

## The Issue:
You have a valid JWT token stored from a previous login session. The authentication system is working correctly by detecting this token and redirecting you to the dashboard.

## Solution: Clear Your Browser Storage

### Option 1: Using Browser Developer Tools (Recommended)
1. Open the website: https://vah-new-frontend-75d6.vercel.app/login
2. Press `F12` to open Developer Tools
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Under **Local Storage**, click on your domain
5. Find and delete these keys:
   - `vah_jwt`
   - `vah_user`
6. Under **Cookies**, delete:
   - `vah_jwt` cookie
7. Refresh the page

### Option 2: Using Console
1. Open the website
2. Press `F12` and go to **Console** tab
3. Run these commands:
```javascript
localStorage.removeItem('vah_jwt');
localStorage.removeItem('vah_user');
document.cookie = 'vah_jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
location.reload();
```

### Option 3: Add a Logout Button to Clear Credentials
Add a logout button to your navbar that calls the logout function.

## Why This Happens:
- JWT tokens persist across page refreshes
- The authentication system checks for valid tokens on page load
- If a valid token exists, users are automatically logged in
- This is **correct security behavior** - it keeps users logged in

## For Development/Testing:
If you want to test the login flow frequently, consider:
1. Using browser incognito/private mode (no stored credentials)
2. Adding a "Clear Auth" button for dev purposes
3. Setting shorter JWT expiration times in development


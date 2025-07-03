# 🔒 Private User Management Guide - v0.1.2

## Overview
Your Firework Factory application is now configured as a **private application**. Public registration has been disabled to ensure only authorized users can access the system.

## 🆕 What's New in v0.1.2
- Enhanced user activity tracking with detailed audit logs
- Improved session management and authentication history
- Better role-based access control with inventory history permissions

## Creating User Accounts (Admin Only)

Since public registration is disabled, you'll need to create user accounts through the Firebase Console:

### Method 1: Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit [Firebase Console](https://console.firebase.google.com/project/firework-factory)
   - Navigate to **Authentication** → **Users**

2. **Add User**
   - Click **"Add user"** button
   - Enter the user's **email address**
   - Enter a **temporary password** (user can change later)
   - Click **"Add user"**

3. **Set User Role**
   - After creating the user, go to **Firestore Database**
   - Navigate to the `users` collection
   - Find the user's document (by their UID)
   - Add/edit the following fields:
     ```json
     {
       "email": "user@example.com",
       "firstName": "User's First Name",
       "lastName": "User's Last Name",
       "role": "user" // or "manager" or "admin"
     }
     ```

### Method 2: Temporarily Enable Registration

If you need to create multiple accounts:

1. **Temporarily Enable Registration**
   - Uncomment the registration form in `AuthView.vue`
   - Redeploy the app
   - Create the needed accounts
   - Comment out the registration form again
   - Redeploy

## User Roles

### 🔵 **User** (Basic Access)
- View inventory and products
- Basic order management
- Limited statistics

### 🟡 **Manager** (Extended Access)
- All User permissions
- Advanced analytics and reporting
- Manage categories and vendors
- Access notification history

### 🔴 **Admin** (Full Access)
- All Manager permissions
- System backup and restore
- Audit logs and monitoring
- Error monitoring tools
- User management

## Security Benefits

✅ **No Public Registration** - Only authorized users can access
✅ **Controlled User Creation** - Admin controls who gets access
✅ **Role-Based Access** - Different permission levels
✅ **Private Application** - No search engine indexing
✅ **Secure Authentication** - Firebase security standards

## User Onboarding Process

1. **Admin creates account** in Firebase Console
2. **Admin sets user role** in Firestore
3. **User receives login credentials** (via secure communication)
4. **User logs in** with provided credentials
5. **User changes password** in their profile (recommended)

## Password Reset

Users can still reset their passwords using the "Forgot Password?" link on the login page.

## Backup Admin Access

**Important**: Always ensure you have at least one admin user account with access to:
- Firebase Console
- Admin role in the application
- Recovery email access

## Need to Add Users?

Contact your system administrator or use the Firebase Console method above to create new user accounts securely.

---

**🔒 Your application is now private and secure!**

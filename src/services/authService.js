import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.authStateCallbacks = [];
    
    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfile = null;
      }
      
      // Notify all callbacks
      this.authStateCallbacks.forEach(callback => callback(user, this.userProfile));
    });
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} User data
   */
  async registerUser(userData) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = userData;
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        role,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isActive: true,
        emailVerified: user.emailVerified,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en'
        }
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Send email verification
      await sendEmailVerification(user);

      console.log('User registered successfully:', user.uid);
      return { user, userProfile };
    } catch (error) {
      console.error('Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} User data
   */
  async signInUser(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login time
      await this.updateLastLogin(user.uid);

      console.log('User signed in successfully:', user.uid);
      return { user, userProfile: this.userProfile };
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out user
   */
  async signOutUser() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Load user profile from Firestore
   * @param {string} uid - User ID
   */
  async loadUserProfile(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        this.userProfile = userDoc.data();
      } else {
        // Auto-create user profile if missing
        if (this.currentUser && this.currentUser.uid === uid) {
          const user = this.currentUser;
          const displayName = user.displayName || '';
          const [firstName = '', lastName = ''] = displayName.split(' ');
          const userProfile = {
            uid: user.uid,
            email: user.email,
            firstName,
            lastName,
            displayName: displayName,
            role: 'user',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isActive: true,
            emailVerified: user.emailVerified,
            preferences: {
              theme: 'light',
              notifications: true,
              language: 'en'
            }
          };
          await setDoc(doc(db, 'users', user.uid), userProfile);
          this.userProfile = userProfile;
          console.log('Auto-created missing user profile for', user.uid);
        } else {
          console.warn('User profile not found in Firestore');
          this.userProfile = null;
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.userProfile = null;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   */
  async updateUserProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const userRef = doc(db, 'users', this.currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);
      
      // Update local profile
      this.userProfile = { ...this.userProfile, ...updateData };
      
      // Update Firebase Auth profile if display name changed
      if (updates.firstName || updates.lastName) {
        const displayName = `${updates.firstName || this.userProfile.firstName} ${updates.lastName || this.userProfile.lastName}`;
        await updateProfile(this.currentUser, { displayName });
      }

      console.log('User profile updated successfully');
      return this.userProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update last login time
   * @param {string} uid - User ID
   */
  async updateLastLogin(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastLoginAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent');
    } catch (error) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(this.currentUser, credential);

      // Update password
      await updatePassword(this.currentUser, newPassword);
      
      console.log('Password changed successfully');
    } catch (error) {
      console.error('Password change error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification() {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      await sendEmailVerification(this.currentUser);
      console.log('Email verification sent');
    } catch (error) {
      console.error('Email verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if user has specific role
   * @param {string} requiredRole - Required role
   * @returns {boolean} Has role
   */
  hasRole(requiredRole) {
    return this.userProfile?.role === requiredRole;
  }

  /**
   * Check if user is admin
   * @returns {boolean} Is admin
   */
  isAdmin() {
    return this.hasRole('admin');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Get current user info
   * @returns {Object} Current user and profile
   */
  getCurrentUser() {
    return {
      user: this.currentUser,
      profile: this.userProfile,
      isAuthenticated: this.isAuthenticated(),
      isAdmin: this.isAdmin()
    };
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    this.authStateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle Firebase Auth errors
   * @param {Error} error - Firebase error
   * @returns {Error} Formatted error
   */
  handleAuthError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password should be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email address.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/requires-recent-login': 'Please log in again to complete this action.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/user-disabled': 'This account has been disabled.'
    };

    const message = errorMessages[error.code] || error.message || 'An error occurred';
    
    return new Error(message);
  }

  /**
   * Get all users (admin only)
   * @returns {Array} List of users
   */
  async getAllUsers() {
    try {
      if (!this.isAdmin()) {
        throw new Error('Access denied. Admin privileges required.');
      }

      // This would typically require Firebase Admin SDK on the backend
      // For now, we'll return a placeholder
      console.warn('getAllUsers requires backend implementation with Firebase Admin SDK');
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
}

export default new AuthService();

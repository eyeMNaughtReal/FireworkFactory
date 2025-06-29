import { defineStore } from 'pinia';
import authService from '../services/authService.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    userProfile: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isInitialized: false
  }),

  getters: {
    isAdmin: (state) => state.userProfile?.role === 'admin',
    isUser: (state) => state.userProfile?.role === 'user',
    displayName: (state) => {
      if (state.userProfile) {
        return state.userProfile.displayName || `${state.userProfile.firstName} ${state.userProfile.lastName}`;
      }
      return state.user?.displayName || state.user?.email || 'User';
    },
    initials: (state) => {
      if (state.userProfile?.firstName && state.userProfile?.lastName) {
        return `${state.userProfile.firstName[0]}${state.userProfile.lastName[0]}`.toUpperCase();
      }
      if (state.user?.displayName) {
        const names = state.user.displayName.split(' ');
        return names.map(name => name[0]).join('').toUpperCase().slice(0, 2);
      }
      if (state.user?.email) {
        return state.user.email[0].toUpperCase();
      }
      return 'U';
    },
    hasPermission: (state) => (permission) => {
      // Basic role-based permissions
      if (state.userProfile?.role === 'admin') return true;
      
      const userPermissions = {
        'read': true,
        'write': state.userProfile?.role === 'manager' || state.userProfile?.role === 'admin',
        'delete': state.userProfile?.role === 'admin',
        'backup': state.userProfile?.role === 'admin'
      };
      
      return userPermissions[permission] || false;
    }
  },

  actions: {
    /**
     * Initialize auth store
     */
    async initializeAuth() {
      this.isLoading = true;
      try {
        // Set up auth state listener
        const unsubscribe = authService.onAuthStateChange((user, profile) => {
          this.user = user;
          this.userProfile = profile;
          this.isAuthenticated = !!user;
          this.error = null;
          this.isInitialized = true;
          this.isLoading = false;
        });

        // Store unsubscribe function for cleanup
        this.unsubscribeAuth = unsubscribe;
        
        // Get current user state
        const currentUser = authService.getCurrentUser();
        this.user = currentUser.user;
        this.userProfile = currentUser.profile;
        this.isAuthenticated = currentUser.isAuthenticated;
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        this.error = error.message;
        this.isInitialized = true;
        this.isLoading = false;
      }
    },

    /**
     * Register new user
     */
    async register(userData) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const result = await authService.registerUser(userData);
        this.user = result.user;
        this.userProfile = result.userProfile;
        this.isAuthenticated = true;
        
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Sign in user
     */
    async signIn(email, password) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const result = await authService.signInUser(email, password);
        this.user = result.user;
        this.userProfile = result.userProfile;
        this.isAuthenticated = true;
        
        return result;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Sign out user
     */
    async signOut() {
      this.isLoading = true;
      this.error = null;
      
      try {
        await authService.signOutUser();
        this.user = null;
        this.userProfile = null;
        this.isAuthenticated = false;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update user profile
     */
    async updateProfile(updates) {
      this.isLoading = true;
      this.error = null;
      
      try {
        const updatedProfile = await authService.updateUserProfile(updates);
        this.userProfile = updatedProfile;
        
        return updatedProfile;
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Reset password
     */
    async resetPassword(email) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await authService.resetPassword(email);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await authService.changePassword(currentPassword, newPassword);
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Resend email verification
     */
    async resendEmailVerification() {
      this.isLoading = true;
      this.error = null;
      
      try {
        await authService.resendEmailVerification();
      } catch (error) {
        this.error = error.message;
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null;
    },

    /**
     * Cleanup auth store
     */
    cleanup() {
      if (this.unsubscribeAuth) {
        this.unsubscribeAuth();
      }
    }
  }
});

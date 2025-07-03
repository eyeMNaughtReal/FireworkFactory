<template>
  <div class="profile-view">
    <div class="profile-header">
      <div class="profile-avatar">
        {{ authStore.initials }}
      </div>
      <div class="profile-info">
        <h1>{{ authStore.displayName }}</h1>
        <p class="profile-role">{{ userProfile?.role || 'User' }}</p>
        <p class="profile-email">{{ user?.email }}</p>
      </div>
    </div>

    <div class="profile-content">
      <!-- Profile Form -->
      <div class="profile-section">
        <h2>Profile Information</h2>
        <form @submit.prevent="updateProfile" class="profile-form">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                v-model="profileForm.firstName"
                type="text"
                required
                :disabled="authStore.isLoading"
              />
            </div>
            
            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                v-model="profileForm.lastName"
                type="text"
                required
                :disabled="authStore.isLoading"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              v-model="profileForm.email"
              type="email"
              disabled
              title="Email cannot be changed"
            />
          </div>

          <div class="form-group">
            <label for="role">Role</label>
            <input
              id="role"
              v-model="profileForm.role"
              type="text"
              disabled
              title="Role is set by administrator"
            />
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              :disabled="authStore.isLoading || !hasProfileChanges"
              class="btn-primary"
            >
              {{ authStore.isLoading ? 'Updating...' : 'Update Profile' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Password Change -->
      <div class="profile-section">
        <h2>Change Password</h2>
        <form @submit.prevent="changePassword" class="profile-form">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              required
              :disabled="authStore.isLoading"
            />
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input
              id="newPassword"
              v-model="passwordForm.newPassword"
              type="password"
              required
              minlength="6"
              :disabled="authStore.isLoading"
            />
          </div>

          <div class="form-group">
            <label for="confirmNewPassword">Confirm New Password</label>
            <input
              id="confirmNewPassword"
              v-model="passwordForm.confirmNewPassword"
              type="password"
              required
              :disabled="authStore.isLoading"
            />
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              :disabled="authStore.isLoading || !isPasswordFormValid"
              class="btn-secondary"
            >
              {{ authStore.isLoading ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Email Verification -->
      <div v-if="user && !user.emailVerified" class="profile-section">
        <h2>Email Verification</h2>
        <div class="verification-notice">
          <p>⚠️ Your email address is not verified. Please check your inbox for a verification email.</p>
          <button 
            @click="resendVerification"
            :disabled="authStore.isLoading"
            class="btn-secondary"
          >
            {{ authStore.isLoading ? 'Sending...' : 'Resend Verification Email' }}
          </button>
        </div>
      </div>

      <!-- Account Information -->
      <div class="profile-section">
        <h2>Account Information</h2>
        <div class="account-info">
          <div class="info-item">
            <span class="info-label">Account Created:</span>
            <span class="info-value">{{ formatDate(userProfile?.createdAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Last Login:</span>
            <span class="info-value">{{ formatDate(userProfile?.lastLoginAt) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Verified:</span>
            <span class="info-value">{{ user?.emailVerified ? '✅ Yes' : '❌ No' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Account Status:</span>
            <span class="info-value">{{ userProfile?.isActive ? '🟢 Active' : '🔴 Inactive' }}</span>
          </div>
        </div>
      </div>

      <!-- Preferences -->
      <div class="profile-section">
        <h2>Preferences</h2>
        <form @submit.prevent="updatePreferences" class="profile-form">

          <div class="form-group">
            <label for="language">Language</label>
            <select
              id="language"
              v-model="preferencesForm.language"
              :disabled="authStore.isLoading"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="preferencesForm.notifications"
                :disabled="authStore.isLoading"
              />
              Enable Email Notifications
            </label>
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              :disabled="authStore.isLoading || !hasPreferencesChanges"
              class="btn-primary"
            >
              {{ authStore.isLoading ? 'Updating...' : 'Update Preferences' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <Toast
      :show="showToast"
      :message="toastMessage"
      :type="toastType"
      @close="showToast = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import Toast from '../components/Toast.vue';

export default {
  name: 'ProfileView',
  components: {
    Toast
  },
  setup() {
    const authStore = useAuthStore();
    
    const showToast = ref(false);
    const toastMessage = ref('');
    const toastType = ref('success');
    
    const profileForm = ref({
      firstName: '',
      lastName: '',
      email: '',
      role: ''
    });
    
    const passwordForm = ref({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    });
    
    const preferencesForm = ref({
      theme: 'light',
      language: 'en',
      notifications: true
    });

    const originalProfile = ref({});
    const originalPreferences = ref({});

    const user = computed(() => authStore.user);
    const userProfile = computed(() => authStore.userProfile);

    const hasProfileChanges = computed(() => {
      return (
        profileForm.value.firstName !== originalProfile.value.firstName ||
        profileForm.value.lastName !== originalProfile.value.lastName
      );
    });

    const hasPreferencesChanges = computed(() => {
      return (
        preferencesForm.value.theme !== originalPreferences.value.theme ||
        preferencesForm.value.language !== originalPreferences.value.language ||
        preferencesForm.value.notifications !== originalPreferences.value.notifications
      );
    });

    const isPasswordFormValid = computed(() => {
      return (
        passwordForm.value.currentPassword &&
        passwordForm.value.newPassword &&
        passwordForm.value.confirmNewPassword &&
        passwordForm.value.newPassword === passwordForm.value.confirmNewPassword &&
        passwordForm.value.newPassword.length >= 6
      );
    });

    const loadUserData = () => {
      if (userProfile.value) {
        profileForm.value = {
          firstName: userProfile.value.firstName || '',
          lastName: userProfile.value.lastName || '',
          email: userProfile.value.email || '',
          role: userProfile.value.role || ''
        };
        
        originalProfile.value = { ...profileForm.value };
        
        if (userProfile.value.preferences) {
          preferencesForm.value = {
            theme: userProfile.value.preferences.theme || 'light',
            language: userProfile.value.preferences.language || 'en',
            notifications: userProfile.value.preferences.notifications !== false
          };
        }
        
        originalPreferences.value = { ...preferencesForm.value };
      }
    };

    const updateProfile = async () => {
      try {
        await authStore.updateProfile({
          firstName: profileForm.value.firstName,
          lastName: profileForm.value.lastName
        });
        
        originalProfile.value = { ...profileForm.value };
        showToastMessage('Profile updated successfully!', 'success');
      } catch (error) {
        showToastMessage('Failed to update profile', 'error');
      }
    };

    const changePassword = async () => {
      if (passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword) {
        showToastMessage('New passwords do not match', 'error');
        return;
      }

      try {
        await authStore.changePassword(
          passwordForm.value.currentPassword,
          passwordForm.value.newPassword
        );
        
        // Clear form
        passwordForm.value = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
        
        showToastMessage('Password changed successfully!', 'success');
      } catch (error) {
        showToastMessage('Failed to change password', 'error');
      }
    };

    const updatePreferences = async () => {
      try {
        await authStore.updateProfile({
          preferences: preferencesForm.value
        });
        
        originalPreferences.value = { ...preferencesForm.value };
        showToastMessage('Preferences updated successfully!', 'success');
      } catch (error) {
        showToastMessage('Failed to update preferences', 'error');
      }
    };

    const resendVerification = async () => {
      try {
        await authStore.resendEmailVerification();
        showToastMessage('Verification email sent!', 'success');
      } catch (error) {
        showToastMessage('Failed to send verification email', 'error');
      }
    };

    const showToastMessage = (message, type) => {
      toastMessage.value = message;
      toastType.value = type;
      showToast.value = true;
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    watch(userProfile, loadUserData, { immediate: true });

    onMounted(() => {
      loadUserData();
    });

    return {
      authStore,
      user,
      userProfile,
      profileForm,
      passwordForm,
      preferencesForm,
      hasProfileChanges,
      hasPreferencesChanges,
      isPasswordFormValid,
      updateProfile,
      changePassword,
      updatePreferences,
      resendVerification,
      formatDate,
      showToast,
      toastMessage,
      toastType
    };
  }
};
</script>

<style scoped>
.profile-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 40px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin-right: 20px;
}

.profile-info h1 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.8rem;
}

.profile-role {
  margin: 0 0 4px 0;
  color: #667eea;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.9rem;
  letter-spacing: 0.5px;
}

.profile-email {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.profile-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.profile-section h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.3rem;
  font-weight: 600;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #666;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.form-actions {
  margin-top: 10px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 2px solid #e1e5e9;
}

.btn-primary:hover:not(:disabled),
.btn-secondary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.verification-notice {
  padding: 20px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 20px;
}

.verification-notice p {
  margin: 0 0 15px 0;
  color: #92400e;
}

.account-info {
  display: grid;
  gap: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e1e5e9;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: #666;
}

.info-value {
  font-weight: 600;
  color: #333;
}

@media (max-width: 768px) {
  .profile-view {
    padding: 15px;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  
  .profile-avatar {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .profile-section {
    padding: 20px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>

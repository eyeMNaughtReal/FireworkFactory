<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>🎆 Firework Factory</h1>
        <p>Private Inventory Management System</p>
      </div>

      <!-- Login Form -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <h2>Sign In</h2>
        
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            required
            :disabled="authStore.isLoading"
            placeholder="Enter your email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            required
            :disabled="authStore.isLoading"
            placeholder="Enter your password"
          />
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            :disabled="authStore.isLoading || !isFormValid"
            class="btn-primary"
          >
            {{ authStore.isLoading ? 'Signing In...' : 'Sign In' }}
          </button>
        </div>

        <div class="auth-links">
          <a href="#" @click.prevent="mode = 'forgot'" class="link">Forgot Password?</a>
          <!-- Registration removed for private app -->
        </div>
      </form>

      <!-- Registration Form Disabled for Private App -->
      <!--
      <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <h2>Create Account</h2>
        
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input
              id="firstName"
              v-model="formData.firstName"
              type="text"
              required
              :disabled="authStore.isLoading"
              placeholder="First name"
            />
          </div>
          
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
              id="lastName"
              v-model="formData.lastName"
              type="text"
              required
              :disabled="authStore.isLoading"
              placeholder="Last name"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="registerEmail">Email Address</label>
          <input
            id="registerEmail"
            v-model="formData.email"
            type="email"
            required
            :disabled="authStore.isLoading"
            placeholder="Enter your email"
          />
        </div>

        <div class="form-group">
          <label for="registerPassword">Password</label>
          <input
            id="registerPassword"
            v-model="formData.password"
            type="password"
            required
            :disabled="authStore.isLoading"
            placeholder="Create a password"
            minlength="6"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            required
            :disabled="authStore.isLoading"
            placeholder="Confirm your password"
          />
        </div>

        <div class="form-group">
          <label for="role">Role</label>
          <select
            id="role"
            v-model="formData.role"
            :disabled="authStore.isLoading"
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            :disabled="authStore.isLoading || !isRegisterFormValid"
            class="btn-primary"
          >
            {{ authStore.isLoading ? 'Creating Account...' : 'Create Account' }}
          </button>
        </div>

        <div class="auth-links">
          <a href="#" @click.prevent="mode = 'login'" class="link">Already have an account? Sign In</a>
        </div>
      </form>
      -->

      <!-- Forgot Password Form -->
      <form v-else-if="mode === 'forgot'" @submit.prevent="handleForgotPassword" class="auth-form">
        <h2>Reset Password</h2>
        <p class="form-description">Enter your email address and we'll send you a link to reset your password.</p>
        
        <div class="form-group">
          <label for="resetEmail">Email Address</label>
          <input
            id="resetEmail"
            v-model="formData.email"
            type="email"
            required
            :disabled="authStore.isLoading"
            placeholder="Enter your email"
          />
        </div>

        <div class="form-actions">
          <button 
            type="submit" 
            :disabled="authStore.isLoading || !formData.email"
            class="btn-primary"
          >
            {{ authStore.isLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </div>

        <div class="auth-links">
          <a href="#" @click.prevent="mode = 'login'" class="link">Back to Sign In</a>
        </div>
      </form>

      <!-- Error Message -->
      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
        <button @click="authStore.clearError" class="error-close">&times;</button>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
        <button @click="successMessage = ''" class="success-close">&times;</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

export default {
  name: 'AuthView',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    const mode = ref('login'); // 'login', 'register', 'forgot'
    const successMessage = ref('');
    
    const formData = ref({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'user'
    });

    const isFormValid = computed(() => {
      return formData.value.email && formData.value.password;
    });

    const isRegisterFormValid = computed(() => {
      return (
        formData.value.email &&
        formData.value.password &&
        formData.value.confirmPassword &&
        formData.value.firstName &&
        formData.value.lastName &&
        formData.value.password === formData.value.confirmPassword &&
        formData.value.password.length >= 6
      );
    });

    const handleLogin = async () => {
      try {
        await authStore.signIn(formData.value.email, formData.value.password);
        router.push('/');
      } catch (error) {
        console.error('Login error:', error);
      }
    };

    const handleRegister = async () => {
      if (formData.value.password !== formData.value.confirmPassword) {
        authStore.error = 'Passwords do not match';
        return;
      }

      try {
        await authStore.register({
          email: formData.value.email,
          password: formData.value.password,
          firstName: formData.value.firstName,
          lastName: formData.value.lastName,
          role: formData.value.role
        });
        
        successMessage.value = 'Account created successfully! Please check your email for verification.';
        mode.value = 'login';
        
        // Clear form
        formData.value = {
          email: formData.value.email, // Keep email for login
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          role: 'user'
        };
      } catch (error) {
        console.error('Registration error:', error);
      }
    };

    const handleForgotPassword = async () => {
      try {
        await authStore.resetPassword(formData.value.email);
        successMessage.value = 'Password reset email sent! Check your inbox.';
        mode.value = 'login';
      } catch (error) {
        console.error('Password reset error:', error);
      }
    };

    onMounted(() => {
      // Clear any existing errors
      authStore.clearError();
      
      // If user is already authenticated, redirect to home
      if (authStore.isAuthenticated) {
        router.push('/');
      }
    });

    return {
      mode,
      formData,
      successMessage,
      authStore,
      isFormValid,
      isRegisterFormValid,
      handleLogin,
      handleRegister,
      handleForgotPassword
    };
  }
};
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.auth-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
  padding: 40px;
  margin: 0 auto;
  box-sizing: border-box;
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.auth-header h1 {
  color: #333;
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 700;
}

.auth-header p {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
}

.auth-form h2 {
  text-align: center;
  color: #333;
  margin: 0 0 30px 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.form-description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  line-height: 1.5;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-group {
  margin-bottom: 20px;
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

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-actions {
  margin: 30px 0 20px 0;
}

.btn-primary {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.auth-links {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.auth-links span {
  margin: 0 8px;
}

.link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.error-message,
.success-message {
  margin-top: 20px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  position: relative;
  line-height: 1.4;
}

.error-message {
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-message {
  background-color: #d1fae5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.error-close,
.success-close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.error-close:hover,
.success-close:hover {
  opacity: 1;
}

@media (max-width: 480px) {
  .auth-container {
    position: relative;
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }
  
  .auth-card {
    padding: 30px 20px;
    margin: 0;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .auth-header h1 {
    font-size: 1.5rem;
  }
}

@media (min-width: 481px) {
  .auth-container {
    position: fixed;
  }
  
  .auth-card {
    min-width: 450px;
  }
}
</style>

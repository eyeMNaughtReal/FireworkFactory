import { useAuthStore } from '../stores/auth.js';

/**
 * Route guard to require authentication
 */
export const requireAuth = (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    // Redirect to login with return URL
    next({ 
      name: 'auth', 
      query: { redirect: to.fullPath } 
    });
  } else {
    next();
  }
};

/**
 * Route guard to require specific role
 */
export const requireRole = (requiredRole) => {
  return (to, from, next) => {
    const authStore = useAuthStore();
    
    if (!authStore.isAuthenticated) {
      next({ 
        name: 'auth', 
        query: { redirect: to.fullPath } 
      });
    } else if (!authStore.hasPermission(requiredRole)) {
      // Redirect to home with error
      next({ 
        name: 'home', 
        query: { error: 'insufficient_permissions' } 
      });
    } else {
      next();
    }
  };
};

/**
 * Route guard to require admin role
 */
export const requireAdmin = (to, from, next) => {
  const authStore = useAuthStore();
  
  if (!authStore.isAuthenticated) {
    next({ 
      name: 'auth', 
      query: { redirect: to.fullPath } 
    });
  } else if (!authStore.isAdmin) {
    next({ 
      name: 'home', 
      query: { error: 'admin_required' } 
    });
  } else {
    next();
  }
};

/**
 * Route guard to redirect authenticated users away from auth pages
 */
export const guestOnly = (to, from, next) => {
  const authStore = useAuthStore();
  
  if (authStore.isAuthenticated) {
    // Redirect to intended destination or home
    const redirect = to.query.redirect || '/';
    next(redirect);
  } else {
    next();
  }
};

# Subdomain Authentication Protection Plan

## Executive Summary

This document outlines a comprehensive strategy for implementing authentication-based access control for the subdomains `ai-trl.equussystems.co` and `ai-tutot.equussystems.co`. The solution leverages the existing JWT authentication system from the main Equus application to ensure only authorized users can access these protected resources.

## Problem Statement

### Current State
- **Main Domain**: `equussystems.co` - Complete authentication system with JWT tokens, role-based access control
- **Subdomains**: `ai-trl.equussystems.co` and `ai-tutot.equussystems.co` - Currently unprotected, accessible to anyone
- **Security Gap**: No authentication barrier preventing unauthorized access to subdomain applications

### Requirements
1. **Access Control**: Only authenticated users from main system can access subdomains
2. **Role-Based Access**: Different access levels based on user roles (admin, user)
3. **Seamless UX**: Transparent authentication without multiple login prompts
4. **Scalability**: Easy to add/modify subdomain access rules
5. **Security**: Enterprise-grade protection with audit logging

## Current Authentication System Analysis

### ✅ **Strong Foundation Available**
- **JWT-based Authentication**: Secure token system with refresh tokens
- **Role-Based Access Control**: Admin and user roles with custom permissions
- **Secure Middleware**: Complete auth.js middleware with token verification
- **User Management**: Account status controls (active, suspended, locked)
- **CORS Configuration**: Already configured for cross-domain requests
- **Database Integration**: MongoDB with User model and authentication services

### **Existing Auth Components**
```javascript
// Available in /api/middleware/auth.js
- auth()                    // Main authentication middleware
- optionalAuth()           // Optional authentication
- requireAuth()            // Require authentication
- requireEmailVerification() // Email verification check
- requireActiveUser()      // Active user validation

// Available in /api/middleware/roles.js
- requireRole(roles)       // Specific role requirement
- requireAdmin()           // Admin access only
- requirePermission(perm)  // Permission-based access
- requireMinimumRole()     // Role hierarchy check

// Available in /api/utils/authService.js
- verifyToken(token)       // JWT token validation
- generateToken(userId)    // Token generation
- validatePassword()       // Password validation
- generateUserResponse()   // Safe user data response
```

## Frontend User Flow Integration

### **Authenticated User Journey from Main Application to Subdomains**

Based on the existing User Dashboard implementation, authenticated users access protected subdomains through a seamless flow that leverages the main application's authentication state:

#### **User Flow Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Dashboard  │───▶│ Subdomain Link  │───▶│ Auth Guard      │───▶│ Protected       │
│ (Main App)      │    │ Click/Navigate  │    │ Validation      │    │ Subdomain App   │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ JWT Token       │    │ Token Transfer  │    │ Role-Based      │    │ User Context    │
│ Available       │    │ (localStorage)  │    │ Access Check    │    │ Available       │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### **Dashboard Integration Example**

**Enhanced User Dashboard with Subdomain Access:**
```javascript
// client/src/pages/user/Dashboard.jsx - Enhanced Quick Actions
<CardContent className="space-y-3 pt-2">
  <Button variant="outline" className="w-full justify-start" asChild>
    <Link to="/profile">
      👤 Edit Profile
    </Link>
  </Button>
  <Button variant="outline" className="w-full justify-start" asChild>
    <Link to="/settings">
      ⚙️ Account Settings
    </Link>
  </Button>
  
  {/* NEW: Subdomain Access Section */}
  {user?.role === 'admin' || user?.role === 'user' ? (
    <div className="border-t pt-3 mt-3">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
        Protected Resources
      </p>
      
      {/* AI Training Platform - Available to all authenticated users */}
      <Button 
        variant="outline" 
        className="w-full justify-start mb-2"
        onClick={() => accessProtectedSubdomain('ai-trl')}
      >
        🤖 AI Training Platform
        <Badge variant="secondary" className="ml-auto">
          {user?.role}
        </Badge>
      </Button>
      
      {/* AI Tutorial Platform - Admin only */}
      {user?.role === 'admin' && (
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => accessProtectedSubdomain('ai-tutot')}
        >
          📚 AI Tutorial Platform
          <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-800">
            Admin Only
          </Badge>
        </Button>
      )}
    </div>
  ) : (
    <div className="border-t pt-3 mt-3">
      <p className="text-xs text-muted-foreground mb-2">
        Additional resources available after account verification
      </p>
    </div>
  )}
  
  <Button 
    variant="outline" 
    className="w-full justify-start"
    onClick={loadUserData}
  >
    🔄 Refresh Data
  </Button>
</CardContent>
```

#### **Subdomain Access Handler**
```javascript
// client/src/utils/subdomainAccess.js
import authService from '@/services/authService';
import { toast } from '@/components/ui/use-toast';

/**
 * Handles secure access to protected subdomains
 * Ensures authentication tokens are properly transferred
 */
export const accessProtectedSubdomain = async (subdomain) => {
  try {
    // Verify current authentication state
    const currentUser = await authService.getCurrentUser();
    
    if (!currentUser.success) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access protected resources.",
        variant: "destructive"
      });
      return;
    }
    
    // Check user permissions for subdomain
    const hasAccess = checkSubdomainPermissions(currentUser.user, subdomain);
    
    if (!hasAccess) {
      toast({
        title: "Access Denied",
        description: `Your account doesn't have permission to access ${getSubdomainName(subdomain)}.`,
        variant: "destructive"
      });
      return;
    }
    
    // Ensure authentication tokens are available for subdomain
    const token = localStorage.getItem('equus_auth_token');
    const refreshToken = localStorage.getItem('equus_refresh_token');
    
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Authentication token not found. Please log in again.",
        variant: "destructive"
      });
      return;
    }
    
    // Show loading state
    toast({
      title: "Accessing Protected Resource",
      description: `Connecting to ${getSubdomainName(subdomain)}...`,
    });
    
    // Navigate to subdomain with authentication context
    const subdomainUrl = `https://${subdomain}.equussystems.co`;
    
    // Open in same window for seamless experience
    window.location.href = subdomainUrl;
    
  } catch (error) {
    console.error('Subdomain access error:', error);
    toast({
      title: "Access Error",
      description: "Failed to access protected resource. Please try again.",
      variant: "destructive"
    });
  }
};

/**
 * Check if user has permission to access specific subdomain
 */
const checkSubdomainPermissions = (user, subdomain) => {
  const subdomainRules = {
    'ai-trl': {
      allowedRoles: ['admin', 'user'],
      requireEmailVerification: true
    },
    'ai-tutot': {
      allowedRoles: ['admin'],
      requireEmailVerification: true
    }
  };
  
  const rules = subdomainRules[subdomain];
  if (!rules) return false;
  
  // Check role permission
  if (!rules.allowedRoles.includes(user.role)) {
    return false;
  }
  
  // Check email verification
  if (rules.requireEmailVerification && !user.emailVerified) {
    return false;
  }
  
  // Check account status
  if (!user.isActive || user.accountStatus !== 'active') {
    return false;
  }
  
  return true;
};

/**
 * Get human-readable subdomain names
 */
const getSubdomainName = (subdomain) => {
  const names = {
    'ai-trl': 'AI Training & Learning Platform',
    'ai-tutot': 'AI Tutorial Platform'
  };
  return names[subdomain] || subdomain;
};
```

#### **Authentication Token Flow Between Domains**

**Token Sharing Strategy:**
```javascript
// client/src/contexts/AuthContext.jsx - Enhanced for subdomain support
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ... existing auth state ...
  
  // Enhanced login function with subdomain token support
  const login = async (credentials, rememberMe = false) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Store tokens for main domain
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('equus_auth_token', response.token);
        
        if (response.refreshToken) {
          storage.setItem('equus_refresh_token', response.refreshToken);
        }
        
        // IMPORTANT: Also set domain-wide cookies for subdomain access
        setDomainWideCookies(response.token, response.refreshToken, rememberMe);
        
        return response;
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  
  // Set authentication cookies accessible to all subdomains
  const setDomainWideCookies = (token, refreshToken, persistent) => {
    const maxAge = persistent ? 7 * 24 * 60 * 60 * 1000 : null; // 7 days or session
    const domain = '.equussystems.co'; // Available to all subdomains
    
    // Set secure, httpOnly-like cookies via API call
    // Since client-side can't set httpOnly, we work with API to set secure cookies
    authService.setSecureCookies(token, refreshToken, { domain, maxAge });
    
    // Fallback: Set accessible cookies for client-side subdomain guards
    document.cookie = `equus_auth_fallback=${token}; Domain=${domain}; Path=/; ${persistent ? `Max-Age=${maxAge/1000}` : ''}; Secure; SameSite=Lax`;
  };
  
  // Enhanced logout with subdomain cleanup
  const logout = async () => {
    try {
      // Clear main domain storage
      localStorage.removeItem('equus_auth_token');
      localStorage.removeItem('equus_refresh_token');
      sessionStorage.removeItem('equus_auth_token');
      sessionStorage.removeItem('equus_refresh_token');
      
      // Clear domain-wide cookies
      document.cookie = 'equus_auth_fallback=; Domain=.equussystems.co; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Lax';
      
      // API call to clear server-side secure cookies
      await authService.clearSecureCookies();
      
      // Update auth state
      setUser(null);
      setIsAuthenticated(false);
      
      // API logout call
      await authService.logout();
      
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };
  
  // ... rest of context implementation
};
```

#### **Subdomain Access Status Indicators**

**Dashboard Status Cards for Subdomain Access:**
```javascript
// client/src/components/dashboard/SubdomainStatusCard.jsx
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const SubdomainStatusCard = ({ user }) => {
  const getAccessibleSubdomains = () => {
    const subdomains = [];
    
    // AI Training Platform - All authenticated users
    if (user?.role === 'admin' || user?.role === 'user') {
      subdomains.push({
        id: 'ai-trl',
        name: 'AI Training Platform',
        description: 'Machine learning training resources',
        status: user?.emailVerified ? 'accessible' : 'verification_required',
        icon: '🤖'
      });
    }
    
    // AI Tutorial Platform - Admin only
    if (user?.role === 'admin') {
      subdomains.push({
        id: 'ai-tutot',
        name: 'AI Tutorial Platform',
        description: 'Advanced AI tutorials and documentation',
        status: 'accessible',
        icon: '📚'
      });
    }
    
    return subdomains;
  };
  
  const accessibleSubdomains = getAccessibleSubdomains();
  
  if (accessibleSubdomains.length === 0) {
    return null;
  }
  
  return (
    <Card className="equus-card">
      <CardHeader className="pb-4">
        <CardTitle>Protected Resources Access</CardTitle>
        <CardDescription>
          Specialized platforms available to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        {accessibleSubdomains.map(subdomain => (
          <div key={subdomain.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{subdomain.icon}</span>
              <div>
                <h4 className="font-medium text-sm">{subdomain.name}</h4>
                <p className="text-xs text-muted-foreground">{subdomain.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {subdomain.status === 'accessible' ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Available
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Verify Email
                </Badge>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => accessProtectedSubdomain(subdomain.id)}
                disabled={subdomain.status !== 'accessible'}
              >
                Access
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SubdomainStatusCard;
```

## Solution Architecture Options

### **Option 1A: Frontend-Based Authentication Guard (🔥 RECOMMENDED for Shared Hosting)**

#### **Architecture Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Request  │───▶│ Subdomain       │───▶│ Auth Guard (JS) │
│   (Browser)     │    │ Frontend App    │    │ + API Validation│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ App Loads       │    │ Main Auth API   │
                       │ (if authorized) │    │ (JWT validation)│
                       └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Continue to App │    │ Redirect to     │
                       │ Content         │    │ Login (if fail) │
                       └─────────────────┘    └─────────────────┘
```

**Perfect for**: Shared hosting environments (cPanel), static hosting, CDN deployments

#### **Implementation Details**

**Project Structure for Shared Hosting:**
```
subdomain-auth-guard/
├── lib/
│   ├── auth-guard.js              # Core authentication library
│   ├── token-validator.js         # JWT token validation utilities
│   ├── session-manager.js         # Session and storage management
│   └── api-client.js              # API communication wrapper
├── guards/
│   ├── ai-trl-guard.js           # AI-TRL subdomain protection
│   ├── ai-tutot-guard.js         # AI-TUTOT subdomain protection
│   └── base-guard.js             # Shared guard functionality
├── styles/
│   ├── loading.css               # Loading and auth UI styles
│   └── auth-overlay.css          # Authentication overlay styles
├── config/
│   ├── subdomain-config.js       # Access rules and configuration
│   └── api-endpoints.js          # API endpoint configuration
└── examples/
    ├── index.html                # Example implementation
    └── integration-guide.md      # Integration instructions
```

### **React Integration with Frontend-Based Guard**

**Enhanced Authentication Guard with React Context Integration:**
```javascript
// lib/auth-guard-react.js - React-specific implementation
import { toast } from '@/components/ui/use-toast';

class ReactSubdomainAuthGuard {
  constructor(config) {
    this.config = {
      mainApiUrl: 'https://equussystems.co/api',
      loginUrl: 'https://equussystems.co/auth/signin',
      allowedRoles: ['user', 'admin'],
      requireEmailVerification: true,
      storageKey: 'equus_auth_token',
      refreshKey: 'equus_refresh_token',
      // React-specific configurations
      showToastNotifications: true,
      useReactRouter: true,
      fallbackComponent: null,
      ...config
    };
    
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    this.reactContext = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Show React-compatible loading state
      this.showReactLoadingState();
      
      // Try to get token from React app's storage management
      this.token = this.getReactStoredToken();
      
      if (!this.token) {
        this.redirectToReactLogin('No authentication token found');
        return;
      }
      
      // Validate token with main authentication API (compatible with existing authService)
      const validation = await this.validateTokenWithReactAPI(this.token);
      
      if (!validation.success) {
        this.clearReactStoredAuth();
        this.redirectToReactLogin(validation.error || 'Authentication failed');
        return;
      }
      
      // Check user permissions for this subdomain (using same logic as main app)
      const hasAccess = this.checkSubdomainAccess(validation.user);
      
      if (!hasAccess) {
        this.showReactAccessDenied(validation.user);
        return;
      }
      
      // Authentication successful - integrate with React state
      this.user = validation.user;
      this.isAuthenticated = true;
      this.hideReactLoadingState();
      this.onReactAuthenticationSuccess();
      
    } catch (error) {
      console.error('React Authentication error:', error);
      this.showReactError('Authentication service error');
    }
  }

  async validateTokenWithReactAPI(token) {
    try {
      // Use same validation endpoint as main React app
      const response = await fetch(`${this.config.mainApiUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token using same strategy as main app
          const refreshResult = await this.tryReactRefreshToken();
          if (refreshResult.success) {
            return this.validateTokenWithReactAPI(refreshResult.token);
          }
        }
        throw new Error(`API validation failed: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        user: data.user
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  checkSubdomainAccess(user) {
    // Use same permission logic as main React app
    if (!this.config.allowedRoles.includes(user.role)) {
      return false;
    }
    
    if (this.config.requireEmailVerification && !user.emailVerified) {
      return false;
    }
    
    if (!user.isActive || user.accountStatus !== 'active' || user.isLocked) {
      return false;
    }
    
    return true;
  }

  getReactStoredToken() {
    // Compatible with React app's token storage strategy
    let token = localStorage.getItem(this.config.storageKey);
    
    if (!token) {
      token = sessionStorage.getItem(this.config.storageKey);
    }
    
    // Also check for domain-wide cookie fallback
    if (!token) {
      token = this.getCookieValue('equus_auth_fallback');
    }
    
    return token;
  }

  async tryReactRefreshToken() {
    try {
      const refreshToken = localStorage.getItem(this.config.refreshKey) || 
                          sessionStorage.getItem(this.config.refreshKey);
      
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      // Use same refresh endpoint as main React app
      const response = await fetch(`${this.config.mainApiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Store new token using React app's strategy
      localStorage.setItem(this.config.storageKey, data.token);
      if (data.refreshToken) {
        localStorage.setItem(this.config.refreshKey, data.refreshToken);
      }
      
      return { success: true, token: data.token };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  showReactLoadingState() {
    // Check if we should integrate with existing React loading systems
    if (window.ReactDOM && this.config.useReactIntegration) {
      this.showReactComponentLoader();
    } else {
      this.showStandardLoadingState();
    }
  }

  showReactComponentLoader() {
    // Create a React-compatible loading component
    const loadingHTML = `
      <div id="react-auth-loading" class="min-h-screen flex items-center justify-center bg-white">
        <div class="text-center max-w-md mx-auto p-6">
          <!-- Spinner matching React app design -->
          <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          
          <!-- Title matching React app styling -->
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Authenticating Access
          </h3>
          
          <!-- Description -->
          <p class="text-sm text-gray-600 mb-4">
            Verifying your permissions for this protected resource...
          </p>
          
          <!-- Progress indicator -->
          <div class="w-full bg-gray-200 rounded-full h-1 mb-4">
            <div class="bg-blue-600 h-1 rounded-full animate-pulse" style="width: 60%"></div>
          </div>
          
          <!-- Branding consistent with main app -->
          <p class="text-xs text-gray-400">
            Powered by Equus Systems Authentication
          </p>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
  }

  showReactAccessDenied(user) {
    // React-compatible access denied UI
    const deniedHTML = `
      <div id="react-auth-denied" class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div class="max-w-md w-full">
          <!-- Card container matching React UI components -->
          <div class="bg-white rounded-lg shadow-lg border p-6 text-center">
            <!-- Icon -->
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            
            <!-- Title -->
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Access Restricted
            </h2>
            
            <!-- User greeting -->
            <p class="text-gray-600 mb-4">
              Hello ${user.firstName}, you don't have permission to access this resource.
            </p>
            
            <!-- Permission details -->
            <div class="bg-gray-50 rounded-lg p-4 mb-6">
              <div class="text-sm">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-gray-600">Required:</span>
                  <span class="font-medium text-gray-900">${this.config.allowedRoles.join(' or ')}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Your role:</span>
                  <span class="font-medium text-gray-900">${user.role}</span>
                </div>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="space-y-3">
              <button 
                onclick="window.location.href='${this.config.loginUrl}'"
                class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Return to Dashboard
              </button>
              <button 
                onclick="window.history.back()"
                class="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Go Back
              </button>
            </div>
            
            <!-- Support link -->
            <p class="text-xs text-gray-500 mt-4">
              Need access? <a href="mailto:support@equussystems.co" class="text-blue-600 hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', deniedHTML);
  }

  showReactError(message) {
    // React-compatible error notification
    if (this.config.showToastNotifications && window.toast) {
      window.toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive"
      });
    } else {
      console.error('Authentication error:', message);
      alert(`Authentication Error: ${message}`);
    }
  }

  redirectToReactLogin(reason = 'Authentication required') {
    const currentUrl = encodeURIComponent(window.location.href);
    const returnUrl = `?returnUrl=${currentUrl}`;
    const reasonParam = reason ? `&reason=${encodeURIComponent(reason)}` : '';
    
    // Check if using React Router
    if (this.config.useReactRouter && window.ReactRouter) {
      // Use React Router navigation if available
      window.ReactRouter.push(`/auth/signin${returnUrl}${reasonParam}`);
    } else {
      // Fallback to standard navigation
      const loginUrl = `${this.config.loginUrl}${returnUrl}${reasonParam}`;
      
      setTimeout(() => {
        window.location.href = loginUrl;
      }, 1500); // Give time for any loading states to show
    }
  }

  onReactAuthenticationSuccess() {
    // Integration with React state management
    const authEvent = new CustomEvent('reactAuthGuardSuccess', {
      detail: {
        user: this.user,
        token: this.token,
        isAuthenticated: this.isAuthenticated,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(authEvent);
    
    // Make auth data available globally (compatible with existing React context)
    window.equusSubdomainAuth = {
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      hasRole: (role) => this.user.role === role,
      hasAnyRole: (roles) => roles.includes(this.user.role),
      token: this.token
    };
    
    // Show success notification
    if (this.config.showToastNotifications && window.toast) {
      window.toast({
        title: "Access Granted",
        description: `Welcome to ${this.getSubdomainFriendlyName()}`,
        variant: "default"
      });
    }
  }

  getSubdomainFriendlyName() {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    const names = {
      'ai-trl': 'AI Training & Learning Platform',
      'ai-tutot': 'AI Tutorial Platform'
    };
    
    return names[subdomain] || 'Protected Resource';
  }

  hideReactLoadingState() {
    const loader = document.getElementById('react-auth-loading');
    if (loader) {
      loader.remove();
    }
  }

  clearReactStoredAuth() {
    // Clear all auth storage (same as main React app)
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(this.config.refreshKey);
    sessionStorage.removeItem(this.config.storageKey);
    sessionStorage.removeItem(this.config.refreshKey);
    
    // Clear domain-wide cookies
    document.cookie = `equus_auth_fallback=; Domain=.equussystems.co; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Lax`;
    document.cookie = `${this.config.storageKey}=; Domain=.equussystems.co; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; Secure; SameSite=Lax`;
  }

  getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
}

// Export for React integration
window.ReactSubdomainAuthGuard = ReactSubdomainAuthGuard;
```

**Core Authentication Guard:**
```javascript
// lib/auth-guard.js
class SubdomainAuthGuard {
  constructor(config) {
    this.config = {
      mainApiUrl: 'https://equussystems.co/api',
      loginUrl: 'https://equussystems.co/auth/signin',
      allowedRoles: ['user', 'admin'],
      requireEmailVerification: true,
      storageKey: 'equus_auth_token',
      refreshKey: 'equus_refresh_token',
      ...config
    };
    
    this.isAuthenticated = false;
    this.user = null;
    this.token = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Show loading state
      this.showLoadingState();
      
      // Try to get token from storage
      this.token = this.getStoredToken();
      
      if (!this.token) {
        this.redirectToLogin('No authentication token found');
        return;
      }
      
      // Validate token with main authentication API
      const validation = await this.validateTokenWithAPI(this.token);
      
      if (!validation.success) {
        this.clearStoredAuth();
        this.redirectToLogin(validation.error || 'Authentication failed');
        return;
      }
      
      // Check user permissions for this subdomain
      const hasAccess = this.checkSubdomainAccess(validation.user);
      
      if (!hasAccess) {
        this.showAccessDenied(validation.user);
        return;
      }
      
      // Authentication successful
      this.user = validation.user;
      this.isAuthenticated = true;
      this.hideLoadingState();
      this.onAuthenticationSuccess();
      
    } catch (error) {
      console.error('Authentication error:', error);
      this.redirectToLogin('Authentication service error');
    }
  }

  async validateTokenWithAPI(token) {
    try {
      const response = await fetch(`${this.config.mainApiUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Try to refresh token
          const refreshResult = await this.tryRefreshToken();
          if (refreshResult.success) {
            return this.validateTokenWithAPI(refreshResult.token);
          }
        }
        throw new Error(`API validation failed: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        user: data.user
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  checkSubdomainAccess(user) {
    // Check if user role is allowed
    if (!this.config.allowedRoles.includes(user.role)) {
      return false;
    }
    
    // Check email verification if required
    if (this.config.requireEmailVerification && !user.emailVerified) {
      return false;
    }
    
    // Check account status
    if (!user.isActive || user.accountStatus === 'suspended' || user.isLocked) {
      return false;
    }
    
    return true;
  }

  getStoredToken() {
    // Try localStorage first
    let token = localStorage.getItem(this.config.storageKey);
    
    // Try sessionStorage as fallback
    if (!token) {
      token = sessionStorage.getItem(this.config.storageKey);
    }
    
    // Try cookies as last resort
    if (!token) {
      token = this.getCookieValue(this.config.storageKey);
    }
    
    return token;
  }

  async tryRefreshToken() {
    try {
      const refreshToken = localStorage.getItem(this.config.refreshKey) || 
                          sessionStorage.getItem(this.config.refreshKey);
      
      if (!refreshToken) {
        return { success: false, error: 'No refresh token available' };
      }
      
      const response = await fetch(`${this.config.mainApiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      // Store new token
      localStorage.setItem(this.config.storageKey, data.token);
      if (data.refreshToken) {
        localStorage.setItem(this.config.refreshKey, data.refreshToken);
      }
      
      return { success: true, token: data.token };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  showLoadingState() {
    const loadingHTML = `
      <div id="auth-loading-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          margin: 1rem;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          "></div>
          <h3 style="margin: 0 0 0.5rem; color: #333;">Authenticating...</h3>
          <p style="margin: 0; color: #666; font-size: 0.9rem;">
            Verifying your access to this resource
          </p>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
  }

  hideLoadingState() {
    const overlay = document.getElementById('auth-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  showAccessDenied(user) {
    const deniedHTML = `
      <div id="auth-denied-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 500px;
          margin: 1rem;
          border-left: 4px solid #dc3545;
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🚫</div>
          <h2 style="margin: 0 0 1rem; color: #dc3545;">Access Denied</h2>
          <p style="margin: 0 0 1rem; color: #666;">
            Hello ${user.firstName}, you don't have permission to access this resource.
          </p>
          <p style="margin: 0 0 1.5rem; color: #666; font-size: 0.9rem;">
            Required: ${this.config.allowedRoles.join(' or ')} role<br>
            Your role: ${user.role}
          </p>
          <button onclick="window.location.href='${this.config.loginUrl}'" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            margin-right: 1rem;
          ">
            Return to Main Site
          </button>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          ">
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', deniedHTML);
  }

  redirectToLogin(reason = 'Authentication required') {
    const currentUrl = encodeURIComponent(window.location.href);
    const loginUrl = `${this.config.loginUrl}?returnUrl=${currentUrl}&reason=${encodeURIComponent(reason)}`;
    
    // Small delay to show any loading states
    setTimeout(() => {
      window.location.href = loginUrl;
    }, 1000);
  }

  clearStoredAuth() {
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(this.config.refreshKey);
    sessionStorage.removeItem(this.config.storageKey);
    sessionStorage.removeItem(this.config.refreshKey);
    
    // Clear auth cookies
    document.cookie = `${this.config.storageKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.equussystems.co;`;
  }

  getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  onAuthenticationSuccess() {
    // Dispatch custom event for application to handle
    window.dispatchEvent(new CustomEvent('authGuardSuccess', {
      detail: {
        user: this.user,
        token: this.token,
        isAuthenticated: this.isAuthenticated
      }
    }));
    
    // Add user info to global scope for easy access
    window.equusAuth = {
      user: this.user,
      isAuthenticated: this.isAuthenticated,
      hasRole: (role) => this.user.role === role,
      hasAnyRole: (roles) => roles.includes(this.user.role)
    };
  }
}

// Export for use
window.SubdomainAuthGuard = SubdomainAuthGuard;
```

**Subdomain-Specific Guards:**
```javascript
// guards/ai-trl-guard.js
(function() {
  'use strict';
  
  // Configuration for AI-TRL subdomain
  const authGuard = new SubdomainAuthGuard({
    allowedRoles: ['admin', 'user'],
    requireEmailVerification: true,
    subdomain: 'ai-trl',
    subdomainName: 'AI Training & Learning Platform'
  });
  
  // Wait for authentication before initializing app
  window.addEventListener('authGuardSuccess', function(event) {
    console.log('AI-TRL: Authentication successful for', event.detail.user.email);
    
    // Initialize your application here
    if (typeof initializeAITRLApp === 'function') {
      initializeAITRLApp(event.detail.user);
    }
  });
  
})();

// guards/ai-tutot-guard.js
(function() {
  'use strict';
  
  // Configuration for AI-TUTOT subdomain (Admin only)
  const authGuard = new SubdomainAuthGuard({
    allowedRoles: ['admin'],
    requireEmailVerification: true,
    subdomain: 'ai-tutot',
    subdomainName: 'AI Tutorial Platform (Admin Only)'
  });
  
  // Wait for authentication before initializing app
  window.addEventListener('authGuardSuccess', function(event) {
    console.log('AI-TUTOT: Admin authentication successful for', event.detail.user.email);
    
    // Initialize your admin application here
    if (typeof initializeAITutotApp === 'function') {
      initializeAITutotApp(event.detail.user);
    }
  });
  
})();
```

### **Seamless UX Implementation for Subdomain Transitions**

#### **Loading State Management with Cold Start Detection**
```javascript
// client/src/hooks/useSubdomainTransition.js
import { useState, useCallback } from 'react';
import { useColdStartAwareLoading } from '@/hooks/useColdStartAwareLoading';
import { toast } from '@/components/ui/use-toast';

export const useSubdomainTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState(null);
  
  // Use existing cold start detection for subdomain transitions
  const {
    isLoading,
    setLoading,
    shouldShowColdStartUI,
    loadingState
  } = useColdStartAwareLoading(false);

  const transitionToSubdomain = useCallback(async (subdomain, options = {}) => {
    try {
      setIsTransitioning(true);
      setTransitionTarget(subdomain);
      setLoading(true);
      
      const {
        showProgressToast = true,
        validateBeforeTransition = true,
        timeoutMs = 10000
      } = options;
      
      // Show immediate progress indication
      if (showProgressToast) {
        toast({
          title: "Connecting...",
          description: `Opening ${getSubdomainDisplayName(subdomain)}`,
          duration: 2000
        });
      }
      
      // Validate authentication if requested
      if (validateBeforeTransition) {
        const isValid = await validateCurrentAuthentication();
        if (!isValid) {
          throw new Error('Authentication validation failed');
        }
      }
      
      // Check if we should show cold start UI based on timing
      let transitionStartTime = Date.now();
      
      // Set up timeout protection
      const timeoutId = setTimeout(() => {
        if (shouldShowColdStartUI && shouldShowColdStartUI()) {
          // Show cold start information if transition is taking too long
          showColdStartTransitionUI(subdomain, transitionStartTime);
        }
      }, 5000); // Show after 5 seconds
      
      // Prepare subdomain URL with auth context
      const subdomainUrl = buildSubdomainUrl(subdomain);
      
      // Clean navigation to subdomain
      window.location.href = subdomainUrl;
      
      // Clear timeout if we get here (shouldn't happen due to navigation)
      clearTimeout(timeoutId);
      
    } catch (error) {
      console.error('Subdomain transition error:', error);
      
      // Show error with recovery options
      toast({
        title: "Connection Failed",
        description: error.message || 'Unable to access the protected resource.',
        variant: "destructive",
        action: (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => transitionToSubdomain(subdomain, { ...options, validateBeforeTransition: false })}
          >
            Retry
          </Button>
        )
      });
      
    } finally {
      setIsTransitioning(false);
      setTransitionTarget(null);
      setLoading(false);
    }
  }, [setLoading, shouldShowColdStartUI]);

  const showColdStartTransitionUI = (subdomain, startTime) => {
    const elapsedTime = Date.now() - startTime;
    const estimatedTotalTime = Math.max(60000, elapsedTime + 30000); // At least 60s total
    
    toast({
      title: "Connecting to Protected Service",
      description: (
        <div className="space-y-2">
          <p>This may take up to 60 seconds on the first access.</p>
          <div className="text-xs text-muted-foreground">
            The service is starting up securely...
          </div>
        </div>
      ),
      duration: 15000 // Show for longer during cold start
    });
  };

  return {
    transitionToSubdomain,
    isTransitioning,
    transitionTarget,
    loadingState
  };
};
```

#### **Enhanced User Experience Components**
```javascript
// client/src/components/subdomain/SubdomainAccessButton.jsx
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubdomainTransition } from '@/hooks/useSubdomainTransition';
import { useAuth } from '@/contexts/AuthContext';
import ColdStartLoader from '@/components/ui/ColdStartLoader';

const SubdomainAccessButton = ({ 
  subdomain, 
  title, 
  description, 
  icon, 
  requiredRoles = ['user', 'admin'],
  className = '' 
}) => {
  const { user } = useAuth();
  const { transitionToSubdomain, isTransitioning, transitionTarget, loadingState } = useSubdomainTransition();
  
  const hasAccess = user && requiredRoles.includes(user.role) && user.emailVerified;
  const isCurrentlyTransitioning = isTransitioning && transitionTarget === subdomain;
  
  const handleAccess = async () => {
    if (!hasAccess) return;
    
    await transitionToSubdomain(subdomain, {
      showProgressToast: true,
      validateBeforeTransition: true
    });
  };
  
  if (isCurrentlyTransitioning && loadingState?.coldStartTime) {
    return (
      <div className={`relative ${className}`}>
        <ColdStartLoader
          startTime={loadingState.coldStartTime}
          size="sm"
          message={`Connecting to ${title}...`}
          showProgress={true}
        />
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        className={`w-full justify-start group transition-all duration-200 ${
          !hasAccess ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'
        }`}
        onClick={handleAccess}
        disabled={!hasAccess || isCurrentlyTransitioning}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <div className="text-left">
              <div className="font-medium text-sm">{title}</div>
              {description && (
                <div className="text-xs text-muted-foreground">{description}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Access indicator */}
            {hasAccess ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Available
              </Badge>
            ) : !user?.emailVerified ? (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Verify Email
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                No Access
              </Badge>
            )}
            
            {/* Loading indicator */}
            {isCurrentlyTransitioning && (
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
        </div>
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200" />
      </Button>
      
      {/* Tooltip for restricted access */}
      {!hasAccess && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          {!user?.emailVerified 
            ? 'Email verification required for access'
            : `Requires ${requiredRoles.join(' or ')} role`
          }
        </div>
      )}
    </div>
  );
};
```

#### **Enhanced Transition Notifications**
```javascript
// client/src/components/subdomain/TransitionNotifications.jsx
import { useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const TransitionNotifications = () => {
  useEffect(() => {
    // Listen for subdomain transition events
    const handleTransitionStart = (event) => {
      const { subdomain, estimatedTime } = event.detail;
      
      toast({
        title: "Accessing Protected Resource",
        description: (
          <div className="space-y-2">
            <p>Opening {getSubdomainDisplayName(subdomain)}...</p>
            {estimatedTime > 10000 && (
              <div className="text-xs text-muted-foreground">
                This may take {Math.ceil(estimatedTime / 1000)} seconds
              </div>
            )}
          </div>
        ),
        duration: Math.min(estimatedTime * 0.8, 8000)
      });
    };
    
    const handleTransitionError = (event) => {
      const { subdomain, error, retry } = event.detail;
      
      toast({
        title: "Connection Failed",
        description: `Unable to access ${getSubdomainDisplayName(subdomain)}`,
        variant: "destructive",
        action: retry && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={retry}
          >
            Try Again
          </Button>
        ),
        duration: 10000
      });
    };
    
    const handleSlowConnection = (event) => {
      const { subdomain, duration } = event.detail;
      
      toast({
        title: "Still Connecting...",
        description: (
          <div className="space-y-1">
            <p>Securing your connection to {getSubdomainDisplayName(subdomain)}</p>
            <div className="text-xs text-muted-foreground">
              Security validation in progress ({Math.ceil(duration / 1000)}s elapsed)
            </div>
          </div>
        ),
        duration: 8000
      });
    };
    
    // Add event listeners
    window.addEventListener('subdomainTransitionStart', handleTransitionStart);
    window.addEventListener('subdomainTransitionError', handleTransitionError);
    window.addEventListener('subdomainSlowConnection', handleSlowConnection);
    
    // Cleanup
    return () => {
      window.removeEventListener('subdomainTransitionStart', handleTransitionStart);
      window.removeEventListener('subdomainTransitionError', handleTransitionError);
      window.removeEventListener('subdomainSlowConnection', handleSlowConnection);
    };
  }, []);
  
  return null; // This component only handles side effects
};

const getSubdomainDisplayName = (subdomain) => {
  const names = {
    'ai-trl': 'AI Training Platform',
    'ai-tutot': 'AI Tutorial Platform'
  };
  return names[subdomain] || subdomain;
};

export default TransitionNotifications;
```

#### **Progressive Enhancement for Subdomain Applications**
```javascript
// subdomain-app/js/enhanced-initialization.js
class EnhancedSubdomainApp {
  constructor(config) {
    this.config = config;
    this.authGuard = null;
    this.isInitialized = false;
    this.startTime = Date.now();
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Show enhanced loading state
      this.showProgressiveLoader();
      
      // Initialize React-compatible auth guard
      this.authGuard = new ReactSubdomainAuthGuard({
        ...this.config,
        onProgress: this.updateProgress.bind(this),
        onSlowConnection: this.handleSlowConnection.bind(this)
      });
      
      // Wait for authentication success
      window.addEventListener('reactAuthGuardSuccess', this.onAuthSuccess.bind(this));
      
    } catch (error) {
      this.showErrorState(error);
    }
  }
  
  showProgressiveLoader() {
    const loaderHTML = `
      <div id="progressive-loader" class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="text-center max-w-lg mx-auto p-8">
          <!-- App-specific branding -->
          <div class="mb-6">
            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl text-white">${this.config.appIcon || '🔒'}</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              ${this.config.appName || 'Protected Application'}
            </h1>
            <p class="text-gray-600 text-sm">
              ${this.config.appDescription || 'Authenticating your access...'}
            </p>
          </div>
          
          <!-- Progress steps -->
          <div class="space-y-3 mb-6">
            <div class="flex items-center gap-3 text-sm">
              <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <span class="text-gray-700">Verifying authentication tokens</span>
            </div>
            <div id="progress-step-2" class="flex items-center gap-3 text-sm opacity-50">
              <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
              <span class="text-gray-500">Checking access permissions</span>
            </div>
            <div id="progress-step-3" class="flex items-center gap-3 text-sm opacity-50">
              <div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
              <span class="text-gray-500">Loading application</span>
            </div>
          </div>
          
          <!-- Progress bar -->
          <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div id="progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: 25%"></div>
          </div>
          
          <!-- Time indicator -->
          <div id="time-indicator" class="text-xs text-gray-500">
            Elapsed: <span id="elapsed-time">0</span>s
          </div>
          
          <!-- Cold start notice (shown after 5 seconds) -->
          <div id="cold-start-notice" class="hidden mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="text-sm text-blue-800">
              <strong>Secure Loading:</strong> This application is starting up securely. 
              This may take up to 60 seconds on first access.
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
    
    // Start elapsed time counter
    this.startTimeCounter();
    
    // Show cold start notice after 5 seconds
    setTimeout(() => {
      const notice = document.getElementById('cold-start-notice');
      if (notice) notice.classList.remove('hidden');
    }, 5000);
  }
  
  startTimeCounter() {
    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const timeElement = document.getElementById('elapsed-time');
      if (timeElement) {
        timeElement.textContent = elapsed;
      }
      
      if (!this.isInitialized) {
        setTimeout(updateTime, 1000);
      }
    };
    
    updateTime();
  }
  
  updateProgress(step, percentage) {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    // Activate progress steps
    if (step >= 2) {
      const step2 = document.getElementById('progress-step-2');
      if (step2) {
        step2.classList.remove('opacity-50');
        step2.querySelector('div').className = 'w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center';
        step2.querySelector('div').innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
      }
    }
    
    if (step >= 3) {
      const step3 = document.getElementById('progress-step-3');
      if (step3) {
        step3.classList.remove('opacity-50');
        step3.querySelector('div').className = 'w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center animate-pulse';
      }
    }
  }
  
  onAuthSuccess(event) {
    this.updateProgress(3, 100);
    
    setTimeout(() => {
      this.hideLoader();
      this.initializeApplication(event.detail.user);
    }, 500);
  }
  
  hideLoader() {
    const loader = document.getElementById('progressive-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => loader.remove(), 300);
    }
    this.isInitialized = true;
  }
  
  initializeApplication(user) {
    // Show the main application
    const app = document.getElementById('app');
    if (app) {
      app.style.display = 'block';
      app.style.opacity = '0';
      app.style.transition = 'opacity 0.5s ease-in';
      setTimeout(() => app.style.opacity = '1', 100);
    }
    
    // Initialize app with user context
    if (typeof window.initializeMainApp === 'function') {
      window.initializeMainApp(user);
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedSubdomainApp({
    appName: 'AI Training Platform',
    appDescription: 'Advanced machine learning resources',
    appIcon: '🤖'
  });
});
```

**HTML Integration Example:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Training Platform</title>
    
    <!-- Enhanced React-compatible authentication guard -->
    <script src="/auth-guard/lib/auth-guard-react.js"></script>
    <script src="/auth-guard/js/enhanced-initialization.js"></script>
    
    <!-- Tailwind CSS for consistent styling with main app -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Your application CSS -->
    <link rel="stylesheet" href="styles/app.css">
</head>
<body>
    <!-- Application content (hidden until authenticated) -->
    <div id="app" style="display: none;">
        <!-- Header matching main app design -->
        <header class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🤖</span>
                <h1 class="text-lg font-semibold text-gray-900">AI Training Platform</h1>
              </div>
              <div class="text-sm text-gray-600">
                Welcome, <span id="user-name"></span>
              </div>
            </div>
          </div>
        </header>
        
        <!-- Main application content -->
        <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div class="px-4 py-6 sm:px-0">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Training Dashboard</h2>
            <p class="text-gray-600 mb-8">Your protected AI training resources are ready.</p>
            
            <!-- Application content here -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <!-- Training modules, courses, etc. -->
            </div>
          </div>
        </main>
    </div>
    
    <!-- Application JavaScript (loaded after authentication) -->
    <script>
        function initializeMainApp(user) {
            // Display user information
            const userNameElement = document.getElementById('user-name');
            if (userNameElement && user) {
                userNameElement.textContent = `${user.firstName} ${user.lastName}`;
            }
            
            // Initialize your application with user context
            console.log('Initializing AI Training Platform for user:', user);
            
            // Your app initialization code here
        }
    </script>
</body>
</html>
```

#### **cPanel Integration Guide**

**Step 1: Create Subdomains in cPanel**
1. Login to cPanel
2. Navigate to "Subdomains" in the Domains section
3. Create subdomain: `ai-trl` → Points to `/public_html/ai-trl/`
4. Create subdomain: `ai-tutot` → Points to `/public_html/ai-tutot/`
5. Verify DNS propagation (may take 24-48 hours)

**Step 2: SSL Certificate Setup**
```
# In cPanel SSL/TLS section:
1. Go to "SSL/TLS" → "Let's Encrypt"
2. Add certificates for:
   - ai-trl.equussystems.co
   - ai-tutot.equussystems.co
3. Enable "Force HTTPS Redirect"
```

**Step 3: File Structure Setup**
```
public_html/
├── ai-trl/
│   ├── index.html              # Main application page
│   ├── auth-guard/             # Authentication guard files
│   │   ├── lib/
│   │   └── guards/
│   ├── styles/                 # Application styles
│   ├── js/                     # Application JavaScript
│   └── assets/                 # Images, fonts, etc.
├── ai-tutot/
│   ├── index.html              # Admin application page
│   ├── auth-guard/             # Shared auth guard files (symlink or copy)
│   ├── admin-styles/           # Admin-specific styles
│   └── admin-js/               # Admin JavaScript
└── auth-guard-shared/          # Shared guard library (optional)
    ├── lib/
    ├── guards/
    └── config/
```

**Step 4: Upload Authentication Guard Files**
1. Use cPanel File Manager or FTP
2. Upload auth-guard library to each subdomain
3. Set proper file permissions (644 for files, 755 for directories)
4. Test file accessibility via browser

#### **Security Considerations for Shared Hosting**

**1. Token Validation Security:**
```javascript
// Client-side token validation (basic checks only)
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

// Always validate with server API for security
const validateWithServer = async (token) => {
  // This is the secure validation that matters
  return await fetch('/api/auth/validate', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

**2. Secure Token Storage:**
```javascript
// Prefer httpOnly cookies when possible
const setSecureToken = (token) => {
  // Try to set secure cookie
  document.cookie = `equus_auth=${token}; Secure; SameSite=Lax; Path=/; Domain=.equussystems.co; Max-Age=86400`;
  
  // Fallback to localStorage for SPA functionality
  if (typeof(Storage) !== "undefined") {
    localStorage.setItem('equus_auth_token', token);
  }
};
```

**3. HTTPS Enforcement:**
```javascript
// Force HTTPS redirect
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace('https:' + window.location.href.substring(window.location.protocol.length));
}
```

### **Option 1: Authentication Gateway/Proxy (🔥 RECOMMENDED for VPS/Dedicated Hosting)**

#### **Architecture Overview**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Request  │───▶│ Authentication   │───▶│   Subdomain     │
│ (with JWT token)│    │    Gateway       │    │  Application    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Main Auth DB    │
                       │ (User validation)│
                       └──────────────────┘
```

#### **Implementation Details**

**Service Structure:**
```
auth-gateway/
├── server.js                    # Main gateway application
├── config/
│   ├── database.js             # MongoDB connection (shared with main app)
│   ├── subdomains.js           # Subdomain access configuration
│   ├── auth.js                 # JWT configuration
│   └── proxy.js                # Proxy target configuration
├── middleware/
│   ├── auth.js                 # Token validation (imported from main)
│   ├── subdomain.js            # Subdomain routing logic
│   ├── proxy.js                # Request proxying utilities
│   ├── rateLimiter.js          # Rate limiting protection
│   └── auditLogger.js          # Access attempt logging
├── routes/
│   ├── health.js               # Health check endpoints
│   ├── auth.js                 # Authentication status endpoints
│   └── proxy.js                # Main proxy routing
├── utils/
│   ├── authService.js          # Shared auth utilities (from main app)
│   ├── subdomainRules.js       # Access rule definitions
│   └── logger.js               # Structured logging
├── models/
│   └── AccessLog.js            # Audit log model
└── package.json                # Dependencies
```

**Core Gateway Logic:**
```javascript
// config/subdomains.js
const SUBDOMAIN_ACCESS_RULES = {
  'ai-trl': {
    allowedRoles: ['admin', 'user'],
    requireEmailVerification: true,
    targetUrl: 'http://internal-ai-trl-server:3000',
    description: 'AI Training and Learning Platform'
  },
  'ai-tutot': {
    allowedRoles: ['admin'],
    requireEmailVerification: true,
    targetUrl: 'http://internal-ai-tutot-server:3000',
    description: 'AI Tutorial and Training Platform (Admin Only)'
  }
};

// middleware/subdomain.js
const subdomainAuth = async (req, res, next) => {
  try {
    // Extract subdomain from request
    const subdomain = extractSubdomain(req.hostname);
    
    // Get access rules for subdomain
    const rules = SUBDOMAIN_ACCESS_RULES[subdomain];
    if (!rules) {
      return res.status(404).json({ error: 'Subdomain not found' });
    }
    
    // Validate JWT token (using existing auth middleware)
    const authResult = await validateAuthToken(req);
    if (!authResult.success) {
      return redirectToLogin(res, req.originalUrl);
    }
    
    // Check role-based access
    const hasAccess = checkSubdomainAccess(authResult.user, rules);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This resource requires ${rules.allowedRoles.join(' or ')} role`
      });
    }
    
    // Log access attempt
    await logAccess(authResult.user, subdomain, 'GRANTED', req.ip);
    
    // Store user and rules in request
    req.user = authResult.user;
    req.subdomainRules = rules;
    
    next();
  } catch (error) {
    await logAccess(null, subdomain, 'ERROR', req.ip, error.message);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

// middleware/proxy.js
const proxyToSubdomain = (req, res) => {
  const { targetUrl } = req.subdomainRules;
  
  // Create proxy with headers
  const proxy = httpProxy.createProxyServer({
    target: targetUrl,
    changeOrigin: true,
    secure: true,
    headers: {
      'X-Authenticated-User': JSON.stringify(req.user),
      'X-User-Role': req.user.role,
      'X-User-ID': req.user._id
    }
  });
  
  // Handle proxy errors
  proxy.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Service unavailable' });
  });
  
  proxy.web(req, res);
};
```

**Authentication Flow:**
```javascript
// server.js - Main request handler
app.use('*', [
  rateLimiter,           // Rate limiting protection
  subdomainAuth,         // Authentication and authorization
  proxyToSubdomain       // Proxy to actual application
]);

// Authentication validation function
const validateAuthToken = async (req) => {
  try {
    // Extract token from Authorization header or cookies
    const token = extractToken(req);
    if (!token) {
      return { success: false, error: 'No token provided' };
    }
    
    // Verify JWT token using existing authService
    const decoded = authService.verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Validate user status
    if (!user.isActive || user.accountStatus === 'suspended' || user.isLocked) {
      return { success: false, error: 'Account not active' };
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subdomain access validation
const checkSubdomainAccess = (user, rules) => {
  // Check role-based access
  if (!rules.allowedRoles.includes(user.role)) {
    return false;
  }
  
  // Check email verification if required
  if (rules.requireEmailVerification && !user.emailVerified) {
    return false;
  }
  
  return true;
};
```

### **Option 2: Integrated Authentication Middleware**

#### **Architecture Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Request  │───▶│   Subdomain     │───▶│ Auth Middleware │
│ (with JWT token)│    │  Application    │    │ (embedded)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ App Logic       │    │  Main Auth DB   │
                       │ (if authorized) │    │ (validation)    │
                       └─────────────────┘    └─────────────────┘
```

#### **Implementation Details**

**Shared Auth Package:**
```javascript
// @equus/auth-middleware package structure
auth-middleware/
├── index.js                    # Main export
├── middleware/
│   ├── authenticate.js         # JWT validation
│   ├── authorize.js            # Role-based checks
│   └── redirect.js             # Login redirect logic
├── config/
│   └── default.js              # Default configuration
├── utils/
│   ├── token.js                # Token utilities
│   └── user.js                 # User validation
└── package.json

// Usage in subdomain applications
const { authenticateUser, requireRole } = require('@equus/auth-middleware');

app.use(authenticateUser({
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.MONGODB_URI,
  loginUrl: 'https://equussystems.co/auth/signin',
  allowedRoles: ['admin', 'user'] // or ['admin'] for admin-only
}));

// Protect all routes
app.use('*', requireRole(['admin', 'user']));
```

### **Option 3: Cookie-Based Authentication Bridge**

#### **Architecture Overview**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Main Site Login │───▶│ Set Domain      │───▶│ Subdomain       │
│ (equussystems.co)│    │ Cookie          │    │ (reads cookie)  │
└─────────────────┘    │(.equussystems.co)│    └─────────────────┘
                       └─────────────────┘
```

#### **Implementation Details**

**Cookie Management:**
```javascript
// Main site - set domain-wide cookie after login
app.post('/api/auth/signin', async (req, res) => {
  // ... existing login logic ...
  
  // Set domain-wide authentication cookie
  res.cookie('equus_auth', jwt_token, {
    domain: '.equussystems.co',    // Available to all subdomains
    httpOnly: true,                // Security: no JS access
    secure: true,                  // HTTPS only
    sameSite: 'lax',              // CSRF protection
    maxAge: 24 * 60 * 60 * 1000   // 24 hours
  });
  
  res.json({ success: true, user: userResponse });
});

// Subdomain applications - validate cookie
const validateCookieAuth = async (req, res, next) => {
  try {
    const token = req.cookies.equus_auth;
    if (!token) {
      return res.redirect('https://equussystems.co/auth/signin');
    }
    
    // Validate token and user
    const user = await validateUserToken(token);
    if (!user) {
      return res.redirect('https://equussystems.co/auth/signin');
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.redirect('https://equussystems.co/auth/signin');
  }
};
```

## **Hosting Environment Decision Matrix**

### **Choose Your Implementation Based on Hosting Environment**

#### **🔍 Quick Assessment Guide**

**For Shared Hosting (cPanel, typical web hosting):**
- ✅ Use **Option 1A: Frontend-Based Authentication Guard**
- ❌ Cannot use Authentication Gateway (requires Node.js server deployment)
- ❌ Limited server-side control and custom infrastructure

**For VPS/Dedicated Hosting (full server control):**
- ✅ Use **Option 1: Authentication Gateway** (most secure)
- ✅ Can also use Frontend-Based Guard as simpler alternative
- ✅ Full infrastructure control and custom deployment capabilities

**For Static/CDN Hosting (Netlify, Vercel, GitHub Pages):**
- ✅ Use **Option 1A: Frontend-Based Authentication Guard**
- ⚠️ Use **Option 3: Cookie-Based Authentication** if API access is limited

### **Detailed Hosting Environment Recommendations**

#### **🏠 Shared Hosting with cPanel (Trilogy Web Solutions)**
**Recommended: Option 1A - Frontend-Based Authentication Guard**

**✅ Perfect Match Because:**
- Works with standard HTML/CSS/JavaScript files
- No server-side runtime requirements
- Easy deployment via cPanel File Manager
- SSL certificates available through hosting provider
- Subdomain creation through standard cPanel interface
- Leverages existing authentication API without infrastructure changes

**✅ Implementation Benefits:**
- **Quick Setup**: Upload files and configure subdomains in cPanel
- **Cost Effective**: No additional server costs or complex infrastructure
- **Maintainable**: Standard web files that any developer can update
- **Secure**: Token validation through existing secure API
- **Scalable**: Easy to add more subdomains by copying guard files

#### **🖥️ VPS/Dedicated Hosting (Full Server Control)**
**Recommended: Option 1 - Authentication Gateway**

**✅ Optimal Choice Because:**
- **Enterprise Security**: Centralized authentication with comprehensive logging
- **Zero App Changes**: Existing subdomain applications need no modification
- **Advanced Features**: Rate limiting, IP filtering, custom middleware
- **Performance**: Server-side token validation and caching
- **Monitoring**: Real-time security monitoring and alerting
- **Scalability**: Load balancing and high availability options

**⚠️ Infrastructure Requirements:**
- Node.js runtime environment
- Database access for authentication and logging
- Reverse proxy configuration (Nginx/Apache)
- SSL certificate management
- Server monitoring and maintenance

#### **☁️ Static/CDN Hosting (Netlify, Vercel, GitHub Pages)**
**Recommended: Option 1A - Frontend-Based Authentication Guard**

**✅ Ideal Solution Because:**
- **Static Deployment**: Works with static site generators and CDN
- **Edge Computing**: Fast global access through CDN networks
- **Serverless**: No server maintenance or scaling concerns
- **CI/CD Integration**: Easy deployment through Git workflows
- **Cost Effective**: Minimal hosting costs for static assets

## **Implementation Recommendation by Hosting Type**

### **For Trilogy Web Solutions (Shared Hosting) - RECOMMENDED APPROACH**

#### **Why Frontend-Based Authentication Guard?**

**✅ Perfect Alignment with Shared Hosting:**
1. **No Infrastructure Requirements**: Works with standard web hosting
2. **cPanel Compatible**: Easy subdomain and SSL management
3. **File-Based Deployment**: Upload via File Manager or FTP
4. **Existing API Integration**: Leverages current authentication system
5. **Cost Effective**: No additional server or database costs
6. **Maintainable**: Standard JavaScript that any developer can update

**✅ Security Benefits:**
- **Server-Side Validation**: All security decisions made by main API
- **Token-Based Security**: Uses existing JWT authentication system
- **HTTPS Enforcement**: SSL certificates through hosting provider
- **Cross-Domain Protection**: Works across main domain and subdomains
- **Rate Limiting**: Handled by main authentication API

**✅ User Experience:**
- **Seamless Authentication**: Transparent redirect to main site for login
- **Fast Loading**: Client-side validation with API confirmation
- **Professional UI**: Loading states and access denied messages
- **Mobile Responsive**: Works on all devices and screen sizes

#### **Alternative: Authentication Gateway (For Future VPS Migration)**

**When to Consider Gateway Approach:**
- **High Traffic**: Need server-side caching and performance optimization
- **Advanced Security**: Require IP filtering, custom rate limiting, WAF integration
- **Multiple Applications**: Managing many subdomains with complex access rules
- **Enterprise Features**: Need comprehensive audit logging and real-time monitoring
- **Infrastructure Control**: Have dedicated servers or VPS with full admin access

**⚠️ Gateway Limitations with Shared Hosting:**
- Requires Node.js server deployment (not available on typical shared hosting)
- Needs custom reverse proxy configuration (usually restricted)
- Requires database access for logging (may have connection limits)
- Complex deployment and maintenance procedures

### **Implementation Roadmap for Shared Hosting (Frontend-Based Guard)**

#### **Phase 1: Authentication Guard Development (Day 1)**

**Step 1.1: Create Authentication Library**
```bash
# Create project structure
mkdir subdomain-auth-guard
cd subdomain-auth-guard
mkdir -p lib guards config styles examples
```

**Step 1.2: Develop Core Guard Library**
- Implement `SubdomainAuthGuard` class (provided above)
- Create token validation and API integration
- Build loading states and access denied UI
- Add session management and storage utilities

**Step 1.3: Create Subdomain-Specific Guards**
- `ai-trl-guard.js` - For AI Training platform (admin + user)
- `ai-tutot-guard.js` - For AI Tutorial platform (admin only)
- Test guard functionality with mock data

#### **Phase 2: cPanel Configuration (Day 2)**

**Step 2.1: Subdomain Creation**
```
1. Login to cPanel
2. Navigate to "Subdomains"
3. Create subdomain: ai-trl → /public_html/ai-trl/
4. Create subdomain: ai-tutot → /public_html/ai-tutot/
5. Wait for DNS propagation (24-48 hours)
```

**Step 2.2: SSL Certificate Setup**
```
1. Go to cPanel → "SSL/TLS"
2. Use "Let's Encrypt" for free certificates
3. Add certificates for ai-trl.equussystems.co and ai-tutot.equussystems.co
4. Enable "Force HTTPS Redirect"
```

**Step 2.3: File Upload and Testing**
```
1. Upload auth-guard files to both subdomains
2. Create test HTML pages with authentication
3. Set file permissions (644 for files, 755 for directories)
4. Test authentication flow end-to-end
```

#### **Phase 3: Integration and Testing (Day 3)**

**Step 3.1: API Endpoint Setup**
```javascript
// Add validation endpoint to main API
app.post('/api/auth/validate', auth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});
```

**Step 3.2: Cross-Domain Configuration**
```javascript
// Update CORS in main API to include subdomains
const corsOptions = {
  origin: [
    'https://equussystems.co',
    'https://ai-trl.equussystems.co',
    'https://ai-tutot.equussystems.co'
  ],
  credentials: true
};
```

**Step 3.3: End-to-End Testing**
- Test authentication flow from main site to subdomains
- Verify role-based access control
- Test token refresh and session management
- Validate mobile responsiveness and error handling

#### **Phase 4: Deployment and Documentation (Day 4)**

**Step 4.1: Production Deployment**
- Deploy authentication guards to production subdomains
- Update main API with CORS and validation endpoints
- Configure monitoring and error tracking
- Set up backup procedures for guard files

**Step 4.2: User Documentation**
- Create integration guide for developers
- Document authentication flow for end users
- Provide troubleshooting guide
- Create maintenance procedures

### **Gateway Implementation Roadmap (For VPS/Dedicated Hosting)**

#### **Phase 1: Core Gateway Development (Days 1-2)**

**Step 1.1: Project Setup**
```bash
mkdir auth-gateway
cd auth-gateway
npm init -y
npm install express http-proxy-middleware jsonwebtoken mongoose cors helmet express-rate-limit winston
```

**Step 1.2: Database Connection**
```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use same connection string as main application
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Gateway connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

**Step 1.3: Import Auth Components**
```javascript
// utils/authService.js - Import from main application
const authService = require('../../api/utils/authService');
const User = require('../../api/models/User');

// middleware/auth.js - Import from main application
const { auth, requireAuth, requireActiveUser } = require('../../api/middleware/auth');
const { requireRole, requireAdmin } = require('../../api/middleware/roles');

module.exports = {
  authService,
  User,
  auth,
  requireAuth,
  requireActiveUser,
  requireRole,
  requireAdmin
};
```

#### **Phase 2: Authentication Logic (Day 2)**

**Step 2.1: Subdomain Configuration**
```javascript
// config/subdomains.js
const SUBDOMAIN_CONFIG = {
  'ai-trl': {
    name: 'AI Training & Learning Platform',
    allowedRoles: ['admin', 'user'],
    requireEmailVerification: true,
    requireActiveAccount: true,
    targetUrl: process.env.AI_TRL_TARGET_URL || 'http://localhost:3001',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    customPermissions: [], // Optional custom permissions
    ipWhitelist: [], // Optional IP restrictions
    description: 'Platform for AI training and learning resources'
  },
  'ai-tutot': {
    name: 'AI Tutorial Platform',
    allowedRoles: ['admin'],
    requireEmailVerification: true,
    requireActiveAccount: true,
    targetUrl: process.env.AI_TUTOT_TARGET_URL || 'http://localhost:3002',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 50 // Lower limit for admin-only resource
    },
    customPermissions: ['ai_tutot_access'],
    ipWhitelist: [], // Could restrict to office IPs
    description: 'Advanced AI tutorial platform for administrators'
  }
};

// Validation function
const validateSubdomainConfig = () => {
  Object.entries(SUBDOMAIN_CONFIG).forEach(([subdomain, config]) => {
    if (!config.targetUrl) {
      throw new Error(`Target URL not configured for ${subdomain}`);
    }
    if (!config.allowedRoles || config.allowedRoles.length === 0) {
      throw new Error(`No allowed roles configured for ${subdomain}`);
    }
  });
};

module.exports = { SUBDOMAIN_CONFIG, validateSubdomainConfig };
```

**Step 2.2: Core Authentication Middleware**
```javascript
// middleware/subdomainAuth.js
const { authService, User } = require('../utils/authService');
const { SUBDOMAIN_CONFIG } = require('../config/subdomains');
const { logAccess } = require('../utils/auditLogger');

const extractSubdomain = (hostname) => {
  // Extract subdomain from hostname
  // ai-trl.equussystems.co -> ai-trl
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
};

const extractToken = (req) => {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies as fallback
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  
  return null;
};

const subdomainAuth = async (req, res, next) => {
  const startTime = Date.now();
  let subdomain = null;
  
  try {
    // Extract subdomain
    subdomain = extractSubdomain(req.hostname);
    
    if (!subdomain) {
      await logAccess(null, 'unknown', 'DENIED', req.ip, 'Invalid subdomain');
      return res.status(400).json({
        error: 'Invalid subdomain',
        message: 'Unable to determine subdomain from request'
      });
    }
    
    // Check if subdomain is configured
    const config = SUBDOMAIN_CONFIG[subdomain];
    if (!config) {
      await logAccess(null, subdomain, 'DENIED', req.ip, 'Subdomain not configured');
      return res.status(404).json({
        error: 'Subdomain not found',
        message: `Subdomain '${subdomain}' is not configured`
      });
    }
    
    // Extract and validate token
    const token = extractToken(req);
    if (!token) {
      await logAccess(null, subdomain, 'DENIED', req.ip, 'No token provided');
      return redirectToLogin(res, subdomain, req.originalUrl);
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = authService.verifyToken(token);
    } catch (tokenError) {
      await logAccess(null, subdomain, 'DENIED', req.ip, `Token error: ${tokenError.message}`);
      return redirectToLogin(res, subdomain, req.originalUrl);
    }
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      await logAccess(null, subdomain, 'DENIED', req.ip, 'User not found');
      return redirectToLogin(res, subdomain, req.originalUrl);
    }
    
    // Validate user account status
    if (!user.isActive) {
      await logAccess(user, subdomain, 'DENIED', req.ip, 'Account inactive');
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }
    
    if (user.accountStatus === 'suspended') {
      await logAccess(user, subdomain, 'DENIED', req.ip, 'Account suspended');
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.'
      });
    }
    
    if (user.isLocked) {
      await logAccess(user, subdomain, 'DENIED', req.ip, 'Account locked');
      return res.status(403).json({
        error: 'Account locked',
        message: 'Your account is temporarily locked. Please try again later.'
      });
    }
    
    // Check email verification if required
    if (config.requireEmailVerification && !user.emailVerified) {
      await logAccess(user, subdomain, 'DENIED', req.ip, 'Email not verified');
      return res.status(403).json({
        error: 'Email verification required',
        message: 'Please verify your email address to access this resource.'
      });
    }
    
    // Check role-based access
    if (!config.allowedRoles.includes(user.role)) {
      await logAccess(user, subdomain, 'DENIED', req.ip, `Insufficient role: ${user.role}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires ${config.allowedRoles.join(' or ')} role. Your role: ${user.role}`
      });
    }
    
    // Check custom permissions if configured
    if (config.customPermissions && config.customPermissions.length > 0) {
      const userPermissions = user.permissions || [];
      const hasPermission = config.customPermissions.some(perm => userPermissions.includes(perm));
      
      if (!hasPermission && user.role !== 'admin') {
        await logAccess(user, subdomain, 'DENIED', req.ip, 'Missing custom permissions');
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This resource requires special permissions: ${config.customPermissions.join(', ')}`
        });
      }
    }
    
    // Check IP whitelist if configured
    if (config.ipWhitelist && config.ipWhitelist.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!config.ipWhitelist.includes(clientIP)) {
        await logAccess(user, subdomain, 'DENIED', req.ip, 'IP not whitelisted');
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not authorized to access this resource.'
        });
      }
    }
    
    // Log successful access
    const responseTime = Date.now() - startTime;
    await logAccess(user, subdomain, 'GRANTED', req.ip, 'Authentication successful', responseTime);
    
    // Attach user and config to request
    req.user = user;
    req.subdomainConfig = config;
    req.subdomain = subdomain;
    
    next();
    
  } catch (error) {
    console.error('Subdomain authentication error:', error);
    await logAccess(null, subdomain, 'ERROR', req.ip, error.message);
    
    return res.status(500).json({
      error: 'Authentication service error',
      message: 'An internal error occurred during authentication'
    });
  }
};

const redirectToLogin = (res, subdomain, originalUrl) => {
  const loginUrl = `https://equussystems.co/auth/signin`;
  const returnUrl = encodeURIComponent(`https://${subdomain}.equussystems.co${originalUrl}`);
  
  return res.redirect(`${loginUrl}?returnUrl=${returnUrl}`);
};

module.exports = { subdomainAuth, extractSubdomain, extractToken };
```

#### **Phase 3: Proxy Implementation (Day 3)**

**Step 3.1: Request Proxying**
```javascript
// middleware/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const { logAccess } = require('../utils/auditLogger');

const createSubdomainProxy = (req, res, next) => {
  const { targetUrl } = req.subdomainConfig;
  const user = req.user;
  
  // Create proxy middleware with enhanced headers
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    secure: true,
    timeout: 30000, // 30 second timeout
    
    // Add authentication headers for downstream application
    onProxyReq: (proxyReq, req, res) => {
      // Add user information headers
      proxyReq.setHeader('X-Authenticated-User-ID', user._id);
      proxyReq.setHeader('X-Authenticated-User-Email', user.email);
      proxyReq.setHeader('X-Authenticated-User-Role', user.role);
      proxyReq.setHeader('X-Authenticated-User-Name', `${user.firstName} ${user.lastName}`);
      proxyReq.setHeader('X-Authentication-Method', 'gateway');
      proxyReq.setHeader('X-Authentication-Time', new Date().toISOString());
      
      // Add permissions if available
      if (user.permissions && user.permissions.length > 0) {
        proxyReq.setHeader('X-User-Permissions', user.permissions.join(','));
      }
      
      // Log proxy request
      console.log(`Proxying ${req.method} ${req.url} to ${targetUrl} for user ${user.email}`);
    },
    
    // Handle proxy response
    onProxyRes: (proxyRes, req, res) => {
      // Add security headers
      proxyRes.headers['X-Frame-Options'] = 'DENY';
      proxyRes.headers['X-Content-Type-Options'] = 'nosniff';
      proxyRes.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      
      // Log response
      console.log(`Proxy response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    },
    
    // Handle proxy errors
    onError: async (err, req, res) => {
      console.error('Proxy error:', err.message);
      
      // Log error
      await logAccess(
        req.user, 
        req.subdomain, 
        'PROXY_ERROR', 
        req.ip, 
        `Proxy error: ${err.message}`
      );
      
      // Send error response
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Service unavailable',
          message: 'The requested service is temporarily unavailable'
        });
      }
    }
  });
  
  return proxy(req, res, next);
};

module.exports = { createSubdomainProxy };
```

#### **Phase 4: Security & Monitoring (Day 4)**

**Step 4.1: Rate Limiting**
```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { SUBDOMAIN_CONFIG } = require('../config/subdomains');

const createRateLimiter = (req, res, next) => {
  const subdomain = req.subdomain;
  
  if (!subdomain || !SUBDOMAIN_CONFIG[subdomain]) {
    return next();
  }
  
  const config = SUBDOMAIN_CONFIG[subdomain].rateLimit;
  
  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: 'Too many requests',
      message: `Too many requests from this IP. Please try again later.`,
      retryAfter: Math.ceil(config.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Create key based on IP and user (if authenticated)
      const ip = req.ip || req.connection.remoteAddress;
      const userId = req.user ? req.user._id : 'anonymous';
      return `${ip}:${userId}:${subdomain}`;
    }
  });
  
  return limiter(req, res, next);
};

module.exports = { createRateLimiter };
```

**Step 4.2: Audit Logging**
```javascript
// utils/auditLogger.js
const winston = require('winston');
const mongoose = require('mongoose');

// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-gateway' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/access.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// MongoDB audit log schema
const AccessLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String, default: null },
  subdomain: { type: String, required: true },
  action: { 
    type: String, 
    required: true,
    enum: ['GRANTED', 'DENIED', 'ERROR', 'PROXY_ERROR']
  },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  requestMethod: { type: String },
  requestPath: { type: String },
  reason: { type: String },
  responseTime: { type: Number }, // in milliseconds
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} }
});

// Create indexes for efficient queries
AccessLogSchema.index({ subdomain: 1, timestamp: -1 });
AccessLogSchema.index({ userId: 1, timestamp: -1 });
AccessLogSchema.index({ action: 1, timestamp: -1 });
AccessLogSchema.index({ ipAddress: 1, timestamp: -1 });

const AccessLog = mongoose.model('AccessLog', AccessLogSchema);

// Logging function
const logAccess = async (user, subdomain, action, ipAddress, reason = null, responseTime = null, metadata = {}) => {
  try {
    const logEntry = new AccessLog({
      userId: user ? user._id : null,
      userEmail: user ? user.email : null,
      subdomain,
      action,
      ipAddress,
      reason,
      responseTime,
      metadata
    });
    
    await logEntry.save();
    
    // Also log to Winston for immediate access
    logger.info('Gateway Access', {
      userId: user ? user._id : null,
      userEmail: user ? user.email : null,
      subdomain,
      action,
      ipAddress,
      reason,
      responseTime
    });
    
  } catch (error) {
    logger.error('Failed to log access attempt', {
      error: error.message,
      userId: user ? user._id : null,
      subdomain,
      action
    });
  }
};

// Analytics functions
const getAccessStats = async (timeRange = '24h') => {
  const now = new Date();
  let startTime;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  const stats = await AccessLog.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: {
          subdomain: '$subdomain',
          action: '$action'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    {
      $group: {
        _id: '$_id.subdomain',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count',
            avgResponseTime: '$avgResponseTime'
          }
        },
        totalRequests: { $sum: '$count' }
      }
    }
  ]);
  
  return stats;
};

module.exports = { logAccess, getAccessStats, AccessLog, logger };
```

#### **Phase 5: Main Server Configuration (Day 4)**

**Step 5.1: Main Server Setup**
```javascript
// server.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const { validateSubdomainConfig } = require('./config/subdomains');
const { subdomainAuth } = require('./middleware/subdomainAuth');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { createSubdomainProxy } = require('./middleware/proxy');
const { logger } = require('./utils/auditLogger');

// Validate environment and configuration
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// Validate subdomain configuration
try {
  validateSubdomainConfig();
} catch (error) {
  console.error('Subdomain configuration error:', error.message);
  process.exit(1);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Let proxied apps handle their own CSP
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from main domain and all configured subdomains
    const allowedOrigins = [
      'https://equussystems.co',
      'https://www.equussystems.co',
      'https://ai-trl.equussystems.co',
      'https://ai-tutot.equussystems.co'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-gateway',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Gateway status endpoint
app.get('/gateway/status', (req, res) => {
  const { SUBDOMAIN_CONFIG } = require('./config/subdomains');
  
  res.json({
    status: 'operational',
    configuredSubdomains: Object.keys(SUBDOMAIN_CONFIG),
    timestamp: new Date().toISOString()
  });
});

// Authentication test endpoint
app.get('/gateway/auth-test', subdomainAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    subdomain: req.subdomain,
    timestamp: new Date().toISOString()
  });
});

// Main gateway middleware chain
app.use('*', [
  subdomainAuth,        // Authentication and authorization
  createRateLimiter,    // Rate limiting
  createSubdomainProxy  // Proxy to target application
]);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Gateway error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth Gateway running on port ${PORT}`);
  logger.info(`Auth Gateway started on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
```

#### **Phase 6: Environment Configuration**

**Step 6.1: Environment Variables**
```bash
# .env file for auth-gateway
NODE_ENV=production
PORT=3000

# Database (same as main application)
MONGODB_URI=mongodb://localhost:27017/equus-website

# JWT Configuration (same as main application)
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-here-at-least-32-characters-long

# Target URLs for subdomain applications
AI_TRL_TARGET_URL=http://localhost:3001
AI_TUTOT_TARGET_URL=http://localhost:3002

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### **Phase 7: Deployment Configuration**

**Step 7.1: Docker Configuration**
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "server.js"]
```

**Step 7.2: Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'
services:
  auth-gateway:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/equus-website
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      AI_TRL_TARGET_URL: http://ai-trl-app:3001
      AI_TUTOT_TARGET_URL: http://ai-tutot-app:3002
    depends_on:
      - mongo
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    
  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

#### **Phase 8: DNS and SSL Configuration**

**Step 8.1: DNS Configuration**
```
# DNS Records needed:
ai-trl.equussystems.co    A    [Gateway Server IP]
ai-tutot.equussystems.co  A    [Gateway Server IP]

# Or using CNAME if gateway is on subdomain:
ai-trl.equussystems.co    CNAME  gateway.equussystems.co
ai-tutot.equussystems.co  CNAME  gateway.equussystems.co
```

**Step 8.2: SSL Certificate Setup**
```bash
# Using Let's Encrypt with Certbot
certbot certonly --webroot \
  -w /var/www/html \
  -d ai-trl.equussystems.co \
  -d ai-tutot.equussystems.co

# Or using wildcard certificate
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.equussystems.co"
```

**Step 8.3: Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/equus-subdomains
server {
    listen 443 ssl http2;
    server_name ai-trl.equussystems.co ai-tutot.equussystems.co;
    
    ssl_certificate /etc/letsencrypt/live/equussystems.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/equussystems.co/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=auth_gateway:10m rate=10r/s;
    limit_req zone=auth_gateway burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ai-trl.equussystems.co ai-tutot.equussystems.co;
    return 301 https://$server_name$request_uri;
}
```

## **Security Considerations**

### **Authentication Security**
1. **JWT Token Security**:
   - Use strong, randomly generated secrets (minimum 32 characters)
   - Implement token rotation and refresh mechanisms
   - Set appropriate expiration times (24h for access, 7d for refresh)

2. **User Validation**:
   - Verify user account status (active, not suspended, not locked)
   - Check email verification status if required
   - Validate role-based permissions

3. **Session Management**:
   - Implement secure session storage
   - Use HttpOnly, Secure, SameSite cookies
   - Support both header and cookie authentication

### **Network Security**
1. **HTTPS Enforcement**:
   - Require SSL/TLS for all communications
   - Use HSTS headers to prevent downgrade attacks
   - Implement proper certificate validation

2. **CORS Configuration**:
   - Whitelist only necessary origins
   - Enable credentials for authenticated requests
   - Validate Origin and Referer headers

3. **Rate Limiting**:
   - Implement per-IP and per-user rate limits
   - Use sliding window algorithms
   - Different limits for different subdomains

### **Application Security**
1. **Input Validation**:
   - Validate all incoming requests
   - Sanitize user input
   - Implement request size limits

2. **Error Handling**:
   - Don't expose sensitive information in errors
   - Log all security-relevant events
   - Implement proper error responses

3. **Monitoring & Alerting**:
   - Log all access attempts (successful and failed)
   - Monitor for suspicious activity patterns
   - Implement real-time alerting for security events

### **Infrastructure Security**
1. **Access Control**:
   - Implement IP whitelisting where appropriate
   - Use VPN access for administrative functions
   - Principle of least privilege for all accounts

2. **Monitoring**:
   - Comprehensive logging of all gateway activity
   - Real-time monitoring of service health
   - Automated alerting for failures or attacks

3. **Backup & Recovery**:
   - Regular backups of configuration and logs
   - Disaster recovery procedures
   - Failover mechanisms for high availability

## **Implementation Timeline by Hosting Environment**

### **Shared Hosting (cPanel) - Frontend-Based Guard: 4 Days**

**Day 1: Authentication Guard Development**
- Create SubdomainAuthGuard JavaScript library
- Implement token validation and API integration
- Build loading states and access denied UI
- Create subdomain-specific guard configurations

**Day 2: cPanel Setup and Configuration**
- Create subdomains in cPanel interface
- Configure SSL certificates (Let's Encrypt)
- Upload authentication guard files
- Set up basic subdomain structure and permissions

**Day 3: API Integration and Testing**
- Add validation endpoint to main authentication API
- Configure CORS for subdomain access
- Test end-to-end authentication flow
- Verify role-based access control

**Day 4: Deployment and Documentation**
- Deploy to production subdomains
- Create user and developer documentation
- Set up monitoring and error tracking
- Provide maintenance and troubleshooting guides

### **VPS/Dedicated Hosting - Authentication Gateway: 2-3 Weeks**

#### **Week 1: Core Development**
- **Day 1**: Project setup, database connection, basic auth middleware
- **Day 2**: Subdomain configuration, authentication logic implementation
- **Day 3**: Proxy middleware, request forwarding, error handling
- **Day 4**: Rate limiting, audit logging, security features

#### **Week 2: Testing & Deployment**
- **Day 1**: Unit testing, integration testing
- **Day 2**: Security testing, penetration testing
- **Day 3**: Environment setup, Docker configuration
- **Day 4**: DNS configuration, SSL setup, deployment

#### **Week 3: Monitoring & Documentation**
- **Day 1**: Monitoring setup, logging configuration
- **Day 2**: Performance testing, load testing
- **Day 3**: Documentation completion, user guides
- **Day 4**: Training, go-live preparation

### **Quick Comparison: Shared Hosting vs VPS Implementation**

| Aspect | Shared Hosting (Frontend Guard) | VPS/Dedicated (Gateway) |
|--------|----------------------------------|-------------------------|
| **Development Time** | 4 days | 2-3 weeks |
| **Infrastructure Setup** | Minimal (cPanel) | Complex (servers, databases) |
| **Deployment Complexity** | Simple (file upload) | Advanced (Docker, Nginx) |
| **Maintenance** | Low (static files) | High (server management) |
| **Security Level** | Good (API validation) | Excellent (comprehensive) |
| **Scalability** | Good (file-based) | Excellent (infrastructure) |
| **Cost** | Low (hosting only) | Higher (infrastructure) |
| **Technical Expertise** | Basic (JavaScript/HTML) | Advanced (DevOps/Systems) |

## **Testing Strategy**

### **Unit Testing**
```javascript
// test/middleware/subdomainAuth.test.js
const request = require('supertest');
const app = require('../../server');
const { generateTestToken } = require('../helpers/auth');

describe('Subdomain Authentication', () => {
  test('should allow access with valid token and role', async () => {
    const token = generateTestToken({ role: 'admin' });
    
    const response = await request(app)
      .get('/test')
      .set('Host', 'ai-trl.equussystems.co')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body.authenticated).toBe(true);
  });
  
  test('should deny access without token', async () => {
    const response = await request(app)
      .get('/test')
      .set('Host', 'ai-trl.equussystems.co')
      .expect(302); // Redirect to login
  });
  
  test('should deny access with insufficient role', async () => {
    const token = generateTestToken({ role: 'user' });
    
    const response = await request(app)
      .get('/test')
      .set('Host', 'ai-tutot.equussystems.co') // Admin only
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
      
    expect(response.body.error).toBe('Insufficient permissions');
  });
});
```

### **Integration Testing**
```javascript
// test/integration/gateway.test.js
describe('Gateway Integration', () => {
  test('should proxy authenticated requests correctly', async () => {
    // Setup mock target server
    const mockServer = setupMockServer();
    
    const token = generateTestToken({ role: 'admin' });
    
    const response = await request(app)
      .get('/api/data')
      .set('Host', 'ai-trl.equussystems.co')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    // Verify request was proxied with correct headers
    expect(mockServer.lastRequest.headers['x-authenticated-user-id']).toBeDefined();
    expect(mockServer.lastRequest.headers['x-authenticated-user-role']).toBe('admin');
  });
});
```

### **Security Testing**
```javascript
// test/security/security.test.js
describe('Security Tests', () => {
  test('should prevent token reuse after logout', async () => {
    const token = generateTestToken();
    
    // Logout user (invalidate token)
    await request(mainApp)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    
    // Try to use token on subdomain
    const response = await request(app)
      .get('/test')
      .set('Host', 'ai-trl.equussystems.co')
      .set('Authorization', `Bearer ${token}`)
      .expect(302); // Should redirect to login
  });
  
  test('should rate limit requests', async () => {
    const token = generateTestToken();
    
    // Make requests up to rate limit
    for (let i = 0; i < 100; i++) {
      await request(app)
        .get('/test')
        .set('Host', 'ai-trl.equussystems.co')
        .set('Authorization', `Bearer ${token}`);
    }
    
    // Next request should be rate limited
    const response = await request(app)
      .get('/test')
      .set('Host', 'ai-trl.equussystems.co')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);
  });
});
```

## **Monitoring & Analytics**

### **Key Metrics to Track**
1. **Authentication Metrics**:
   - Successful vs failed authentication attempts
   - Token expiration and refresh rates
   - User access patterns by subdomain

2. **Performance Metrics**:
   - Response times for authentication checks
   - Proxy response times
   - Error rates and types

3. **Security Metrics**:
   - Rate limiting triggers
   - Suspicious access patterns
   - Failed access attempts by IP

### **Alerting Rules**
```javascript
// monitoring/alerts.js
const alertRules = {
  highFailureRate: {
    condition: 'failed_auth_rate > 10%',
    window: '5 minutes',
    action: 'email_admin'
  },
  suspiciousActivity: {
    condition: 'unique_ips_per_user > 5',
    window: '1 hour',
    action: 'slack_notification'
  },
  serviceDown: {
    condition: 'health_check_failed',
    window: '1 minute',
    action: 'page_oncall'
  }
};
```

## **Maintenance & Operations**

### **Log Rotation**
```bash
# /etc/logrotate.d/auth-gateway
/app/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 node node
    postrotate
        /bin/kill -USR1 $(cat /var/run/auth-gateway.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

### **Health Checks**
```javascript
// utils/healthCheck.js
const healthChecks = {
  database: async () => {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: 'healthy', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  
  authentication: async () => {
    try {
      const testToken = authService.generateToken('test');
      authService.verifyToken(testToken);
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  
  targetServices: async () => {
    const results = {};
    
    for (const [subdomain, config] of Object.entries(SUBDOMAIN_CONFIG)) {
      try {
        const response = await fetch(`${config.targetUrl}/health`, { timeout: 5000 });
        results[subdomain] = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        results[subdomain] = 'unhealthy';
      }
    }
    
    return results;
  }
};
```

## **Future Enhancements**

### **Phase 2 Features**
1. **Advanced Authentication**:
   - Multi-factor authentication (MFA)
   - Single sign-on (SSO) integration
   - OAuth2/OpenID Connect support

2. **Enhanced Security**:
   - Web Application Firewall (WAF) integration
   - Bot detection and prevention
   - Geo-location based access control

3. **Performance Optimization**:
   - Response caching
   - Load balancing
   - CDN integration

4. **Advanced Monitoring**:
   - Real-time dashboards
   - Predictive analytics
   - Automated threat response

### **Scalability Considerations**
1. **Horizontal Scaling**:
   - Multiple gateway instances
   - Load balancer configuration
   - Session sharing strategies

2. **Caching Strategy**:
   - Redis for session storage
   - User data caching
   - Authentication result caching

3. **Database Optimization**:
   - Connection pooling
   - Read replicas for analytics
   - Sharding strategies

## **Conclusion**

This comprehensive plan provides flexible, secure solutions for protecting subdomains with authentication-based access control, tailored to different hosting environments and requirements.

### **For Shared Hosting Environments (Trilogy Web Solutions)**

The **Frontend-Based Authentication Guard** approach offers:

- **Perfect cPanel Integration** with standard subdomain and SSL management
- **Quick Implementation** with 4-day timeline and minimal infrastructure requirements
- **Cost-Effective Solution** using existing hosting without additional servers
- **Robust Security** through server-side API validation and JWT token management
- **Easy Maintenance** with standard JavaScript files that any developer can update
- **Professional User Experience** with loading states and role-based access control

### **For VPS/Dedicated Hosting Environments**

The **Authentication Gateway** approach provides:

- **Enterprise-grade security** with comprehensive access controls and audit logging
- **Seamless integration** with existing authentication system through proxy architecture
- **Scalable infrastructure** for future subdomain additions and high-traffic scenarios
- **Advanced monitoring** capabilities with real-time security alerting
- **Production-ready implementation** with proper error handling and failover mechanisms

### **Key Benefits Across Both Approaches**

- **Leverage Existing Authentication**: Both solutions integrate with current JWT-based system
- **Role-Based Access Control**: Support for different user roles across subdomains
- **Security Best Practices**: HTTPS enforcement, token validation, and session management
- **Flexible Architecture**: Easy to add new subdomains or modify access rules
- **Professional UX**: Seamless authentication flow with proper error handling

### **Hosting Environment Compatibility**

| Feature | Shared Hosting | VPS/Dedicated |
|---------|----------------|---------------|
| **Implementation Complexity** | Simple | Advanced |
| **Time to Deploy** | 4 days | 2-3 weeks |
| **Infrastructure Cost** | Low | Higher |
| **Security Level** | Good | Excellent |
| **Maintenance Effort** | Minimal | Moderate |
| **Scalability** | Good | Excellent |

The implementation timelines are realistic and allow for thorough testing and security validation before deployment. Both approaches ensure maintainability and allow for future enhancements without major architectural changes.

**Choose Frontend-Based Guard for**: Shared hosting, quick deployment, cost-effective solutions  
**Choose Authentication Gateway for**: Enterprise environments, high security requirements, complex infrastructure

---

**Document Version**: 2.0  
**Created**: July 21, 2025  
**Updated**: July 21, 2025 (Added shared hosting solution)  
**Status**: Implementation Ready for Both Hosting Types  
**Estimated Implementation Time**: 4 days (shared hosting) / 2-3 weeks (VPS)  
**Security Review**: Recommended before production deployment
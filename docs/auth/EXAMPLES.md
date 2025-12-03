# Authentication Examples

Real-world implementation examples for integrating with the Brandium authentication system.

## Table of Contents

- [Quick Start](#quick-start)
- [Frontend Integration](#frontend-integration)
  - [React](#react)
  - [Vue.js](#vuejs)
  - [Vanilla JavaScript](#vanilla-javascript)
- [Backend Integration](#backend-integration)
  - [Node.js Client](#nodejs-client)
  - [Python Client](#python-client)
- [Mobile Integration](#mobile-integration)
  - [React Native](#react-native)
- [Advanced Patterns](#advanced-patterns)
  - [Token Refresh Strategy](#token-refresh-strategy)
  - [Axios Interceptors](#axios-interceptors)
  - [Error Handling](#error-handling)
- [Testing](#testing)

---

## Quick Start

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 3. Access Protected Route

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Frontend Integration

### React

Complete React authentication implementation with hooks and context.

#### AuthContext.tsx

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = 'http://localhost:3000/api/auth';

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token and fetch user
      fetchCurrentUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid or expired
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### LoginForm.tsx

```typescript
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

#### ProtectedRoute.tsx

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

#### App.tsx

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Dashboard } from './Dashboard';
import { ProtectedRoute } from './ProtectedRoute';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
```

---

### Vue.js

Vue 3 Composition API authentication example.

#### authStore.ts

```typescript
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const isLoading = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  const API_BASE_URL = 'http://localhost:3000/api/auth';

  async function register(email: string, password: string) {
    isLoading.value = true;
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      user.value = data.user;
      token.value = data.token;
      localStorage.setItem('token', data.token);
    } finally {
      isLoading.value = false;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      user.value = data.user;
      token.value = data.token;
      localStorage.setItem('token', data.token);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return;

    isLoading.value = true;
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        user.value = data.user;
      } else {
        logout();
      }
    } finally {
      isLoading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    register,
    login,
    logout,
    fetchCurrentUser,
  };
});
```

#### LoginView.vue

```vue
<template>
  <div class="login-form">
    <h2>Login</h2>

    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="handleLogin">
      <div>
        <label for="email">Email:</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          :disabled="authStore.isLoading"
        />
      </div>

      <div>
        <label for="password">Password:</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          :disabled="authStore.isLoading"
        />
      </div>

      <button type="submit" :disabled="authStore.isLoading">
        {{ authStore.isLoading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');

const handleLogin = async () => {
  error.value = '';

  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed';
  }
};
</script>
```

---

### Vanilla JavaScript

Simple implementation without frameworks.

```javascript
// auth.js
class AuthService {
  constructor(baseUrl = 'http://localhost:3000/api/auth') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('token');
  }

  async register(email, password) {
    const response = await fetch(`${this.baseUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async getCurrentUser() {
    if (!this.token) {
      throw new Error('No token available');
    }

    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated() {
    return !!this.token;
  }
}

// Usage
const auth = new AuthService();

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const data = await auth.login(email, password);
    console.log('Logged in:', data.user);
    window.location.href = '/dashboard.html';
  } catch (error) {
    document.getElementById('error').textContent = error.message;
  }
});
```

---

## Backend Integration

### Node.js Client

Server-to-server authentication client.

```typescript
import axios, { AxiosInstance } from 'axios';

interface User {
  id: string;
  email: string;
}

interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

class BrandiumClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add interceptor to include token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  async register(email: string, password: string): Promise<User> {
    const response = await this.client.post<AuthResponse>(
      '/auth/register',
      { email, password }
    );
    this.token = response.data.token;
    return response.data.user;
  }

  async login(email: string, password: string): Promise<User> {
    const response = await this.client.post<AuthResponse>(
      '/auth/login',
      { email, password }
    );
    this.token = response.data.token;
    return response.data.user;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<{ user: User }>('/auth/me');
    return response.data.user;
  }

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  logout(): void {
    this.token = null;
  }
}

// Usage
const client = new BrandiumClient();

async function example() {
  try {
    // Register
    const user = await client.register('user@example.com', 'SecurePass123');
    console.log('Registered:', user);

    // Login
    const loggedInUser = await client.login('user@example.com', 'SecurePass123');
    console.log('Logged in:', loggedInUser);

    // Get current user
    const currentUser = await client.getCurrentUser();
    console.log('Current user:', currentUser);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

### Python Client

Python client for Brandium API.

```python
import requests
from typing import Optional, Dict, Any

class BrandiumClient:
    def __init__(self, base_url: str = "http://localhost:3000/api"):
        self.base_url = base_url
        self.token: Optional[str] = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def register(self, email: str, password: str) -> Dict[str, Any]:
        """Register a new user"""
        response = requests.post(
            f"{self.base_url}/auth/register",
            json={"email": email, "password": password},
            headers=self._get_headers()
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["token"]
        return data["user"]

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login with existing user"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password},
            headers=self._get_headers()
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["token"]
        return data["user"]

    def get_current_user(self) -> Dict[str, Any]:
        """Get current authenticated user"""
        if not self.token:
            raise ValueError("Not authenticated")

        response = requests.get(
            f"{self.base_url}/auth/me",
            headers=self._get_headers()
        )
        response.raise_for_status()
        return response.json()["user"]

    def logout(self) -> None:
        """Clear authentication token"""
        self.token = None

# Usage
client = BrandiumClient()

try:
    # Register
    user = client.register("user@example.com", "SecurePass123")
    print(f"Registered: {user['email']}")

    # Login
    user = client.login("user@example.com", "SecurePass123")
    print(f"Logged in: {user['email']}")

    # Get current user
    current_user = client.get_current_user()
    print(f"Current user: {current_user['email']}")

except requests.HTTPError as e:
    print(f"Error: {e.response.json()}")
```

---

## Mobile Integration

### React Native

React Native authentication with AsyncStorage.

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:3000/api/auth';
const TOKEN_KEY = '@brandium_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from AsyncStorage on mount
  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        await fetchCurrentUser(storedToken);
      }
    } catch (error) {
      console.error('Failed to load token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

## Advanced Patterns

### Token Refresh Strategy

Handling token expiration with automatic refresh (requires backend support).

```typescript
class AuthService {
  private token: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    this.setToken(data.token);
    this.scheduleTokenRefresh();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Schedule token refresh before expiration
  scheduleTokenRefresh() {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Decode JWT to get expiration time
    const payload = JSON.parse(atob(this.token!.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    // Refresh 5 minutes before expiration
    const refreshAt = expiresAt - 5 * 60 * 1000;
    const timeout = refreshAt - now;

    if (timeout > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken();
      }, timeout);
    }
  }

  async refreshToken() {
    // Implement token refresh logic here
    // This requires backend support for refresh tokens
  }

  logout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.token = null;
    localStorage.removeItem('token');
  }
}
```

---

### Axios Interceptors

Automatic token injection and error handling.

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Request interceptor - add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Usage
import api from './api';

async function fetchData() {
  try {
    const response = await api.get('/auth/me');
    console.log('User:', response.data.user);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

### Error Handling

Comprehensive error handling pattern.

```typescript
interface ApiError {
  error: string;
  message: string;
}

class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleAuthRequest<T>(
  request: () => Promise<Response>
): Promise<T> {
  try {
    const response = await request();

    if (!response.ok) {
      const error: ApiError = await response.json();

      // Handle specific error cases
      switch (response.status) {
        case 400:
          throw new AuthError(
            error.message || 'Invalid input',
            400,
            'VALIDATION_ERROR'
          );
        case 401:
          throw new AuthError(
            error.message || 'Unauthorized',
            401,
            'UNAUTHORIZED'
          );
        case 409:
          throw new AuthError(
            error.message || 'Resource already exists',
            409,
            'CONFLICT'
          );
        default:
          throw new AuthError(
            error.message || 'An error occurred',
            response.status,
            'UNKNOWN_ERROR'
          );
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    // Network or other errors
    throw new AuthError(
      'Network error occurred',
      0,
      'NETWORK_ERROR'
    );
  }
}

// Usage
try {
  const data = await handleAuthRequest(() =>
    fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  );
  console.log('Success:', data);
} catch (error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.error('Invalid input:', error.message);
        break;
      case 'UNAUTHORIZED':
        console.error('Authentication failed:', error.message);
        break;
      case 'CONFLICT':
        console.error('User already exists:', error.message);
        break;
      case 'NETWORK_ERROR':
        console.error('Network issue:', error.message);
        break;
    }
  }
}
```

---

## Testing

### Integration Tests with Jest and Supertest

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Authentication Endpoints', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'TestPass123';
  let authToken: string;

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testEmail);

      authToken = response.body.token;
    });

    it('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Conflict');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: testPassword,
        });

      expect(response.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testEmail);
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });
  });
});
```

---

## Summary

This guide covers:
- ✅ Frontend integration (React, Vue, Vanilla JS)
- ✅ Backend integration (Node.js, Python)
- ✅ Mobile integration (React Native)
- ✅ Advanced patterns (token refresh, interceptors, error handling)
- ✅ Comprehensive testing examples

For additional help, refer to:
- [API Documentation](./API.md)
- [Middleware Documentation](./MIDDLEWARE.md)

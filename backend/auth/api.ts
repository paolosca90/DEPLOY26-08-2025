import { api } from "encore.dev/api";

// Simplified auth service without external dependencies
// This is a placeholder to avoid compilation errors

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  plan: "free-trial" | "professional" | "enterprise";
  billingCycle?: "monthly" | "yearly";
  mt5Login: string;
  mt5Server: string;
  brokerName: string;
  accountType: "demo" | "live";
  mt5Password: string;
}

export interface RegisterResponse {
  success: boolean;
  userId?: number;
  installerToken?: string;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
}

// Mock registration (for development)
export const register = api<RegisterRequest, RegisterResponse>({
  method: "POST",
  path: "/auth/register",
  expose: true,
}, async (req) => {
  console.log("Mock registration for:", req.email);
  
  // Mock successful registration
  const mockUserId = Math.floor(Math.random() * 10000);
  const mockInstallerToken = `installer_token_${Date.now()}`;
  
  return {
    success: true,
    userId: mockUserId,
    installerToken: mockInstallerToken
  };
});

// Mock login (for development)
export const login = api<LoginRequest, LoginResponse>({
  method: "POST",
  path: "/auth/login",
  expose: true,
}, async (req) => {
  console.log("Mock login for:", req.email);
  
  // Simple demo credentials
  if (req.email === "demo@aiencoretrading.com" && req.password === "demo123") {
    return {
      success: true,
      token: `jwt_token_${Date.now()}`,
      user: {
        id: 1,
        firstName: "Demo",
        lastName: "User",
        email: req.email
      }
    };
  }
  
  return {
    success: false,
    error: "Credenziali non valide"
  };
});

// Get user profile (mock)
export const getProfile = api<{ userId: number }, { user: any }>({
  method: "GET",
  path: "/auth/profile/:userId",
  expose: true,
}, async ({ userId }) => {
  return {
    user: {
      id: userId,
      firstName: "Demo",
      lastName: "User",
      email: "demo@aiencoretrading.com"
    }
  };
});
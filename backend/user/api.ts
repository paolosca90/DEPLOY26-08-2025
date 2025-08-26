import { api, APIError } from "encore.dev/api";

// User represents a user in our system.
export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
}

// UserPreferences defines the user's trading settings.
export interface UserPreferences {
  userId: number;
  riskPercentage: number;
  accountBalance: number;
  updatedAt: Date;
}

// Mt5Config defines the user's MT5 connection details.
export interface Mt5Config {
  userId: number;
  host: string;
  port: number;
  login: string;
  server: string;
  // Password is not exposed in the API response for security
}

// Subscription defines the user's subscription plan.
export interface Subscription {
  userId: number;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "inactive" | "past_due";
  expiresAt: Date | null;
}

// getPreferences returns the trading preferences for the demo user.
export const getPreferences = api<void, { preferences: UserPreferences | null }>({
  method: "GET",
  path: "/user/preferences",
  expose: true,
}, async () => {
  // Return demo preferences
  const preferences: UserPreferences = {
    userId: 1,
    riskPercentage: 2.0,
    accountBalance: 9518.40, // Updated to match your actual MT5 balance
    updatedAt: new Date(),
  };
  return { preferences };
});

// updatePreferences updates the trading preferences for the demo user.
export const updatePreferences = api<{ riskPercentage: number; accountBalance: number }, { success: boolean }>({
  method: "POST",
  path: "/user/preferences",
  expose: true,
}, async (params) => {
  // For demo purposes, just return success
  console.log("Demo: Updated preferences", params);
  return { success: true };
});

// getMt5Config returns the MT5 configuration for the demo user.
export const getMt5Config = api<void, { config: Mt5Config | null }>({
  method: "GET",
  path: "/user/mt5-config",
  expose: true,
}, async () => {
  // Return your actual VPS MT5 config
  const config: Mt5Config = {
    userId: 1,
    host: "154.61.187.189", // Your actual VPS IP
    port: 8080,
    login: "6001637", // Your actual MT5 account
    server: "PureMGlobal-MT5", // Your actual server
  };
  return { config };
});

// updateMt5Config updates the MT5 configuration for the demo user.
export const updateMt5Config = api<Omit<Mt5Config, "userId"> & { password?: string }, { success: boolean }>({
  method: "POST",
  path: "/user/mt5-config",
  expose: true,
}, async (params) => {
  // For demo purposes, just return success
  console.log("Demo: Updated MT5 config", params);
  return { success: true };
});

// getSubscription returns the subscription status for the demo user.
export const getSubscription = api<void, { subscription: Subscription | null }>({
  method: "GET",
  path: "/user/subscription",
  expose: true,
}, async () => {
  // Return demo subscription
  const subscription: Subscription = {
    userId: 1,
    plan: "free",
    status: "active",
    expiresAt: null,
  };
  return { subscription };
});

// getMt5ConfigForUser returns the MT5 configuration for a specific user (used by scheduler).
export const getMt5ConfigForUser = api<{ userId: number }, { config: Mt5Config | null }>({
  method: "GET",
  path: "/user/mt5-config/:userId",
  expose: false, // Internal API for scheduler
}, async (params) => {
  // For demo purposes, return the same config for all users
  const config: Mt5Config = {
    userId: params.userId,
    host: "154.61.187.189", // Your actual VPS IP
    port: 8080,
    login: "6001637", // Your actual MT5 account
    server: "PureMGlobal-MT5", // Your actual server
  };
  return { config };
});

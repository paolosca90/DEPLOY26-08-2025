import { api } from "@encore/api";
import { SQLDatabase } from "@encore/storage/sqldb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Database initialization
const db = new SQLDatabase("auth", {
  migrations: "./migrations",
});

// Types and interfaces
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  emailVerified: boolean;
}

export interface UserSubscription {
  id: number;
  userId: number;
  plan: "free-trial" | "professional" | "enterprise";
  status: "active" | "inactive" | "past_due" | "cancelled";
  billingCycle?: "monthly" | "yearly";
  expiresAt?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MT5Credentials {
  id: number;
  userId: number;
  login: string;
  server: string;
  brokerName: string;
  accountType: "demo" | "live";
  passwordHash: string; // Encrypted MT5 password
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationRequest {
  // Personal data
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  
  // Plan selection
  plan: "free-trial" | "professional" | "enterprise";
  billingCycle?: "monthly" | "yearly";
  
  // MT5 data
  mt5Login: string;
  mt5Server: string;
  brokerName: string;
  accountType: "demo" | "live";
  mt5Password: string; // Will be encrypted immediately
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface RegistrationResponse {
  success: boolean;
  userId?: number;
  installerToken?: string;
  error?: string;
}

// JWT secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// Encryption key for MT5 passwords - In production, use secure key management
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-char-encryption-key-here";

// Helper functions
function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateJWT(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function encryptMT5Password(password: string): string {
  const cipher = crypto.createCipher("aes-256-cbc", ENCRYPTION_KEY);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptMT5Password(encryptedPassword: string): string {
  const decipher = crypto.createDecipher("aes-256-cbc", ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function generateInstallerToken(userId: number): string {
  const payload = {
    userId,
    type: "installer",
    generatedAt: new Date().toISOString()
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

// API Endpoints

// Register new user
export const register = api<RegistrationRequest, RegistrationResponse>({
  method: "POST",
  path: "/auth/register",
  expose: true,
}, async (req) => {
  try {
    // Validate email uniqueness
    const existingUser = await db.query`
      SELECT id FROM users WHERE email = ${req.email}
    `;
    
    if (existingUser.length > 0) {
      return { success: false, error: "Email già registrata" };
    }

    // Hash user password
    const passwordHash = await hashPassword(req.password);
    
    // Encrypt MT5 password
    const mt5PasswordHash = encryptMT5Password(req.mt5Password);

    // Start transaction
    await db.begin();

    try {
      // Create user
      const userResult = await db.query`
        INSERT INTO users (first_name, last_name, email, password_hash, phone, created_at, updated_at, is_active, email_verified)
        VALUES (${req.firstName}, ${req.lastName}, ${req.email}, ${passwordHash}, ${req.phone || null}, NOW(), NOW(), true, false)
        RETURNING id
      `;
      
      const userId = userResult[0].id;

      // Create subscription
      const expiresAt = req.plan === "free-trial" 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        : null;

      await db.query`
        INSERT INTO user_subscriptions (user_id, plan, status, billing_cycle, expires_at, created_at, updated_at)
        VALUES (${userId}, ${req.plan}, 'active', ${req.billingCycle || null}, ${expiresAt}, NOW(), NOW())
      `;

      // Store MT5 credentials
      await db.query`
        INSERT INTO mt5_credentials (user_id, login, server, broker_name, account_type, password_hash, is_active, created_at, updated_at)
        VALUES (${userId}, ${req.mt5Login}, ${req.mt5Server}, ${req.brokerName}, ${req.accountType}, ${mt5PasswordHash}, true, NOW(), NOW())
      `;

      await db.commit();

      // Generate installer token
      const installerToken = generateInstallerToken(userId);

      // Send welcome email with installer link (async - don't wait)
      try {
        const installerDownloadUrl = `${process.env.BASE_URL || 'http://localhost:4000'}/installer/download/${installerToken}`;
        
        // Import email service dynamically to avoid circular dependencies
        const emailService = await import("../email/api");
        await emailService.sendWelcomeEmail({
          userEmail: req.email,
          userName: `${req.firstName} ${req.lastName}`,
          installerDownloadUrl,
          plan: req.plan
        });
        
        console.log(`✅ Welcome email sent to ${req.email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send welcome email to ${req.email}:`, emailError);
        // Don't fail registration if email fails
      }

      console.log(`New user registered: ${req.email} (ID: ${userId})`);

      return {
        success: true,
        userId,
        installerToken
      };

    } catch (error) {
      await db.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: "Errore durante la registrazione. Riprova più tardi." 
    };
  }
});

// Login user
export const login = api<LoginRequest, AuthResponse>({
  method: "POST",
  path: "/auth/login",
  expose: true,
}, async (req) => {
  try {
    // Find user by email
    const userResult = await db.query`
      SELECT id, first_name, last_name, email, password_hash, phone, created_at, updated_at, is_active, email_verified
      FROM users 
      WHERE email = ${req.email} AND is_active = true
    `;

    if (userResult.length === 0) {
      return { success: false, error: "Credenziali non valide" };
    }

    const userData = userResult[0];
    
    // Verify password
    const isValidPassword = await verifyPassword(req.password, userData.password_hash);
    
    if (!isValidPassword) {
      return { success: false, error: "Credenziali non valide" };
    }

    // Generate JWT token
    const token = generateJWT(userData.id, userData.email);

    // Return user data (without password hash)
    const user: User = {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      email: userData.email,
      phone: userData.phone,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      isActive: userData.is_active,
      emailVerified: userData.email_verified
    };

    return {
      success: true,
      token,
      user
    };

  } catch (error: any) {
    console.error("Login error:", error);
    return { 
      success: false, 
      error: "Errore durante il login. Riprova più tardi." 
    };
  }
});

// Get user profile
export const getProfile = api<{ userId: number }, { user: User | null }>({
  method: "GET", 
  path: "/auth/profile/:userId",
  expose: true,
}, async ({ userId }) => {
  try {
    const userResult = await db.query`
      SELECT id, first_name, last_name, email, phone, created_at, updated_at, is_active, email_verified
      FROM users 
      WHERE id = ${userId} AND is_active = true
    `;

    if (userResult.length === 0) {
      return { user: null };
    }

    const userData = userResult[0];
    
    const user: User = {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      email: userData.email,
      phone: userData.phone,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      isActive: userData.is_active,
      emailVerified: userData.email_verified
    };

    return { user };

  } catch (error: any) {
    console.error("Get profile error:", error);
    return { user: null };
  }
});

// Get user subscription
export const getUserSubscription = api<{ userId: number }, { subscription: UserSubscription | null }>({
  method: "GET",
  path: "/auth/subscription/:userId", 
  expose: true,
}, async ({ userId }) => {
  try {
    const subscriptionResult = await db.query`
      SELECT id, user_id, plan, status, billing_cycle, expires_at, stripe_customer_id, stripe_subscription_id, created_at, updated_at
      FROM user_subscriptions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscriptionResult.length === 0) {
      return { subscription: null };
    }

    const subData = subscriptionResult[0];
    
    const subscription: UserSubscription = {
      id: subData.id,
      userId: subData.user_id,
      plan: subData.plan,
      status: subData.status,
      billingCycle: subData.billing_cycle,
      expiresAt: subData.expires_at,
      stripeCustomerId: subData.stripe_customer_id,
      stripeSubscriptionId: subData.stripe_subscription_id,
      createdAt: subData.created_at,
      updatedAt: subData.updated_at
    };

    return { subscription };

  } catch (error: any) {
    console.error("Get subscription error:", error);
    return { subscription: null };
  }
});

// Get MT5 credentials for user (for installer generation)
export const getMT5Credentials = api<{ userId: number }, { credentials: Omit<MT5Credentials, "passwordHash"> | null }>({
  method: "GET",
  path: "/auth/mt5-credentials/:userId",
  expose: true,
}, async ({ userId }) => {
  try {
    const credentialsResult = await db.query`
      SELECT id, user_id, login, server, broker_name, account_type, is_active, created_at, updated_at
      FROM mt5_credentials 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (credentialsResult.length === 0) {
      return { credentials: null };
    }

    const credData = credentialsResult[0];
    
    // Return credentials without password hash for security
    const credentials = {
      id: credData.id,
      userId: credData.user_id,
      login: credData.login,
      server: credData.server,
      brokerName: credData.broker_name,
      accountType: credData.account_type,
      isActive: credData.is_active,
      createdAt: credData.created_at,
      updatedAt: credData.updated_at
    };

    return { credentials };

  } catch (error: any) {
    console.error("Get MT5 credentials error:", error);
    return { credentials: null };
  }
});

// Get decrypted MT5 password (for installer generation only)
export const getMT5Password = api<{ userId: number, installerToken: string }, { password: string | null }>({
  method: "POST",
  path: "/auth/mt5-password",
  expose: true,
}, async ({ userId, installerToken }) => {
  try {
    // Verify installer token
    const decoded = jwt.verify(installerToken, JWT_SECRET) as any;
    
    if (decoded.userId !== userId || decoded.type !== "installer") {
      return { password: null };
    }

    // Get encrypted password
    const credentialsResult = await db.query`
      SELECT password_hash
      FROM mt5_credentials 
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (credentialsResult.length === 0) {
      return { password: null };
    }

    // Decrypt password
    const encryptedPassword = credentialsResult[0].password_hash;
    const password = decryptMT5Password(encryptedPassword);

    return { password };

  } catch (error: any) {
    console.error("Get MT5 password error:", error);
    return { password: null };
  }
});
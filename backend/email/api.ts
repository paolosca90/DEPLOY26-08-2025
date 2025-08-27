import { api } from "encore.dev/api";

// Simplified email service
export interface SendEmailRequest {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendWelcomeEmailRequest {
  userEmail: string;
  userName: string;
  installerDownloadUrl: string;
  plan: string;
}

// Mock email sending
export const sendEmail = api<SendEmailRequest, SendEmailResponse>({
  method: "POST",
  path: "/email/send",
  expose: true,
}, async (request) => {
  console.log("📧 Mock email sent:");
  console.log(`To: ${request.to} (${request.toName || 'No name'})`);
  console.log(`Subject: ${request.subject}`);
  console.log(`Content length: ${request.htmlContent.length} chars`);
  
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
});

// Mock welcome email
export const sendWelcomeEmail = api<SendWelcomeEmailRequest, SendEmailResponse>({
  method: "POST",
  path: "/email/welcome",
  expose: true,
}, async ({ userEmail, userName, installerDownloadUrl, plan }) => {
  console.log(`📧 Mock welcome email sent to ${userName} (${userEmail})`);
  console.log(`Plan: ${plan}, Installer URL: ${installerDownloadUrl}`);
  
  return {
    success: true,
    messageId: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
});
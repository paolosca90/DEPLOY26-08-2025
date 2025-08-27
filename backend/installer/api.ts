import { api } from "encore.dev/api";

// Simplified installer service
export interface GenerateInstallerRequest {
  userId: number;
  installerToken: string;
}

export interface GenerateInstallerResponse {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
}

// Mock installer generation
export const generateInstaller = api<GenerateInstallerRequest, GenerateInstallerResponse>({
  method: "POST",
  path: "/installer/generate",
  expose: true,
}, async ({ userId, installerToken }) => {
  console.log(`Mock installer generation for user ${userId}`);
  
  const downloadToken = `download_${Date.now()}_${userId}`;
  const downloadUrl = `/installer/download/${downloadToken}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return {
    success: true,
    downloadUrl,
    expiresAt
  };
});

// Mock installer download
export const downloadInstaller = api<{ downloadToken: string }, Response>({
  method: "GET",
  path: "/installer/download/:downloadToken",
  expose: true,
}, async ({ downloadToken }) => {
  console.log(`Mock installer download for token: ${downloadToken}`);
  
  const installerContent = `@echo off
REM AI-ENCORE Mock Installer
REM Token: ${downloadToken}
REM Generated: ${new Date().toISOString()}

echo Mock AI-ENCORE Installer
echo This is a placeholder installer for development
echo In production, this would be a fully personalized installer
pause
`;

  return new Response(installerContent, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="AI-ENCORE-Mock-Installer.bat"`,
    },
  });
});
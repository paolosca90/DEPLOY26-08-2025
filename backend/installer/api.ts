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

// Download installer response interface
export interface DownloadInstallerResponse {
  success: boolean;
  content?: string;
  filename?: string;
  error?: string;
}

// Mock installer download
export const downloadInstaller = api<{ downloadToken: string }, DownloadInstallerResponse>({
  method: "GET",
  path: "/installer/download/:downloadToken",
  expose: true,
}, async ({ downloadToken }) => {
  console.log(`Mock installer download for token: ${downloadToken}`);
  
  const installerContent = `@echo off
REM AI-ENCORE Mock Installer
REM Token: ${downloadToken}
REM Generated: ${new Date().toISOString()}

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               🚀 AI-ENCORE MOCK INSTALLER 🚀                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Token: ${downloadToken}
echo Data: ${new Date().toLocaleString('it-IT')}
echo.
echo Questo è un installer di esempio per sviluppo.
echo In produzione, questo sarà completamente personalizzato.
echo.
echo Il tuo installer reale includerà:
echo ✅ Python e dipendenze automatiche
echo ✅ MetaTrader 5 configurato
echo ✅ Credenziali MT5 preimpostate
echo ✅ API Keys già configurate
echo ✅ Zero configurazione manuale richiesta
echo.
echo 🎯 Installazione completata!
echo.
pause
`;

  return {
    success: true,
    content: installerContent,
    filename: "AI-ENCORE-Mock-Installer.bat"
  };
});
import { api } from "encore.dev/api";
import { Secret } from "encore.dev/config";

// Email service configuration - use environment variables in production
const EMAIL_API_KEY = new Secret("EMAIL_API_KEY"); // For SendGrid, Mailgun, etc.
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@aiencoretrading.com";
const FROM_NAME = process.env.FROM_NAME || "AI-ENCORE Trading";

// Types
export interface SendEmailRequest {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendWelcomeEmailRequest {
  userEmail: string;
  userName: string;
  installerDownloadUrl: string;
  plan: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email templates
function getWelcomeEmailTemplate(userName: string, plan: string, downloadUrl: string): { subject: string, html: string, text: string } {
  const subject = `🎉 Benvenuto in AI-ENCORE, ${userName}!`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benvenuto in AI-ENCORE</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            margin: 0; 
            padding: 20px; 
            color: #ffffff;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: rgba(255, 255, 255, 0.05); 
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { 
            color: white; 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold;
        }
        .content { 
            padding: 30px; 
        }
        .welcome-box {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .plan-badge {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
        }
        .download-button { 
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white; 
            text-decoration: none; 
            padding: 15px 30px; 
            border-radius: 8px; 
            display: inline-block; 
            font-weight: bold;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        .download-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }
        .features {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .features h3 {
            color: #10b981;
            margin: 0 0 15px 0;
        }
        .features ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .features li {
            padding: 8px 0;
            color: #e2e8f0;
        }
        .features li:before {
            content: "✅ ";
            margin-right: 10px;
        }
        .footer { 
            background: rgba(0, 0, 0, 0.3); 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
            color: #94a3b8;
        }
        .warning {
            background: rgba(245, 101, 101, 0.1);
            border: 1px solid rgba(245, 101, 101, 0.3);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-title {
            color: #f56565;
            font-weight: bold;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Benvenuto in AI-ENCORE!</h1>
        </div>
        
        <div class="content">
            <div class="welcome-box">
                <h2 style="margin: 0 0 15px 0; color: #60a5fa;">Ciao ${userName}! 👋</h2>
                <p>La tua registrazione è stata completata con successo. Ora hai accesso al sistema di trading AI più avanzato del mercato.</p>
                <div class="plan-badge">${plan.toUpperCase()}</div>
            </div>

            <div class="features">
                <h3>🎯 Cosa puoi fare ora:</h3>
                <ul>
                    <li>Scaricare il tuo installer personalizzato</li>
                    <li>Installare AI-ENCORE sul tuo computer/VPS</li>
                    <li>Collegare automaticamente il tuo MT5</li>
                    <li>Iniziare a ricevere segnali AI</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <h3 style="color: #fbbf24;">📥 Download Il Tuo Installer Personalizzato</h3>
                <p>Il tuo installer è preconfigurato con tutti i tuoi dati:</p>
                <a href="${downloadUrl}" class="download-button">
                    🔗 SCARICA AI-ENCORE INSTALLER
                </a>
                <p style="font-size: 14px; color: #94a3b8;">
                    L'installer include già le tue credenziali MT5 e configurazioni
                </p>
            </div>

            <div class="warning">
                <div class="warning-title">⚠️ Importante:</div>
                <p style="margin: 0; font-size: 14px;">
                    - Esegui l'installer come Amministratore<br>
                    - Assicurati che MetaTrader 5 sia chiuso durante l'installazione<br>
                    - Il download è valido per 24 ore
                </p>
            </div>

            <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #a78bfa; margin: 0 0 15px 0;">🆘 Hai bisogno di aiuto?</h3>
                <p style="margin: 0;">
                    Il nostro team di supporto è qui per te:<br>
                    📧 Email: <a href="mailto:support@aiencoretrading.com" style="color: #60a5fa;">support@aiencoretrading.com</a><br>
                    💬 Telegram: @AIEncoreSupport
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2025 AI-ENCORE Trading. Tutti i diritti riservati.</p>
            <p style="font-size: 12px; margin: 10px 0 0 0;">
                Il trading comporta rischi. I risultati passati non garantiscono performance future.
            </p>
        </div>
    </div>
</body>
</html>`;

  const text = `
🎉 Benvenuto in AI-ENCORE, ${userName}!

La tua registrazione è stata completata con successo.
Piano: ${plan.toUpperCase()}

🔗 SCARICA IL TUO INSTALLER PERSONALIZZATO:
${downloadUrl}

L'installer include già:
✅ Le tue credenziali MT5
✅ Configurazioni personalizzate  
✅ API Keys preconfigurate

⚠️ IMPORTANTE:
- Esegui l'installer come Amministratore
- Chiudi MetaTrader 5 durante l'installazione
- Il download è valido per 24 ore

🆘 SUPPORTO:
Email: support@aiencoretrading.com
Telegram: @AIEncoreSupport

© 2025 AI-ENCORE Trading
Il trading comporta rischi.
`;

  return { subject, html, text };
}

// Mock email service (replace with real email service in production)
async function sendEmailMock(request: SendEmailRequest): Promise<SendEmailResponse> {
  console.log("📧 [EMAIL SERVICE] Mock email sent:");
  console.log(`To: ${request.to} (${request.toName || 'No name'})`);
  console.log(`Subject: ${request.subject}`);
  console.log(`Content length: ${request.htmlContent.length} chars`);
  
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Real email service integration (example with SendGrid)
async function sendEmailReal(request: SendEmailRequest): Promise<SendEmailResponse> {
  try {
    // Example with SendGrid API
    const apiKey = await EMAIL_API_KEY();
    
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ 
            email: request.to, 
            name: request.toName 
          }],
        }],
        from: { 
          email: FROM_EMAIL, 
          name: FROM_NAME 
        },
        subject: request.subject,
        content: [
          {
            type: "text/html",
            value: request.htmlContent
          },
          ...(request.textContent ? [{
            type: "text/plain",
            value: request.textContent
          }] : [])
        ]
      })
    });

    if (response.ok) {
      const messageId = response.headers.get("X-Message-Id") || "unknown";
      return { 
        success: true, 
        messageId 
      };
    } else {
      const error = await response.text();
      return { 
        success: false, 
        error: `SendGrid error: ${response.status} - ${error}` 
      };
    }

  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Unknown email error" 
    };
  }
}

// API Endpoints

// Send generic email
export const sendEmail = api<SendEmailRequest, SendEmailResponse>({
  method: "POST",
  path: "/email/send",
  expose: true,
}, async (request) => {
  try {
    // Use mock service for development, real service for production
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction) {
      return await sendEmailReal(request);
    } else {
      return await sendEmailMock(request);
    }

  } catch (error: any) {
    console.error("Send email error:", error);
    return {
      success: false,
      error: "Errore durante l'invio dell'email"
    };
  }
});

// Send welcome email with installer
export const sendWelcomeEmail = api<SendWelcomeEmailRequest, SendEmailResponse>({
  method: "POST",
  path: "/email/welcome",
  expose: true,
}, async ({ userEmail, userName, installerDownloadUrl, plan }) => {
  try {
    const emailTemplate = getWelcomeEmailTemplate(userName, plan, installerDownloadUrl);
    
    return await sendEmail({
      to: userEmail,
      toName: userName,
      subject: emailTemplate.subject,
      htmlContent: emailTemplate.html,
      textContent: emailTemplate.text
    });

  } catch (error: any) {
    console.error("Send welcome email error:", error);
    return {
      success: false,
      error: "Errore durante l'invio dell'email di benvenuto"
    };
  }
});

// Send installer reminder email
export const sendInstallerReminder = api<{ userEmail: string, userName: string, downloadUrl: string }, SendEmailResponse>({
  method: "POST", 
  path: "/email/installer-reminder",
  expose: true,
}, async ({ userEmail, userName, downloadUrl }) => {
  try {
    const subject = `⏰ Promemoria: Scarica il tuo AI-ENCORE Installer`;
    
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: white; border-radius: 12px; padding: 20px;">
    <h2 style="color: #fbbf24;">⏰ Non dimenticare il tuo installer!</h2>
    
    <p>Ciao <strong>${userName}</strong>,</p>
    
    <p>Abbiamo notato che non hai ancora scaricato il tuo installer personalizzato AI-ENCORE.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; display: inline-block;">
            🔗 SCARICA ORA
        </a>
    </div>
    
    <p style="color: #f87171; font-weight: bold;">⚠️ Il link scade tra poche ore!</p>
    
    <p>Se hai problemi, contatta il supporto: support@aiencoretrading.com</p>
</div>`;

    const text = `
⏰ Non dimenticare il tuo installer AI-ENCORE!

Ciao ${userName},

Non hai ancora scaricato il tuo installer personalizzato.

Scarica ora: ${downloadUrl}

⚠️ Il link scade tra poche ore!

Supporto: support@aiencoretrading.com
`;

    return await sendEmail({
      to: userEmail,
      toName: userName, 
      subject,
      htmlContent: html,
      textContent: text
    });

  } catch (error: any) {
    console.error("Send reminder email error:", error);
    return {
      success: false,
      error: "Errore durante l'invio dell'email di promemoria"
    };
  }
});
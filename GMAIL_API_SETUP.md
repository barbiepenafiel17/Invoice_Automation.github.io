# 📧 Gmail API Setup Guide for Invoice Automation

## Overview

Your Invoice Automation app now supports **Gmail API integration** which allows you to send invoices directly from your Gmail account. This means:

- ✅ **Send from YOUR Gmail**: Emails come from your actual Gmail address
- ✅ **Sent folder sync**: All sent invoices appear in your Gmail Sent folder  
- ✅ **Professional delivery**: Recipients see your real Gmail address
- ✅ **Free quota**: 250 emails per day with standard Gmail
- ✅ **No third-party**: Direct integration with Google's servers

## Quick Setup (5 minutes) ⚡

### Fast Track Setup:
1. **📋 Copy these templates** for faster configuration
2. **⚡ Use shortcuts** to speed up Google Cloud setup  
3. **🔄 Auto-initialization** - configure once, works everywhere

### Step 1: Create Google Cloud Project (1 minute)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give your project a name like "Invoice Automation"
4. Click **"Create"**

### Step 2: Enable Gmail API (30 seconds)

1. **Quick link**: [Enable Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
2. Select your project → Click **"Enable"**
3. ✅ Done in one click!

### Step 3: Create API Credentials (2 minutes)

#### ⚡ Fast API Key Creation:
1. **Quick link**: [Create API Key](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"API key"**
3. **Copy immediately** (starts with `AIzaSy...`)
4. **Optional**: Click "Restrict Key" → Select "Gmail API"

#### ⚡ Fast OAuth Client:
1. Same page → **"Create Credentials"** → **"OAuth client ID"**
2. Choose **"Web application"**
3. **Name**: "Invoice Automation"
4. **Add authorized origins**:
   ```
   http://localhost:3000
   http://localhost:8080
   https://yourdomain.vercel.app
   ```
5. **Copy Client ID** (ends with `.apps.googleusercontent.com`)

### Step 4: Configure OAuth Consent (1 minute)

1. **Quick link**: [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **"External"** → **"Create"**
3. **Minimum required fields**:
   - **App name**: "Invoice Automation"
   - **User support email**: Your email  
   - **Developer contact**: Your email
4. **Click "Save and Continue"** (skip optional fields)

#### ⚡ Add Gmail Scope (30 seconds):
1. **"Scopes"** tab → **"Add or Remove Scopes"**
2. **Search**: `gmail.send` → Select it
3. **"Update"** → **"Save and Continue"**

#### ⚡ Add Test User:
1. **"Test Users"** → **"Add Users"** → Enter your Gmail
2. **"Save and Continue"** → **"Back to Dashboard"**

### Step 5: Configure Your App (30 seconds) 🚀

1. In your Invoice Automation app, click **"📧 Send Email"**
2. When prompted, click **"🚀 Setup Gmail API"**
3. Enter your credentials:
   - **API Key**: The key from Step 3 (starts with `AIzaSy...`)
   - **Client ID**: The client ID from Step 3 (ends with `.apps.googleusercontent.com`)
4. Click **"💾 Save Configuration"**
5. Click **"🔐 Test Sign-In"** and authorize the app
6. You're ready to send emails!

## How It Works

### First Time Setup:
1. App opens Google sign-in popup
2. You authorize the app to send emails on your behalf
3. Google provides secure access token
4. App can now send emails directly through Gmail

### Sending Invoices:
1. Click **"📧 Send Email"** on any saved invoice
2. App automatically composes professional email
3. Email is sent directly from your Gmail account
4. Copy appears in your Gmail Sent folder
5. Client receives email from your actual Gmail address

### Security:
- **OAuth 2.0**: Industry-standard secure authentication
- **Limited scope**: App can only send emails, not read them
- **Your control**: You can revoke access anytime in Google Account settings
- **No passwords**: App never sees your Gmail password

## Troubleshooting

### "Sign-in failed" or "Authorization error"
- Make sure your domain is in "Authorized JavaScript origins"
- For local testing, use `http://localhost` not `127.0.0.1`
- Check that Gmail API is enabled in Google Cloud Console
- Verify your OAuth consent screen is configured

### "API key not valid"
- Make sure API key is unrestricted or restricted to Gmail API only
- Check that the key wasn't accidentally deleted from Google Cloud
- Try creating a new API key

### "Access blocked" or "App not verified"
- This is normal during development with "External" consent screen
- Click "Advanced" → "Go to Invoice Automation (unsafe)" to proceed
- For production, submit app for verification (optional)

### "Daily quota exceeded"
- Gmail API has daily quotas (usually very high)
- Check your quota usage in Google Cloud Console
- Most users never hit these limits with normal invoice sending

## Advanced Configuration

### Production Deployment:
1. Update "Authorized JavaScript origins" with your live domain
2. Consider verifying your app for higher quotas
3. Monitor usage in Google Cloud Console

### Custom Email Templates:
The app automatically generates professional emails, but you can customize the templates by modifying the `generateInvoiceEmailBody` function in `gmail-api.js`.

### Bulk Email Sending:
For bulk operations, be mindful of Gmail's sending limits:
- **250 messages/day** for standard Gmail
- **2000 messages/day** for Google Workspace

## Alternative Setup Options

If Gmail API setup seems complex, the app also supports:

1. **📋 Copy & Paste**: Copy email content to any email client
2. **📱 Social Sharing**: Share via WhatsApp, Telegram, SMS
3. **📬 Basic Gmail**: Open Gmail compose window (manual sending)
4. **📎 PDF Email**: Download PDF and attach manually

## Benefits vs. Other Methods

| Method | Setup Time | Automation | From Address | Sent Folder |
|--------|------------|------------|--------------|-------------|
| **Gmail API** | 10 min | Full | Your Gmail | ✅ Yes |
| EmailJS | 5 min | Full | Service email | ❌ No |
| Mailto | 0 min | Manual | Your default | Varies |
| Copy/Paste | 0 min | Manual | Any email | Varies |

## Need Help?

1. **Video Tutorial**: [Coming soon - Gmail API setup walkthrough]
2. **Test Configuration**: Use the "Test Sign-In" button in the setup modal
3. **Check Logs**: Browser console shows detailed error messages
4. **Google Support**: [Gmail API documentation](https://developers.google.com/gmail/api)

---

**Ready to send professional invoices directly from your Gmail? Click "🚀 Setup Gmail API" in your invoice builder!**

*This setup is one-time only. Once configured, sending invoices is as simple as clicking "Send Email".*

# 🚀 Invoice Automation - Node.js Version

## 📋 Overview

Your Invoice Automation app has been **completely converted from PHP to Node.js**! 🎉

- ✅ **Frontend**: Pure JavaScript (unchanged)
- ✅ **Backend**: Node.js + Express (replacing PHP)
- ✅ **Email Service**: Nodemailer (replacing PHPMailer)
- ✅ **PDF Export**: html2pdf.js (unchanged)

## 🛠️ Setup & Installation

### Prerequisites
- Node.js v16+ ✅ (You have v22.18.0)
- npm ✅ (You have v10.9.3)

### Install Dependencies
```bash
cd c:\xampp\htdocs\Invoice_Automation
npm install
```

## 🚀 Running the Application

### Option 1: Development Mode (Recommended)
```bash
npm run dev
```
This runs with nodemon for auto-restart on file changes.

### Option 2: Production Mode
```bash
npm start
```

### Option 3: Frontend Only (Legacy)
```bash
npm run frontend
```

## 🌐 Access Your App

- **Full Application**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **Email API**: http://localhost:3001/api/send-email

## 📧 Email Service API

### Primary Endpoint
- **URL**: `POST /api/send-email`
- **Features**: PDF attachment support
- **Content-Type**: `multipart/form-data`

### Fallback Endpoint
- **URL**: `POST /api/send-simple-email`
- **Features**: Simple email (no attachments)
- **Content-Type**: `application/json`

## 🔄 What Changed

### ✅ Converted to Node.js:
- `send-email.php` → `server.js` (Node.js/Express)
- `send-email-simple.php` → `/api/send-simple-email` endpoint
- `composer.json` → `package.json` (Node.js dependencies)
- PHPMailer → Nodemailer

### ✅ Kept the Same:
- Frontend JavaScript code (minimal changes)
- HTML structure and Tailwind CSS
- PDF generation with html2pdf.js
- All app functionality

## 🔧 Email Configuration

Your app still uses **Gmail SMTP** with the same settings:
- **From Email**: Your Gmail address
- **App Password**: Gmail App Password (16-character code)
- **Recipients**: Any valid email address

## 📁 File Structure

```
Invoice_Automation/
├── server.js              # 🆕 Node.js email service
├── package.json            # 🆕 Node.js dependencies
├── index.html              # ✅ Frontend (updated API calls)
├── node_modules/           # 🆕 Node.js packages
├── send-email.php          # ❌ No longer needed
├── send-email-simple.php   # ❌ No longer needed
├── composer.json           # ❌ No longer needed
└── vendor/                 # ❌ No longer needed
```

## 🧪 Testing

1. **Start the server**: `npm run dev`
2. **Open**: http://localhost:3001
3. **Create an invoice** with line items
4. **Test PDF export** - Should work perfectly
5. **Test email sending** - Uses Node.js service

## 🆚 PHP vs Node.js Comparison

| Feature | PHP Version | Node.js Version |
|---------|-------------|-----------------|
| **Backend** | Apache + PHP | Node.js + Express |
| **Email** | PHPMailer | Nodemailer |
| **Dependencies** | Composer | npm |
| **Server** | XAMPP Apache | Node.js built-in |
| **Port** | 80/8080 | 3001 |
| **Performance** | Good | Excellent |
| **Maintenance** | PHP + JS | Pure JavaScript |

## 🎯 Benefits of Node.js Version

- **🚀 Faster**: Node.js is generally faster than PHP
- **🔧 Unified**: Same language (JavaScript) for frontend and backend
- **📦 Better Dependency Management**: npm vs Composer
- **🔄 Auto-Reload**: Development server with auto-restart
- **☁️ Cloud-Ready**: Easier deployment to Vercel, Heroku, etc.
- **💾 Lightweight**: No need for Apache/XAMPP

## 🚨 Migration Complete!

Your PHP files are no longer needed:
- ❌ `send-email.php`
- ❌ `send-email-simple.php`
- ❌ `composer.json`
- ❌ `vendor/` folder

Everything now runs on **pure JavaScript** (frontend + backend)! 🎉

## 🆘 Troubleshooting

### Email Issues
- Check Gmail App Password (16 characters, no spaces)
- Verify Gmail 2FA is enabled
- Check server logs for detailed errors

### Server Issues
- Make sure port 3001 is available
- Check Node.js version: `node --version`
- Reinstall dependencies: `npm install`

## 🎊 Ready to Go!

Your Invoice Automation app is now running on **100% JavaScript** with Node.js! 

**Start the server**: `npm run dev`
**Open**: http://localhost:3001

Happy invoicing! 📄✨

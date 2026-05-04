# InvoiceIQ — Intelligent Invoice Automation for Modern Businesses

<div align="center">

![InvoiceIQ Banner](https://img.shields.io/badge/InvoiceIQ-AI%20Powered-00C6FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTQgMkg2YTIgMiAwIDAwLTIgMnYxNmEyIDIgMCAwMDIgMmgxMmEyIDIgMCAwMDItMlY4bC02LTZ6IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE0IDJ2NmgNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-FF6B35?style=flat-square)](https://anthropic.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

*Extract · Structure · Analyse · Export*

Transform your invoices and receipts into structured data in seconds using Claude AI

[🚀 Live Demo](#) · [📖 Documentation](#setup) · [🐛 Report Bug](#) · [✨ Request Feature](#)

</div>

---

## 🎯 What is InvoiceIQ?

*InvoiceIQ* is a full-stack AI-powered invoice automation platform that helps businesses extract, organise, and analyse financial documents instantly. Upload any invoice or receipt — PDF or image — and get clean structured data with vendor details, amounts, GST breakdown, and category classification in seconds.

> 💡 *Built for*: Small businesses, accountants, CAs, freelancers, and finance teams who process multiple invoices daily.

---

## ✨ Features

### 🤖 AI-Powered Extraction
- Upload *PDF, JPG, PNG, WEBP* invoices
- Claude AI extracts: Vendor, Invoice No, Date, Amount, GST, Line Items, Payment Terms
- *Auto-categorisation*: Software, Marketing, Travel, Operations, Food, Office, Legal
- *Confidence scoring* for every extraction
- *Duplicate detection* — prevents same invoice from being processed twice

### 📦 Bulk Processing
- Upload up to *100 files at once*
- Drag & drop entire folders
- Real-time progress bar: "Processing 5 of 20…"
- Individual file status tracking

### 🔥 Smart Insights
- *Top vendor* this month
- *Highest expense category*
- *Spending change %* vs last month
- Average invoice value
- High-confidence extraction count
- Total GST liability at a glance

### 📊 Analytics Dashboard
- Monthly spending bar chart
- Vendor-wise donut chart breakdown
- Category breakdown with progress bars
- Auto-categorisation summary

### 📄 Monthly Report Generator
- Select any month and year
- Generate professional HTML/PDF report
- Includes: Total spend, GST summary, Category breakdown, Full invoice table
- Print-ready format — clients love it

### 🤖 AI Chat Assistant
- Ask questions about your invoices in plain English:
  - "How much did I spend on marketing?"
  - "Who is my top vendor?"
  - "What is my total GST for March?"
- Powered by Claude AI

### 🔍 Search & Filters
- Search by vendor name, invoice number, category
- Filter by category (Software, Marketing, Travel, etc.)
- Filter by month
- Sort by date, amount, vendor, confidence

### ✏️ Edit & Save
- Editable fields for every extracted invoice
- Correct AI mistakes instantly
- Changes saved to local storage permanently

### 📤 Export Options
- *Excel Export* (.xls) — formatted with totals, colors, filters
- *CSV Export* — raw data for any tool
- *Email Report* — beautifully formatted HTML email via Gmail
- *Google Sheets* — auto-sync every invoice to your spreadsheet

### 🧾 GST Report
- Monthly GST breakdown
- CGST / SGST estimation
- Total tax liability summary
- Perfect for Indian businesses and CAs

### 🕐 History
- All invoices saved locally
- Persists after browser refresh
- Full edit and delete functionality

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Pure CSS-in-JS (no Tailwind needed) |
| AI Engine | Claude AI (claude-haiku-4-5-20251001) |
| Backend | Node.js (no Express — pure http module) |
| Email | Gmail SMTP over TLS |
| Storage | Browser localStorage |
| Export | Native Excel/CSV generation |

---

## 🚀 Setup

### Prerequisites
- Node.js v18+
- Anthropic API key ([Get one here](https://console.anthropic.com))
- Gmail account with App Password (for email feature)

### 1. Clone the repository

bash
git clone https://github.com/YOURNAME/invoice-iq.git
cd invoice-iq


### 2. Install dependencies

bash
npm install


### 3. Create .env file

Create a .env file in the *root* of the project:

env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
GMAIL_USER=your@gmail.com
GMAIL_PASS=your-16-char-app-password


> ⚠️ *Get Gmail App Password*: Google Account → Security → 2-Step Verification → App Passwords → Generate

### 4. Start the backend server

bash
node server.js


You should see:

================================
  InvoiceIQ Server v3.1
================================
API Key:  YES ✅
Gmail:    YES ✅ (your@gmail.com)
================================
🚀 Server ready at http://localhost:3001


### 5. Start the frontend

Open a new terminal:

bash
npm run dev


Open *http://localhost:5173* in your browser.

---

## 📁 Project Structure


invoice-iq/
├── src/
│   ├── App.jsx          # Main React application (all features)
│   ├── App.css          # Base styles
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── server.js            # Node.js backend proxy server
├── .env                 # Environment variables (never commit!)
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
└── README.md            # This file


---

## 🌐 Deployment

### Frontend → Vercel (Free)

bash
npm run build


1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Import your invoice-iq repository
3. Click *Deploy*
4. Your app is live at https://invoice-iq.vercel.app

### Backend → Render (Free)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Settings:
   - *Build Command*: npm install
   - *Start Command*: node server.js
4. Add Environment Variables (same as .env)
5. Deploy → Get your URL: https://invoice-iq-api.onrender.com

### Update API URL

In src/App.jsx, replace all occurrences of:

http://localhost:3001

With your Render URL:

https://invoice-iq-api.onrender.com


---

## 💰 Pricing Model (For Selling)

| Plan | Price | Features |
|------|-------|---------|
| *Basic* | ₹5,000/month | 50 invoices, CSV export |
| *Pro* | ₹15,000/month | Unlimited, Excel + Email + Sheets |
| *Enterprise* | ₹30,000+/month | Custom features, Priority support |

---

## 🔐 Security

- API keys stored in .env (never exposed to frontend)
- All Anthropic API calls proxied through backend
- No invoice data stored on server (localStorage only)
- .env included in .gitignore

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: git checkout -b feature/amazing-feature
3. Commit your changes: git commit -m 'Add amazing feature'
4. Push to the branch: git push origin feature/amazing-feature
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👩‍💻 Built By

*Kirthika* — Built with ❤️ using React, Node.js and Claude AI

> "From idea to product in days — this is the power of AI-assisted development."

---

<div align="center">

*⭐ Star this repo if InvoiceIQ helped you!*

[GitHub](https://github.com/YOURNAME/invoice-iq) · [Report Bug](#) · [Request Feature](#)

</div>

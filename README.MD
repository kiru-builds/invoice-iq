# InvoiceIQ — Intelligent Invoice Automation for Modern Businesses

<div align="center">

<img src="https://img.shields.io/badge/InvoiceIQ-AI%20Powered-00C6FF?style=for-the-badge" alt="InvoiceIQ"/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-invoice--iq--green.vercel.app-00C6FF?style=for-the-badge)](https://invoice-iq-green.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-kiru--builds-181717?style=for-the-badge&logo=github)](https://github.com/kiru-builds/invoice-iq)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Kirthika%20Rajendran-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kirthika-rajendran-0303383b4)

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-FF6B35?style=flat-square)](https://anthropic.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://invoice-iq-green.vercel.app)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=flat-square&logo=render)](https://invoice-iq-ievx.onrender.com)

*Extract · Structure · Analyse · Export*

Transform invoices and receipts into structured data in seconds using Claude AI

[🚀 Live Demo](https://invoice-iq-green.vercel.app) · [📧 Contact](mailto:kirthikarajendran2005@gmail.com) · [💼 LinkedIn](https://www.linkedin.com/in/kirthika-rajendran-0303383b4) · [🐛 Report Bug](https://github.com/kiru-builds/invoice-iq/issues)

</div>

---

## 🎯 What is InvoiceIQ?

*InvoiceIQ* is a full-stack AI-powered invoice automation platform that helps businesses extract, organise, and analyse financial documents instantly. Upload any invoice or receipt — PDF or image — and get clean structured data with vendor details, amounts, GST breakdown, and category classification in seconds.

> 💡 *Built for*: Small businesses, accountants, CAs, freelancers, and finance teams who process multiple invoices daily.

---

## 🌐 Live Links

| | Link |
|--|------|
| 🌐 *Live App* | [invoice-iq-green.vercel.app](https://invoice-iq-green.vercel.app) |
| ⚙️ *Backend API* | [invoice-iq-ievx.onrender.com](https://invoice-iq-ievx.onrender.com) |
| 💻 *GitHub* | [github.com/kiru-builds/invoice-iq](https://github.com/kiru-builds/invoice-iq) |
| 💼 *LinkedIn* | [Kirthika Rajendran](https://www.linkedin.com/in/kirthika-rajendran-0303383b4) |

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
- Total GST liability at a glance

### 📊 Analytics Dashboard
- Monthly spending bar chart
- Vendor-wise donut chart breakdown
- Category breakdown with progress bars

### 📄 Monthly Report Generator
- Select any month and year
- Generate professional PDF report
- Includes: Total spend, GST summary, Category breakdown, Full invoice table

### 🤖 AI Chat Assistant
- Ask questions in plain English:
  - "How much did I spend on marketing?"
  - "Who is my top vendor?"
  - "What is my total GST?"

### 🔍 Search & Filters
- Search by vendor, invoice number, category
- Filter by category and month
- Sort by date, amount, vendor, confidence

### ✏️ Edit & Save
- Editable fields for every extracted invoice
- Correct AI mistakes instantly
- Saved to local storage permanently

### 📤 Export Options
- *Excel Export* (.xls) — formatted with totals and colors
- *CSV Export* — raw data for any tool
- *Email Report* — formatted HTML email via Resend
- *Google Sheets* — auto-sync every invoice

### 🧾 GST Report
- Monthly GST breakdown
- CGST / SGST estimation
- Total tax liability summary
- Perfect for Indian businesses and CAs

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Pure CSS-in-JS |
| AI Engine | Claude AI (claude-haiku-4-5-20251001) |
| Backend | Node.js (pure http module) |
| Email | Resend API |
| Storage | Browser localStorage |
| Frontend Hosting | Vercel (Free) |
| Backend Hosting | Render (Free) |

---

## 🚀 Setup

### Prerequisites
- Node.js v18+
- Anthropic API key ([Get one here](https://console.anthropic.com))
- Resend API key ([Get one here](https://resend.com))

### 1. Clone the repository

bash
git clone https://github.com/kiru-builds/invoice-iq.git
cd invoice-iq


### 2. Install dependencies

bash
npm install


### 3. Create .env file

env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
GMAIL_USER=your@gmail.com
GMAIL_PASS=your-16-char-app-password
RESEND_API_KEY=re_your-resend-key


### 4. Start the backend server

bash
node server.js


### 5. Start the frontend

bash
npm run dev


Open *http://localhost:5173*

---

## 📁 Project Structure


invoice-iq/
├── src/
│   ├── App.jsx          # Main React application
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

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → Import GitHub repo
2. Click *Deploy*
3. Live at https://invoice-iq-green.vercel.app ✅

### Backend → Render
1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Build Command: npm install
4. Start Command: node server.js
5. Add environment variables
6. Live at https://invoice-iq-ievx.onrender.com ✅

---

## 💰 Pricing Model

| Plan | Price | Features |
|------|-------|---------|
| *Basic* | ₹5,000/month | 50 invoices, CSV export |
| *Pro* | ₹15,000/month | Unlimited + Excel + Email + Sheets |
| *Enterprise* | ₹30,000+/month | Custom features, Priority support |

---

## 👩‍💻 Author

<div align="center">

### Kirthika Rajendran

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kirthika-rajendran-0303383b4)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github)](https://github.com/kiru-builds)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail)](mailto:kirthikarajendran2005@gmail.com)

"From idea to deployed AI SaaS — built with React, Node.js and Claude AI"

</div>

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

*⭐ Star this repo if InvoiceIQ helped you!*

Made with ❤️ by [Kirthika Rajendran](https://www.linkedin.com/in/kirthika-rajendran-0303383b4)

</div>

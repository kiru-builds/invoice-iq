const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      process.env[k] = v;
    }
  });
}

const API_KEY = process.env.VITE_ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

console.log("================================");
console.log("  InvoiceIQ Server v3.0");
console.log("================================");
console.log("API Key:  ", API_KEY ? "YES ✅" : "NO ❌");
console.log("Gmail:    ", GMAIL_USER ? "YES ✅ (" + GMAIL_USER + ")" : "NO ❌ (add to .env)");
console.log("================================\n");

// ── CORS helper ───────────────────────────────────────────────────────────────
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Read full request body ─────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

// ── Anthropic API call ────────────────────────────────────────────────────────
function callAnthropic(body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      timeout: 60000,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        "anthropic-version": "2023-06-01",
        "x-api-key": API_KEY,
      },
    };
    const req = https.request(options, (apiRes) => {
      let data = "";
      apiRes.on("data", c => { data += c; });
      apiRes.on("end", () => resolve({ status: apiRes.statusCode, body: data }));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Google Sheets proxy ───────────────────────────────────────────────────────
function callSheets(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const urlObj = new URL(webhookUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (r) => {
      let data = "";
      r.on("data", c => { data += c; });
      r.on("end", () => resolve({ status: r.statusCode, body: data }));
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Sheets request timed out")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Gmail SMTP over TLS (no npm needed) ──────────────────────────────────────
function sendGmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    if (!GMAIL_USER || !GMAIL_PASS) {
      return reject(new Error("GMAIL_USER or GMAIL_PASS missing in .env file"));
    }

    const tls = require("tls");
    let step = 0;
    let buf = "";

    const sock = tls.connect({ host: "smtp.gmail.com", port: 465 });
    sock.setTimeout(20000);

    const w = (s) => {
      console.log("  SMTP →", s.split("\r\n")[0]);
      sock.write(s + "\r\n");
    };

    const u64 = s => Buffer.from(s).toString("base64");

    // Build email body
    const msg = [
      "From: InvoiceIQ <" + GMAIL_USER + ">",
      "To: " + to,
      "Subject: " + subject,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      html
    ].join("\r\n");

    sock.on("data", (data) => {
      buf += data.toString();
      const lines = buf.split("\r\n");
      buf = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        console.log("  SMTP ←", line);
        const code = parseInt(line.slice(0, 3));
        const last = !line[3] || line[3] === " "; // last line of multi-line response

        if (!last) continue; // wait for complete response

        if      (step === 0 && code === 220) { w("EHLO smtp.gmail.com"); step = 1; }
        else if (step === 1 && code === 250) { w("AUTH LOGIN"); step = 2; }
        else if (step === 2 && code === 334) { w(u64(GMAIL_USER)); step = 3; }
        else if (step === 3 && code === 334) { w(u64(GMAIL_PASS)); step = 4; }
        else if (step === 4 && code === 235) { w("MAIL FROM:<" + GMAIL_USER + ">"); step = 5; }
        else if (step === 5 && code === 250) { w("RCPT TO:<" + to + ">"); step = 6; }
        else if (step === 6 && code === 250) { w("DATA"); step = 7; }
        else if (step === 7 && code === 354) { w(msg + "\r\n."); step = 8; }
        else if (step === 8 && code === 250) { w("QUIT"); sock.end(); resolve("Email sent to " + to); }
        else if (code >= 400) {
          sock.end();
          reject(new Error("SMTP Error " + code + ": " + line));
        }
      }
    });

    sock.on("timeout", () => { sock.end(); reject(new Error("SMTP timeout — check your app password")); });
    sock.on("error", (e) => reject(new Error("SMTP connection error: " + e.message)));
  });
}

// ── Build HTML email ──────────────────────────────────────────────────────────
function buildEmailHTML(invoices) {
  const total = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const tax   = invoices.reduce((s, i) => s + (parseFloat(i.tax)    || 0), 0);
  const fmt   = n => "₹" + Number(n).toLocaleString("en-IN");

  const rows = invoices.map((inv, i) => `
    <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"}">
      <td style="padding:10px 14px;font-weight:600;color:#0f172a">${inv.vendor || "—"}</td>
      <td style="padding:10px 14px;color:#64748b;font-family:monospace;font-size:12px">${inv.invoiceNumber || "—"}</td>
      <td style="padding:10px 14px;font-family:monospace;font-size:12px">${inv.date || "—"}</td>
      <td style="padding:10px 14px;font-weight:700;color:#16a34a">${fmt(inv.amount || 0)}</td>
      <td style="padding:10px 14px;color:#64748b">${fmt(inv.tax || 0)}</td>
      <td style="padding:10px 14px">
        <span style="background:#e0f2fe;color:#0284c7;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">
          ${inv.category || "Other"}
        </span>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif">
<div style="max-width:680px;margin:0 auto">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:16px 16px 0 0;padding:28px 32px">
    <div style="font-size:26px;font-weight:900;color:#00D4FF;letter-spacing:-1px">InvoiceIQ</div>
    <div style="color:#94A3B8;font-size:13px;margin-top:4px">Intelligent Invoice Automation — Report</div>
  </div>

  <!-- Stats -->
  <div style="background:#fff;padding:24px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <p style="color:#374151;margin:0 0 20px;font-size:13px">
      Invoice report generated on <strong>${new Date().toLocaleString("en-IN")}</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td width="33%" style="padding:0 6px 0 0">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#0284c7">${invoices.length}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">Invoices</div>
          </div>
        </td>
        <td width="33%" style="padding:0 3px">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#16a34a">${fmt(total)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">Total Spend</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 6px">
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:24px;font-weight:800;color:#d97706">${fmt(tax)}</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">Total GST</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <thead>
        <tr style="background:#0F172A">
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">Vendor</th>
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">Invoice No</th>
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">Date</th>
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">Amount</th>
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">GST</th>
          <th style="padding:11px 14px;text-align:left;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:0.8px">Category</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#DBEAFE">
          <td colspan="3" style="padding:12px 14px;font-weight:700;text-align:right;color:#1e40af">TOTALS</td>
          <td style="padding:12px 14px;font-weight:800;color:#16a34a">${fmt(total)}</td>
          <td style="padding:12px 14px;font-weight:700;color:#d97706">${fmt(tax)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Footer -->
  <div style="background:#0F172A;border-radius:0 0 16px 16px;padding:16px 32px;text-align:center">
    <p style="color:#475569;font-size:11px;margin:0">
      Generated by <strong style="color:#00D4FF">InvoiceIQ</strong> · Intelligent Invoice Automation for Modern Businesses
    </p>
  </div>

</div>
</body></html>`;
}

// ── HTTP SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  setCORS(res);

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, apiKey: !!API_KEY, gmail: !!GMAIL_USER }));
    return;
  }

  // ── /api/extract ───────────────────────────────────────────────────────────
  if (req.method === "POST" && req.url === "/api/extract") {
    const body = await readBody(req);
    if (!API_KEY) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "No API key in .env" } }));
      return;
    }
    console.log("📥 Extract:", (body.length / 1024).toFixed(1), "KB");
    try {
      const result = await callAnthropic(body);
      console.log(result.status === 200 ? "✅ Success!" : "❌ Status: " + result.status);
      if (result.status !== 200) console.log("Body:", result.body.slice(0, 200));
      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(result.body);
    } catch (err) {
      console.error("❌ Anthropic error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: err.message } }));
    }
    return;
  }

  // ── /api/email ─────────────────────────────────────────────────────────────
  if (req.method === "POST" && req.url === "/api/email") {
    const body = await readBody(req);
    try {
      const { to, invoices } = JSON.parse(body);
      if (!to)                  throw new Error("No email address provided");
      if (!invoices?.length)    throw new Error("No invoices to send");
      if (!GMAIL_USER)          throw new Error("GMAIL_USER not set in .env");
      if (!GMAIL_PASS)          throw new Error("GMAIL_PASS not set in .env");

      console.log("📧 Sending email to:", to, "| Invoices:", invoices.length);

      const total = invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
      const fmt   = n => "₹" + Number(n).toLocaleString("en-IN");
      const subject = `InvoiceIQ Report — ${invoices.length} Invoices · ${fmt(total)}`;
      const html    = buildEmailHTML(invoices);

      await sendGmail(to, subject, html);
      console.log("✅ Email sent to:", to);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Email sent to " + to }));
    } catch (err) {
      console.error("❌ Email error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // ── /api/sheets ────────────────────────────────────────────────────────────
  if (req.method === "POST" && req.url === "/api/sheets") {
    const body = await readBody(req);
    try {
      const { webhookUrl, invoice } = JSON.parse(body);
      if (!webhookUrl) throw new Error("No webhook URL provided");

      console.log("📊 Sheets sync:", invoice?.vendor || "Unknown");

      const result = await callSheets(webhookUrl, invoice);
      console.log("✅ Sheets response:", result.status);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, status: result.status }));
    } catch (err) {
      console.error("❌ Sheets error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log("🚀 Server ready at http://localhost:" + PORT);
  console.log("📤 Extract: POST /api/extract");
  console.log("📧 Email:   POST /api/email");
  console.log("📊 Sheets:  POST /api/sheets");
  console.log("\nWaiting for requests...\n");
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error("❌ Port " + PORT + " busy! Run: npx kill-port 3001");
  } else {
    console.error("Server error:", err.message);
  }
});
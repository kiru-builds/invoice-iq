import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#070B10",surface:"#0C1118",card:"#111920",border:"#1A2535",
  accent:"#00C6FF",purple:"#7B5FFF",green:"#00E5A0",amber:"#FFB547",
  red:"#FF4D6A",text:"#E2EAF5",muted:"#4A5A70",
  mono:"JetBrains Mono,monospace",sans:"Syne,sans-serif",
};
const COLORS=["#00C6FF","#00E5A0","#FFB547","#FF4D6A","#7B5FFF","#EC4899","#F97316","#14B8A6","#A78BFA"];
const CATS=["Software","Marketing","Operations","Travel","Food","Office","Legal","GST","Other"];
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const G=`
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
,::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:${C.bg};color:${C.text};font-family:${C.sans}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
input,textarea,select{font-family:${C.sans}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-in{animation:fadeUp 0.3s ease both}
`;

// ── HELPERS ──────────────────────────────────────────────────────────────────
const toBase64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
const fmtINR=n=>n==null||isNaN(n)?"—":"₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:0});
const fmtKB=b=>b<1024?b+"B":b<1048576?(b/1024).toFixed(0)+"KB":(b/1048576).toFixed(1)+"MB";
const genId=()=>Math.random().toString(36).slice(2);
const parseJSON=raw=>{const s=raw.replace(/json|/gi,"").trim();const a=s.indexOf("{"),b=s.lastIndexOf("}");return JSON.parse(a>=0&&b>=0?s.slice(a,b+1):s);};
const isDuplicate=(inv,existing)=>existing.some(e=>e.invoiceNumber&&inv.invoiceNumber&&e.invoiceNumber.trim().toLowerCase()===inv.invoiceNumber.trim().toLowerCase()&&e.vendor&&inv.vendor&&e.vendor.trim().toLowerCase()===inv.vendor.trim().toLowerCase());

// ── EXPORT HELPERS ────────────────────────────────────────────────────────────
function exportExcel(invoices){
  const total=invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const tax=invoices.reduce((s,i)=>s+(parseFloat(i.tax)||0),0);
  const rows=invoices.map((r,i)=>`<tr style="background:${i%2===0?"#f8fafc":"#fff"}"><td>${i+1}</td><td><b>${r.vendor||"—"}</b></td><td>${r.invoiceNumber||"—"}</td><td>${r.date||"—"}</td><td>${r.category||"—"}</td><td style="color:#16a34a;font-weight:700">₹${Number(r.amount||0).toLocaleString("en-IN")}</td><td>₹${Number(r.tax||0).toLocaleString("en-IN")}</td><td>${r.paymentTerms||"—"}</td><td>${r.confidence||0}%</td></tr>`).join("");
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>body{font-family:Calibri,Arial;font-size:11pt}table{border-collapse:collapse;width:100%}th{background:#0F172A;color:#fff;padding:9px 12px;text-align:left}td{padding:8px 12px;border:1px solid #e2e8f0}.tot{background:#DBEAFE;font-weight:bold}</style></head><body><h2>📊 InvoiceIQ Report</h2><p>Generated: ${new Date().toLocaleString()} | Records: ${invoices.length}</p><table><thead><tr><th>#</th><th>Vendor</th><th>Invoice No</th><th>Date</th><th>Category</th><th>Amount</th><th>Tax/GST</th><th>Payment Terms</th><th>Confidence</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="5" style="text-align:right">TOTALS</td><td>₹${total.toLocaleString("en-IN")}</td><td>₹${tax.toLocaleString("en-IN")}</td><td colspan="2"></td></tr></tbody></table></body></html>`;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([html],{type:"application/vnd.ms-excel;charset=utf-8"}));
  a.download=`InvoiceIQ_${new Date().toISOString().slice(0,10)}.xls`;
  a.click();
}
function exportCSV(invoices){
  const h=["#","Vendor","Invoice No","Date","Category","Amount","Tax","Currency","Payment Terms","Confidence"];
  const rows=invoices.map((r,i)=>[i+1,r.vendor||"",r.invoiceNumber||"",r.date||"",r.category||"",r.amount||"",r.tax||"",r.currency||"INR",r.paymentTerms||"",(r.confidence||0)+"%"]);
  const csv=[h,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`InvoiceIQ_${new Date().toISOString().slice(0,10)}.csv`;a.click();
}

// ── API ───────────────────────────────────────────────────────────────────────
async function extractInvoice(file){
  const base64=await toBase64(file);
  const isPDF=file.type==="application/pdf";
  const content=isPDF
    ?[{type:"document",source:{type:"base64",media_type:"application/pdf",data:base64}},{type:"text",text:`Extract invoice data. Return ONLY JSON: {"vendor":"string","invoiceNumber":"string","date":"DD MMM YYYY","amount":number,"tax":number,"currency":"INR","category":"Software|Marketing|Operations|Travel|Food|Office|Legal|GST|Other","lineItems":[{"description":"string","amount":number}],"paymentTerms":"string","confidence":0-100}`}]
    :[{type:"image",source:{type:"base64",media_type:file.type,data:base64}},{type:"text",text:`Extract invoice data. Return ONLY JSON: {"vendor":"string","invoiceNumber":"string","date":"DD MMM YYYY","amount":number,"tax":number,"currency":"INR","category":"Software|Marketing|Operations|Travel|Food|Office|Legal|GST|Other","lineItems":[{"description":"string","amount":number}],"paymentTerms":"string","confidence":0-100}`}];
  const res=await fetch("https://invoice-iq-ievx.onrender.com/api/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:1500,messages:[{role:"user",content}]})});
  const raw=await res.text();
  if(!res.ok) throw new Error("Server "+res.status+": "+raw.slice(0,100));
  const data=JSON.parse(raw);
  if(data.error) throw new Error(data.error.message||JSON.stringify(data.error));
  return parseJSON(data.content?.map(c=>c.text||"").join("")||"");
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function useToast(){
  const [toasts,setToasts]=useState([]);
  const add=useCallback((msg,type="success")=>{
    const id=genId();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4000);
  },[]);
  return{toasts,add};
}

// ── CHARTS ────────────────────────────────────────────────────────────────────
function BarChart({data,color="#00C6FF"}){
  const max=Math.max(...data.map(d=>d.v),1);
  return(
    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,padding:"0 4px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <div title={fmtINR(d.v)} style={{width:"100%",background:`linear-gradient(180deg,${color},${color}44)`,borderRadius:"3px 3px 0 0",height:Math.max((d.v/max)*100,3)+"%",minHeight:3,transition:"height 0.8s cubic-bezier(.34,1.56,.64,1)"}}/>
          <span style={{fontSize:9,color:C.muted,fontFamily:C.mono}}>{d.k}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({data}){
  if(!data.length) return <div style={{textAlign:"center",padding:30,color:C.muted,fontSize:12}}>No data yet</div>;
  const total=data.reduce((s,d)=>s+d.v,0);
  let angle=0;
  const slices=data.map((d,i)=>{
    const pct=d.v/total,start=angle;angle+=pct*360;
    const r=45,cx=60,cy=60,s1=(start-90)*Math.PI/180,e1=(angle-90)*Math.PI/180;
    const x1=cx+r*Math.cos(s1),y1=cy+r*Math.sin(s1),x2=cx+r*Math.cos(e1),y2=cy+r*Math.sin(e1);
    return{...d,path:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>.5?1:0},1 ${x2},${y2} Z`,color:COLORS[i%COLORS.length],pct:Math.round(pct*100)};
  });
  return(
    <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
      <svg viewBox="0 0 120 120" style={{width:110,height:110,flexShrink:0}}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity={0.9}/>)}
        <circle cx="60" cy="60" r="28" fill={C.card}/>
        <text x="60" y="56" textAnchor="middle" fill={C.text} fontSize="10" fontFamily="Syne" fontWeight="800">{data.length}</text>
        <text x="60" y="68" textAnchor="middle" fill={C.muted} fontSize="7" fontFamily="JetBrains Mono">vendors</text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
        {slices.slice(0,6).map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0}}/>
            <span style={{flex:1,fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.k}</span>
            <span style={{fontFamily:C.mono,fontSize:11,fontWeight:700}}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}// ── SMART INSIGHTS ────────────────────────────────────────────────────────────
function SmartInsights({invoices}){
  if(!invoices.length) return null;
  const now=new Date();
  const thisMonth=invoices.filter(i=>{const d=new Date(i.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const lastMonth=invoices.filter(i=>{const d=new Date(i.date);const lm=new Date(now.getFullYear(),now.getMonth()-1);return d.getMonth()===lm.getMonth()&&d.getFullYear()===lm.getFullYear();});
  const thisTotal=thisMonth.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const lastTotal=lastMonth.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const spendChange=lastTotal>0?Math.round(((thisTotal-lastTotal)/lastTotal)*100):0;

  const vendorMap={};
  invoices.forEach(i=>{const v=i.vendor||"Unknown";vendorMap[v]=(vendorMap[v]||0)+(parseFloat(i.amount)||0);});
  const topVendor=Object.entries(vendorMap).sort((a,b)=>b[1]-a[1])[0];

  const catMap={};
  invoices.forEach(i=>{const c=i.category||"Other";catMap[c]=(catMap[c]||0)+(parseFloat(i.amount)||0);});
  const topCat=Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  const avgInvoice=invoices.length?Math.round(invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0)/invoices.length):0;
  const highConf=invoices.filter(i=>(i.confidence||0)>=90).length;

  const insights=[
    topVendor&&{icon:"🏆",color:C.amber,title:"Top Vendor",value:topVendor[0],sub:fmtINR(topVendor[1])+" total spend"},
    topCat&&{icon:"📊",color:C.purple,title:"Highest Category",value:topCat[0],sub:fmtINR(topCat[1])+" this period"},
    lastTotal>0&&{icon:spendChange>=0?"📈":"📉",color:spendChange>=0?C.red:C.green,title:"Month vs Last",value:(spendChange>=0?"+":"")+spendChange+"%",sub:spendChange>=0?"Spending increased":"Spending decreased"},
    {icon:"💡",color:C.accent,title:"Avg Invoice Value",value:fmtINR(avgInvoice),sub:"across "+invoices.length+" invoices"},
    highConf>0&&{icon:"🎯",color:C.green,title:"High Confidence",value:highConf+" invoices",sub:"extracted at 90%+ accuracy"},
    {icon:"🧾",color:C.amber,title:"Total GST Liability",value:fmtINR(invoices.reduce((s,i)=>s+(parseFloat(i.tax)||0),0)),sub:"across all invoices"},
  ].filter(Boolean);

  return(
    <div style={{marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>🔥 Smart Insights</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {insights.map((ins,i)=>(
          <div key={i} className="fade-in" style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:16,borderLeft:"3px solid "+ins.color}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{ins.icon}</span>
              <span style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,fontWeight:700}}>{ins.title}</span>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:ins.color,marginBottom:3}}>{ins.value}</div>
            <div style={{fontSize:10,color:C.muted,fontFamily:C.mono}}>{ins.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MONTHLY REPORT ────────────────────────────────────────────────────────────
function MonthlyReport({invoices,toast,S,C}){
  const [month,setMonth]=useState(new Date().getMonth());
  const [year,setYear]=useState(new Date().getFullYear());
  const [generating,setGenerating]=useState(false);

  const filtered=invoices.filter(i=>{
    const d=new Date(i.date);
    return d.getMonth()===month&&d.getFullYear()===year;
  });

  const total=filtered.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const tax=filtered.reduce((s,i)=>s+(parseFloat(i.tax)||0),0);
  const catMap={};
  filtered.forEach(i=>{const c=i.category||"Other";catMap[c]=(catMap[c]||0)+(parseFloat(i.amount)||0);});

  const generatePDF=async()=>{
    setGenerating(true);
    const catRows=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val])=><tr><td style="padding:8px 14px;color:#374151">${cat}</td><td style="padding:8px 14px;text-align:right;font-weight:700;color:#16a34a">₹${val.toLocaleString("en-IN")}</td><td style="padding:8px 14px;text-align:right;color:#64748b">${Math.round(val/total*100)}%</td></tr>).join("");
    const invRows=filtered.map((r,i)=>`<tr style="background:${i%2===0?"#f8fafc":"#fff"}"><td style="padding:8px 12px;font-weight:600">${r.vendor||"—"}</td><td style="padding:8px 12px;font-family:monospace;font-size:11px">${r.invoiceNumber||"—"}</td><td style="padding:8px 12px;font-family:monospace;font-size:11px">${r.date||"—"}</td><td style="padding:8px 12px;color:#16a34a;font-weight:700">₹${Number(r.amount||0).toLocaleString("en-IN")}</td><td style="padding:8px 12px;color:#64748b">₹${Number(r.tax||0).toLocaleString("en-IN")}</td><td style="padding:8px 12px"><span style="background:#e0f2fe;color:#0284c7;padding:2px 6px;border-radius:10px;font-size:10px">${r.category||"Other"}</span></td></tr>`).join("");

    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>InvoiceIQ Monthly Report</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;margin:0;padding:40px;background:#fff}
    h1{color:#00C6FF;font-size:28px;margin:0}h2{color:#0f172a;font-size:16px;margin:20px 0 10px}
    table{width:100%;border-collapse:collapse}th{background:#0F172A;color:#fff;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.8px}
    td{border-bottom:1px solid #e2e8f0}.stat{display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 24px;margin:0 10px 10px 0;text-align:center}
    .stat-val{font-size:24px;font-weight:800;color:#0284c7}.stat-label{font-size:11px;color:#64748b;margin-top:4px}
    @media print{body{padding:20px}}</style></head>
    <body>
    <div style="background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;padding:28px;border-radius:12px;margin-bottom:24px">
      <h1>InvoiceIQ</h1>
      <div style="color:#94A3B8;font-size:13px">Monthly Report — ${MONTHS[month]} ${year}</div>
      <div style="color:#64748b;font-size:11px;margin-top:4px">Generated: ${new Date().toLocaleString()}</div>
    </div>
    <div style="margin-bottom:20px">
      <div class="stat"><div class="stat-val">${filtered.length}</div><div class="stat-label">INVOICES</div></div>
      <div class="stat"><div class="stat-val" style="color:#16a34a">₹${total.toLocaleString("en-IN")}</div><div class="stat-label">TOTAL SPEND</div></div>
      <div class="stat"><div class="stat-val" style="color:#d97706">₹${tax.toLocaleString("en-IN")}</div><div class="stat-label">TOTAL GST</div></div>
    </div>
    <h2>Category Breakdown</h2>
    <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${catRows||"<tr><td colspan='3' style='padding:12px;color:#64748b;text-align:center'>No data</td></tr>"}</tbody></table>
    <h2 style="margin-top:24px">Invoice Details</h2>
    <table><thead><tr><th>Vendor</th><th>Invoice No</th><th>Date</th><th>Amount</th><th>GST</th><th>Category</th></tr></thead>
    <tbody>${invRows||"<tr><td colspan='6' style='padding:12px;color:#64748b;text-align:center'>No invoices this month</td></tr>"}</tbody></table>
    <div style="margin-top:30px;padding-top:16px;border-top:1px solid #e2e8f0;color:#94A3B8;font-size:11px;text-align:center">
      Generated by InvoiceIQ · Intelligent Invoice Automation for Modern Businesses
    </div>
    </body></html>`;

    const blob=new Blob([html],{type:"text/html"});
    const url=URL.createObjectURL(blob);
    const win=window.open(url,"_blank");
    setTimeout(()=>{win?.print();},800);
    setGenerating(false);
    toast("✅ Report opened — use Print → Save as PDF","success");
  };

  return(
    <div style={S.card}>
      <div style={S.cardH}>
        <span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>📄 Monthly Report Generator</span>
        <span style={{fontSize:10,fontFamily:C.mono,color:C.green,background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.2)",padding:"2px 8px",borderRadius:20}}>PDF</span>
      </div>
      <div style={S.cardB}>
        <div style={{display:"flex",gap:12,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>Month</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{...S.input,width:120}}>
              {MONTHS.map((m,i)=><option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:10,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>Year</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{...S.input,width:100}}>
              {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{paddingTop:18}}>
            <button style={{...S.btn(generating?"#333":C.accent,generating?"#888":"#000"),minWidth:180,justifyContent:"center"}} onClick={generatePDF} disabled={generating}>
              {generating?"⏳ Generating...":"📄 Generate PDF Report"}
            </button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[[filtered.length,"Invoices",C.accent],[fmtINR(total),"Total Spend",C.green],[fmtINR(tax),"Total GST",C.amber]].map(([v,l,c])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.03)",border:"1px solid "+C.border,borderRadius:10,padding:14,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:4,textTransform:"uppercase",letterSpacing:0.5,fontFamily:C.mono}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}// ── AI CHAT ───────────────────────────────────────────────────────────────────
function AIChat({invoices,onClose}){
  const [msgs,setMsgs]=useState([{role:"ai",text:"Hi! 👋 Ask me anything about your invoices. Try:\n• 'How much did I spend on marketing?'\n• 'Who is my top vendor?'\n• 'What is my total GST?'\n• 'Show spending by category'"}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  const send=async()=>{
    if(!input.trim()||loading) return;
    const q=input.trim();
    setInput("");
    setMsgs(p=>[...p,{role:"user",text:q}]);
    setLoading(true);
    try{
      const ctx=`You are InvoiceIQ AI assistant. Answer questions about invoices concisely and helpfully.
Invoice data: ${JSON.stringify(invoices.map(i=>({vendor:i.vendor,date:i.date,amount:i.amount,tax:i.tax,category:i.category,invoiceNumber:i.invoiceNumber})))}
Stats: ${invoices.length} invoices, Total: ₹${invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0).toLocaleString("en-IN")}, GST: ₹${invoices.reduce((s,i)=>s+(parseFloat(i.tax)||0),0).toLocaleString("en-IN")}
Answer in 2-3 sentences max. Use ₹ for currency. Be specific with numbers.`;
      const res=await fetch("https://invoice-iq-ievx.onrender.com/api/extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:300,messages:[{role:"user",content:ctx+"\n\nQuestion: "+q}]})});
      const raw=await res.json();
      const text=raw.content?.map(c=>c.text||"").join("")||"Sorry, I couldn't answer that.";
      setMsgs(p=>[...p,{role:"ai",text}]);
    }catch(e){
      setMsgs(p=>[...p,{role:"ai",text:"❌ Error: "+e.message}]);
    }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",bottom:20,right:20,width:360,height:480,background:C.card,border:"1px solid "+C.border,borderRadius:16,zIndex:200,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",background:"linear-gradient(135deg,rgba(0,198,255,0.1),rgba(123,95,255,0.1))"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>🤖</span>
          <div>
            <div style={{fontWeight:700,fontSize:13}}>AI Assistant</div>
            <div style={{fontSize:10,color:C.muted,fontFamily:C.mono}}>Ask about your invoices</div>
          </div>
        </div>
        <button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}} onClick={onClose}>×</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{background:m.role==="user"?C.accent:"rgba(255,255,255,0.06)",color:m.role==="user"?"#000":C.text,borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px",maxWidth:"82%",fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",gap:4,padding:"10px 14px"}}>
          {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"pulse 1s ease infinite",animationDelay:i*0.2+"s"}}/>)}
        </div>}
        <div ref={bottomRef}/>
      </div>
      <div style={{padding:10,borderTop:"1px solid "+C.border,display:"flex",gap:8}}>
        <input
          style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:8,padding:"9px 12px",color:C.text,fontFamily:C.mono,fontSize:12,outline:"none"}}
          placeholder="Ask anything..."
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          onFocus={e=>e.target.style.borderColor=C.accent}
          onBlur={e=>e.target.style.borderColor=C.border}
        />
        <button style={{background:C.accent,border:"none",borderRadius:8,padding:"9px 14px",color:"#000",fontWeight:700,cursor:"pointer",fontSize:13}} onClick={send}>→</button>
      </div>
    </div>
  );
}// ── GOOGLE SHEETS ─────────────────────────────────────────────────────────────
function GoogleSheetsSection({invoices,toast,S,C}){
  const [webhookUrl,setWebhookUrl]=useState(()=>localStorage.getItem("iq_webhook")||"");
  const [testing,setTesting]=useState(false);
  const [syncing,setSyncing]=useState(false);
  const [connected,setConnected]=useState(!!localStorage.getItem("iq_webhook"));

  const saveWebhook=url=>{setWebhookUrl(url);localStorage.setItem("iq_webhook",url);};

  const sendToSheets=async invoice=>{
    const res=await fetch("https://invoice-iq-ievx.onrender.com/api/sheets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({webhookUrl,invoice})});
    const data=await res.json();
    if(!data.ok) throw new Error(data.error||"Failed");
  };

  const testWebhook=async()=>{
    if(!webhookUrl.trim()) return toast("Paste webhook URL first!","error");
    setTesting(true);
    try{
      await sendToSheets({vendor:"InvoiceIQ Test",invoiceNumber:"TEST-001",date:new Date().toLocaleDateString("en-IN"),amount:1000,tax:180,currency:"INR",category:"Software",confidence:99,fileName:"test.pdf"});
      setConnected(true);
      toast("✅ Connected! Check your Google Sheet.","success");
    }catch(e){toast("❌ "+e.message,"error");}
    setTesting(false);
  };

  const syncAll=async()=>{
    if(!webhookUrl) return toast("Connect Google Sheets first!","error");
    if(!invoices.length) return toast("No invoices to sync!","error");
    setSyncing(true);
    let ok=0;
    for(const inv of invoices){
      try{await sendToSheets(inv);ok++;await new Promise(r=>setTimeout(r,400));}catch(e){}
    }
    setSyncing(false);
    toast(`✅ Synced ${ok}/${invoices.length} invoices!`,`success`);
  };

  return(
    <div style={S.card}>
      <div style={S.cardH}>
        <span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>🔗 Google Sheets</span>
        <span style={{fontSize:10,fontFamily:C.mono,color:connected?C.green:C.muted,background:connected?"rgba(0,229,160,0.1)":"rgba(255,255,255,0.05)",border:"1px solid "+(connected?"rgba(0,229,160,0.2)":C.border),padding:"2px 8px",borderRadius:20}}>
          {connected?"● Connected":"○ Not Connected"}
        </span>
      </div>
      <div style={S.cardB}>
        {["1. Open Google Sheets → Extensions → Apps Script","2. Paste webhook code → Save → Deploy → New Deployment","3. Type: Web App | Execute as: Me | Access: Anyone","4. Copy Web App URL → paste below → Test"].map((s,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:6}}>
            <span style={{width:18,height:18,borderRadius:"50%",background:"rgba(0,198,255,0.15)",color:C.accent,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</span>
            <span style={{fontSize:11,color:C.muted,fontFamily:C.mono,lineHeight:1.5}}>{s.slice(3)}</span>
          </div>
        ))}
        <div style={{display:"flex",gap:8,margin:"14px 0 12px"}}>
          <input style={{...S.input,flex:1}} placeholder="https://script.google.com/macros/s/.../exec" value={webhookUrl} onChange={e=>saveWebhook(e.target.value)}/>
          <button style={{...S.btn(testing?"#333":C.accent,testing?"#888":"#000"),minWidth:80,justifyContent:"center"}} onClick={testWebhook} disabled={testing}>{testing?"⏳":"🔗 Test"}</button>
        </div>
        {connected&&invoices.length>0&&<button style={{...S.btn(syncing?"#333":C.green,syncing?"#888":"#000"),width:"100%",justifyContent:"center"}} onClick={syncAll} disabled={syncing}>{syncing?"⏳ Syncing...":`📊 Sync All ${invoices.length} Invoices`}</button>}
      </div>
    </div>
  );
}

// ── EMAIL SECTION ─────────────────────────────────────────────────────────────
function EmailSection({invoices,toast,S,C}){
  const [email,setEmail]=useState("");
  const [sending,setSending]=useState(false);
  const send=async()=>{
    if(!email.trim()||!email.includes("@")) return toast("Enter valid email!","error");
    if(!invoices.length) return toast("No invoices to send!","error");
    setSending(true);
    try{
      const res=await fetch("https://invoice-iq-ievx.onrender.com/api/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:email.trim(),invoices})});
      const data=await res.json();
      if(data.ok){toast("✅ Email sent to "+email,"success");setEmail("");}
      else throw new Error(data.error||"Failed");
    }catch(e){toast("❌ "+e.message,"error");}
    setSending(false);
  };
  return(
    <div style={S.card}>
      <div style={S.cardH}>
        <span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>📧 Email Report</span>
        <span style={{fontSize:10,fontFamily:C.mono,color:C.green,background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.2)",padding:"2px 8px",borderRadius:20}}>LIVE</span>
      </div>
      <div style={S.cardB}>
        <div style={{fontSize:11,color:C.muted,marginBottom:14,fontFamily:C.mono,lineHeight:1.6}}>Send formatted HTML invoice report to any email. Includes totals, GST & full table.</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input style={{...S.input,flex:1}} placeholder="recipient@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
          <button style={{...S.btn(sending?"#333":C.accent,sending?"#888":"#000"),minWidth:130,justifyContent:"center"}} onClick={send} disabled={sending}>{sending?"⏳ Sending...":"📧 Send Report"}</button>
        </div>
        <div style={{background:"rgba(255,181,71,0.08)",border:"1px solid rgba(255,181,71,0.2)",borderRadius:10,padding:"12px 14px",fontSize:11,color:C.muted,fontFamily:C.mono,lineHeight:1.8}}>
          ⚙️ Add to .env: <span style={{color:C.green}}>GMAIL_USER=you@gmail.com</span> and <span style={{color:C.green}}>GMAIL_PASS=your-app-password</span><br/>
          Get App Password: Google Account → Security → 2-Step → App Passwords
        </div>
      </div>
    </div>
  );
}// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("upload");
  const [queue,setQueue]=useState([]);
  const [invoices,setInvoices]=useState(()=>{try{return JSON.parse(localStorage.getItem("iq_invoices")||"[]")}catch{return[]}});
  const [processing,setProcessing]=useState(false);
  const [drag,setDrag]=useState(false);
  const [editId,setEditId]=useState(null);
  const [editData,setEditData]=useState({});
  const [chatOpen,setChatOpen]=useState(false);
  const [preview,setPreview]=useState(null);
  const [search,setSearch]=useState("");
  const [filterCat,setFilterCat]=useState("All");
  const [filterMonth,setFilterMonth]=useState("All");
  const [sortBy,setSortBy]=useState("date");
  const fileRef=useRef();
  const {toasts,add:toast}=useToast();

  useEffect(()=>{try{localStorage.setItem("iq_invoices",JSON.stringify(invoices))}catch{}},[invoices]);

  const done=queue.filter(f=>f.status==="done").length;
  const progress=queue.length?Math.round((done/queue.length)*100):0;
  const totalAmt=invoices.reduce((s,i)=>s+(parseFloat(i.amount)||0),0);
  const totalTax=invoices.reduce((s,i)=>s+(parseFloat(i.tax)||0),0);
  const avgConf=invoices.length?Math.round(invoices.reduce((s,i)=>s+(i.confidence||0),0)/invoices.length):0;

  // Filtered + searched invoices
  const filtered=invoices.filter(inv=>{
    const q=search.toLowerCase();
    const matchSearch=!q||(inv.vendor||"").toLowerCase().includes(q)||(inv.invoiceNumber||"").toLowerCase().includes(q)||(inv.category||"").toLowerCase().includes(q);
    const matchCat=filterCat==="All"||(inv.category||"Other")===filterCat;
    const matchMonth=filterMonth==="All"||MONTHS[new Date(inv.date).getMonth()]===filterMonth;
    return matchSearch&&matchCat&&matchMonth;
  }).sort((a,b)=>{
    if(sortBy==="amount") return (parseFloat(b.amount)||0)-(parseFloat(a.amount)||0);
    if(sortBy==="vendor") return (a.vendor||"").localeCompare(b.vendor||"");
    if(sortBy==="confidence") return (b.confidence||0)-(a.confidence||0);
    return new Date(b.date||0)-new Date(a.date||0);
  });

  const vendorMap={};
  invoices.forEach(i=>{const v=i.vendor||"Unknown";vendorMap[v]=(vendorMap[v]||0)+(parseFloat(i.amount)||0);});
  const vendorData=Object.entries(vendorMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({k,v}));
  const monthMap={};
  invoices.forEach(i=>{if(!i.date) return;const d=new Date(i.date);if(isNaN(d)) return;const k=MONTHS[d.getMonth()];monthMap[k]=(monthMap[k]||0)+(parseFloat(i.amount)||0);});
  const monthData=MONTHS.map(k=>({k,v:monthMap[k]||0})).filter(d=>d.v>0);
  const catMap={};
  invoices.forEach(i=>{const c=i.category||"Other";catMap[c]=(catMap[c]||0)+(parseFloat(i.amount)||0);});
  const catTotal=Object.values(catMap).reduce((a,b)=>a+b,0);
  const gstByMonth={};
  invoices.forEach(i=>{if(!i.date||!i.tax) return;const d=new Date(i.date);if(isNaN(d)) return;const k=MONTHS[d.getMonth()]+" "+d.getFullYear();gstByMonth[k]=(gstByMonth[k]||0)+(parseFloat(i.tax)||0);});

  const addFiles=useCallback(picked=>{
    const ok=["application/pdf","image/jpeg","image/png","image/webp","image/gif"];
    const valid=Array.from(picked).filter(f=>ok.includes(f.type));
    if(!valid.length){toast("Unsupported format. Use PDF, JPG, PNG, WEBP.","error");return;}
    setQueue(p=>[...p,...valid.map(f=>({id:genId(),file:f,name:f.name,size:f.size,status:"pending",error:""}))]);
    toast(`${valid.length} file${valid.length>1?"s":""} added`,"info");
  },[toast]);

  const processAll=async()=>{
    const pending=queue.filter(f=>f.status==="pending");
    if(!pending.length){toast("No pending files!","error");return;}
    setProcessing(true);
    for(const item of pending){
      setQueue(p=>p.map(f=>f.id===item.id?{...f,status:"processing"}:f));
      try{
        const data=await extractInvoice(item.file);
        if(isDuplicate(data,invoices)){
          setQueue(p=>p.map(f=>f.id===item.id?{...f,status:"error",error:"⚠️ Duplicate invoice!"}:f));
          toast(`⚠️ Duplicate detected: ${item.name.slice(0,30)}`,"error");
          continue;
        }
        setInvoices(p=>[...p,{id:item.id,fileName:item.name,...data}]);
        setQueue(p=>p.map(f=>f.id===item.id?{...f,status:"done"}:f));
      }catch(err){
        setQueue(p=>p.map(f=>f.id===item.id?{...f,status:"error",error:err.message}:f));
        toast(`❌ ${item.name.slice(0,20)}: ${err.message.slice(0,50)}`,"error");
      }
    }
    setProcessing(false);
    toast(`✅ Done! ${pending.length} invoice${pending.length>1?"s":""} processed.`,`success`);
    setTab("results");
  };

  const saveEdit=()=>{setInvoices(p=>p.map(i=>i.id===editId?{...i,...editData}:i));setEditId(null);toast("✅ Saved!","success");};
  const deleteInvoice=id=>{setInvoices(p=>p.filter(i=>i.id!==id));toast("Deleted","error");};

  const S={
    shell:{display:"flex",minHeight:"100vh",background:C.bg},
    sidebar:{width:200,flexShrink:0,background:C.surface,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",overflow:"auto"},
    main:{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",overflow:"hidden"},
    page:{padding:28,flex:1,overflow:"auto"},
    card:{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden",marginBottom:16},
    cardH:{padding:"14px 18px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between"},
    cardB:{padding:18},
    btn:(bg,c="#000")=>({display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:C.sans,background:bg,color:c,transition:"all 0.15s",whiteSpace:"nowrap"}),
    input:{background:"rgba(255,255,255,0.04)",border:"1px solid "+C.border,borderRadius:8,padding:"8px 12px",color:C.text,fontFamily:C.mono,fontSize:12,outline:"none",width:"100%",transition:"border 0.15s"},
  };

  const navItems=[
    {id:"upload",icon:"⬆️",label:"Upload",badge:queue.filter(f=>f.status==="pending").length||null},
    {id:"insights",icon:"🔥",label:"Insights"},
    {id:"results",icon:"📋",label:"Results",badge:invoices.length||null},
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"gst",icon:"🧾",label:"GST Report"},
    {id:"history",icon:"🕐",label:"History",badge:invoices.length||null},
    {id:"automation",icon:"⚡",label:"Export"},
  ];

  return(
    <>
      <style>{G}</style>

      {/* TOASTS */}
      <div style={{position:"fixed",bottom:20,right:20,display:"flex",flexDirection:"column",gap:8,zIndex:999}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background:C.card,border:"1px solid "+(t.type==="success"?"rgba(0,229,160,0.3)":t.type==="error"?"rgba(255,77,106,0.3)":"rgba(0,198,255,0.3)"),borderRadius:10,padding:"12px 16px",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",minWidth:260,animation:"fadeUp 0.3s ease"}}>
            {t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"} {t.msg}
          </div>
        ))}
      </div>

      {/* AI CHAT */}
      {chatOpen&&<AIChat invoices={invoices} onClose={()=>setChatOpen(false)}/>}

      {/* PREVIEW MODAL */}
      {preview&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setPreview(null)}>
          <div style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:12,overflow:"hidden",border:"1px solid "+C.border}} onClick={e=>e.stopPropagation()}>
            <img src={preview} alt="preview" style={{maxWidth:"90vw",maxHeight:"85vh",objectFit:"contain"}}/>
            <div style={{textAlign:"center",padding:8,background:C.card}}>
              <button style={S.btn(C.red,"#fff")} onClick={()=>setPreview(null)}>✕ Close</button>
            </div>
          </div>
        </div>
      )}{/* EDIT MODAL */}
      {editId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}} onClick={()=>setEditId(null)}>
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:16,width:"90%",maxWidth:500,maxHeight:"85vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"18px 22px",borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:15}}>✏️ Edit Invoice</span>
              <button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:20}} onClick={()=>setEditId(null)}>×</button>
            </div>
            <div style={{padding:22,display:"flex",flexDirection:"column",gap:12}}>
              {[["vendor","Vendor"],["invoiceNumber","Invoice No"],["date","Date"],["amount","Amount"],["tax","Tax/GST"],["category","Category"],["paymentTerms","Payment Terms"]].map(([k,l])=>(
                <div key={k}>
                  <label style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.muted,display:"block",marginBottom:4}}>{l}</label>
                  {k==="category"?(
                    <select value={editData[k]||""} onChange={e=>setEditData(p=>({...p,[k]:e.target.value}))} style={{...S.input,appearance:"none"}}>
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ):(
                    <input style={S.input} value={editData[k]||""} onChange={e=>setEditData(p=>({...p,[k]:e.target.value}))} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid "+C.border,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button style={S.btn(C.border,C.text)} onClick={()=>setEditId(null)}>Cancel</button>
              <button style={S.btn(C.accent)} onClick={saveEdit}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={S.shell}>
        {/* SIDEBAR */}
        <aside style={S.sidebar}>
          <div style={{padding:"20px 16px",borderBottom:"1px solid "+C.border}}>
            <div style={{width:34,height:34,background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:10,boxShadow:"0 0 20px rgba(0,198,255,0.3)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{fontSize:16,fontWeight:800,background:"linear-gradient(90deg,"+C.text+","+C.accent+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>InvoiceIQ</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:"1.5px",marginTop:2}}>INTELLIGENT AUTOMATION</div>
          </div>
          <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:3}}>
            {navItems.map(n=>(
              <div key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600,color:tab===n.id?C.accent:C.muted,background:tab===n.id?"rgba(0,198,255,0.1)":"transparent",border:"1px solid "+(tab===n.id?"rgba(0,198,255,0.2)":"transparent"),transition:"all 0.15s",userSelect:"none"}}>
                <span style={{fontSize:15}}>{n.icon}</span>
                <span style={{flex:1}}>{n.label}</span>
                {n.badge?<span style={{background:C.accent,color:"#000",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,fontFamily:C.mono}}>{n.badge}</span>:null}
              </div>
            ))}
          </nav>
          <div style={{padding:14,borderTop:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,fontFamily:C.mono}}>Session</div>
            {[["Invoices",invoices.length,C.accent],["Total",fmtINR(totalAmt),C.green],["GST",fmtINR(totalTax),C.amber],["Accuracy",avgConf+"%",C.purple]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:11,color:C.muted}}>{l}</span>
                <span style={{fontSize:11,fontWeight:700,fontFamily:C.mono,color:c}}>{v}</span>
              </div>
            ))}
            <button onClick={()=>setChatOpen(p=>!p)} style={{...S.btn("linear-gradient(135deg,"+C.accent+","+C.purple+")"),width:"100%",justifyContent:"center",marginTop:10,padding:"9px"}}>
              🤖 AI Chat
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div style={S.main}>
          {/* TOPBAR */}
          <div style={{height:56,padding:"0 28px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(7,11,16,0.9)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:40}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{navItems.find(n=>n.id===tab)?.icon} {navItems.find(n=>n.id===tab)?.label}</div>
              <div style={{fontSize:10,color:C.muted,fontFamily:C.mono,marginTop:1}}>
                {tab==="upload"&&`${queue.length} queued · ${done} done`}
                {tab==="insights"&&`${invoices.length} invoices analysed`}
                {tab==="results"&&`${filtered.length} of ${invoices.length} shown`}
                {tab==="dashboard"&&`${Object.keys(vendorMap).length} vendors · ${fmtINR(totalAmt)}`}
                {tab==="gst"&&`Total GST: ${fmtINR(totalTax)}`}
                {tab==="history"&&`${invoices.length} saved`}
                {tab==="automation"&&"Export & Integrations"}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              {invoices.length>0&&<>
                <button style={S.btn(C.border,C.text)} onClick={()=>exportCSV(invoices)}>📄 CSV</button>
                <button style={S.btn(C.green)} onClick={()=>{exportExcel(invoices);toast("✅ Excel exported!","success");}}>📊 Excel</button>
              </>}
              {tab==="upload"&&queue.filter(f=>f.status==="pending").length>0&&
                <button style={S.btn(processing?"#333":C.accent,processing?"#888":"#000")} onClick={processAll} disabled={processing}>
                  {processing?`⏳ ${done}/${queue.length}...`: `⚡ Extract All (${queue.filter(f=>f.status==="pending").length})`}
                </button>
              }
            </div>
          </div>

          <div style={S.page}>

            {/* ── UPLOAD ── */}
            {tab==="upload"&&(
              <div>
                <div style={{background:"linear-gradient(135deg,rgba(0,198,255,0.06),rgba(123,95,255,0.08))",border:"1px solid rgba(0,198,255,0.15)",borderRadius:16,padding:"24px 28px",marginBottom:20,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,background:"radial-gradient(circle,rgba(123,95,255,0.15),transparent 70%)",pointerEvents:"none"}}/>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <span style={{fontSize:10,fontFamily:C.mono,background:"rgba(123,95,255,0.2)",border:"1px solid rgba(123,95,255,0.3)",color:"#A78BFA",padding:"3px 10px",borderRadius:20,letterSpacing:"1.5px",fontWeight:700}}>ENTERPRISE</span>
                    <span style={{fontSize:10,fontFamily:C.mono,background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.2)",color:C.green,padding:"3px 10px",borderRadius:20,fontWeight:700}}>AI-POWERED</span>
                  </div>
                  <h1 style={{fontSize:26,fontWeight:800,letterSpacing:"-0.8px",marginBottom:6,background:"linear-gradient(135deg,"+C.text+" 30%,"+C.accent+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>InvoiceIQ</h1>
                  <p style={{fontSize:13,color:C.muted,lineHeight:1.6}}>Intelligent Invoice Automation for Modern Businesses</p>
                </div>
                <div style={{border:"2px dashed "+(drag?C.accent:C.border),borderRadius:14,padding:"44px 24px",textAlign:"center",cursor:"pointer",marginBottom:16,transition:"all 0.2s",background:drag?"rgba(0,198,255,0.04)":"transparent"}}
                  onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files)}}
                  onClick={()=>fileRef.current.click()}>
                  <div style={{fontSize:36,marginBottom:12}}>📂</div>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:6}}>Drop invoices or entire folders here</div>
                  <div style={{fontSize:12,color:C.muted,marginBottom:18,fontFamily:C.mono}}>PDF · JPG · PNG · WEBP · Up to 100 files</div>
                  <button style={S.btn(C.accent)} onClick={e=>{e.stopPropagation();fileRef.current.click()}}>Browse Files</button>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple webkitdirectory={false} style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
                </div>
                {processing&&(
                  <div style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:11,fontFamily:C.mono,color:C.muted}}>
                      <span>Processing {done} of {queue.length}…</span><span>{progress}%</span>
                    </div>
                    <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",background:"linear-gradient(90deg,"+C.accent+","+C.green+")",borderRadius:3,width:progress+"%",transition:"width 0.4s ease"}}/>
                    </div>
                  </div>
                )}
                {queue.length>0&&(
                  <div style={S.card}>
                    <div style={S.cardH}>
                      <span style={{fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:1,color:C.muted}}>📋 Queue — {queue.length} files</span>
                      <div style={{display:"flex",gap:8}}>
                        <button style={S.btn(C.border,C.text)} onClick={()=>setQueue([])}>Clear</button>
                        <button style={S.btn(processing?"#333":C.accent,processing?"#888":"#000")} onClick={processAll} disabled={processing}>{processing?`⏳ ${done}/${queue.length}`: `⚡ Extract All (${queue.filter(f=>f.status==="pending").length})`}</button>
                      </div>
                    </div>
                    {queue.map(f=>(
                      <div key={f.id} style={{padding:"11px 18px",borderBottom:"1px solid "+C.border+"44",display:"flex",alignItems:"center",gap:12}}>
                        <span style={{fontSize:18,cursor:f.file.type.startsWith("image/")?"pointer":"default"}} onClick={()=>{if(f.file.type.startsWith("image/"))setPreview(URL.createObjectURL(f.file))}}>{f.file.type==="application/pdf"?"📕":"🖼️"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                          <div style={{fontSize:10,color:C.muted,fontFamily:C.mono}}>{fmtKB(f.size)}{f.file.type.startsWith("image/")&&<span style={{color:C.accent,cursor:"pointer",marginLeft:8}} onClick={()=>setPreview(URL.createObjectURL(f.file))}>👁️ Preview</span>}</div>
                          {f.error&&<div style={{fontSize:10,color:C.red,marginTop:2}}>{f.error}</div>}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:f.status==="done"?C.green:f.status==="error"?C.red:f.status==="processing"?C.accent:C.muted,fontFamily:C.mono}}>
                          {f.status==="done"?"✅ Done":f.status==="error"?"❌ Failed":f.status==="processing"?"⏳ Extracting...":"⏸️ Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}{/* ── INSIGHTS ── */}
            {tab==="insights"&&(
              <div>
                <SmartInsights invoices={invoices}/>
                <MonthlyReport invoices={invoices} toast={toast} S={S} C={C}/>
              </div>
            )}

            {/* ── RESULTS ── */}
            {tab==="results"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
                  {[[invoices.length,"Invoices",C.accent,"📄"],[fmtINR(totalAmt),"Total Spend",C.green,"💰"],[fmtINR(totalTax),"Total GST",C.amber,"🧾"],[avgConf+"%","Avg Confidence","#A78BFA","🎯"]].map(([v,l,c,icon])=>(
                    <div key={l} style={{...S.card,marginBottom:0,padding:18,borderTop:"2px solid "+c}}>
                      <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
                      <div style={{fontSize:22,fontWeight:800,color:c,letterSpacing:-0.5,marginBottom:3}}>{v}</div>
                      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,fontFamily:C.mono}}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Search + Filters */}
                <div style={{...S.card,padding:16,marginBottom:16}}>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                    <input style={{...S.input,flex:1,minWidth:200}} placeholder="🔍 Search vendor, invoice no, category..." value={search} onChange={e=>setSearch(e.target.value)}/>
                    <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{...S.input,width:140,appearance:"none"}}>
                      <option value="All">All Categories</option>
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{...S.input,width:120,appearance:"none"}}>
                      <option value="All">All Months</option>
                      {MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...S.input,width:130,appearance:"none"}}>
                      <option value="date">Sort: Date</option>
                      <option value="amount">Sort: Amount</option>
                      <option value="vendor">Sort: Vendor</option>
                      <option value="confidence">Sort: Confidence</option>
                    </select>
                    {(search||filterCat!=="All"||filterMonth!=="All")&&<button style={S.btn(C.red+"22",C.red)} onClick={()=>{setSearch("");setFilterCat("All");setFilterMonth("All");}}>✕ Clear</button>}
                  </div>
                </div>{filtered.length===0?(
                  <div style={{textAlign:"center",padding:60,color:C.muted}}>
                    <div style={{fontSize:48,marginBottom:16}}>🔍</div>
                    <div style={{fontSize:15,fontWeight:700}}>{invoices.length?"No results found":"No invoices yet"}</div>
                    <div style={{fontSize:12,marginTop:6,fontFamily:C.mono}}>{invoices.length?"Try different search or filters":"Upload and extract files first"}</div>
                  </div>
                ):(
                  <div style={S.card}>
                    <div style={S.cardH}>
                      <span style={{fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:1,color:C.muted}}>📊 {filtered.length} Invoice{filtered.length!==1?"s":""}</span>
                      <div style={{display:"flex",gap:8}}>
                        <button style={S.btn(C.border,C.text)} onClick={()=>exportCSV(filtered)}>📄 CSV</button>
                        <button style={S.btn(C.green)} onClick={()=>{exportExcel(filtered);toast("✅ Excel exported!","success");}}>📊 Excel</button>
                      </div>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr>{["#","Vendor","Invoice No","Date","Category","Amount","GST","Conf","Actions"].map(h=>(
                            <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,borderBottom:"1px solid "+C.border,whiteSpace:"nowrap"}}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {filtered.map((inv,i)=>(
                            <tr key={inv.id} style={{borderBottom:"1px solid "+C.border+"33"}}>
                              <td style={{padding:"11px 14px",fontSize:11,color:C.muted,fontFamily:C.mono}}>{i+1}</td>
                              <td style={{padding:"11px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}} onClick={()=>inv.fileName&&inv.fileName.match(/\.(jpg|jpeg|png|webp)$/i)&&setPreview(URL.createObjectURL(queue.find(q=>q.name===inv.fileName)?.file))}>{inv.vendor||"—"}</td>
                              <td style={{padding:"11px 14px",fontSize:11,color:C.muted,fontFamily:C.mono}}>{inv.invoiceNumber||"—"}</td>
                              <td style={{padding:"11px 14px",fontSize:11,fontFamily:C.mono}}>{inv.date||"—"}</td>
                              <td style={{padding:"11px 14px"}}><span style={{background:"rgba(0,198,255,0.1)",color:C.accent,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{inv.category||"Other"}</span></td>
                              <td style={{padding:"11px 14px",fontSize:14,fontWeight:700,color:C.green,fontFamily:C.mono}}>{fmtINR(inv.amount)}</td>
                              <td style={{padding:"11px 14px",fontSize:11,color:C.muted,fontFamily:C.mono}}>{fmtINR(inv.tax)}</td>
                              <td style={{padding:"11px 14px"}}><span style={{background:(inv.confidence||0)>70?"rgba(0,229,160,0.12)":"rgba(255,181,71,0.12)",color:(inv.confidence||0)>70?C.green:C.amber,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700}}>{inv.confidence||0}%</span></td>
                              <td style={{padding:"11px 14px"}}>
                                <div style={{display:"flex",gap:6}}>
                                  <button style={S.btn(C.border,C.text)} onClick={()=>{setEditId(inv.id);setEditData({...inv})}}>✏️</button>
                                  <button style={S.btn("rgba(255,77,106,0.15)",C.red)} onClick={()=>deleteInvoice(inv.id)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}{/* ── DASHBOARD ── */}
            {tab==="dashboard"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
                  {[[invoices.length,"Invoices",C.accent,"📄"],[fmtINR(totalAmt),"Total Spend",C.green,"💰"],[Object.keys(vendorMap).length,"Vendors",C.amber,"🏢"],[fmtINR(totalTax),"Total Tax",C.purple,"📑"]].map(([v,l,c,icon])=>(
                    <div key={l} style={{...S.card,marginBottom:0,padding:18,borderTop:"2px solid "+c}}>
                      <div style={{fontSize:22,marginBottom:8}}>{icon}</div>
                      <div style={{fontSize:22,fontWeight:800,color:c,marginBottom:3}}>{v}</div>
                      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,fontFamily:C.mono}}>{l}</div>
                    </div>
                  ))}
                </div>
                {invoices.length===0?<div style={{textAlign:"center",padding:60,color:C.muted}}><div style={{fontSize:48,marginBottom:16}}>📊</div><div style={{fontSize:15,fontWeight:700}}>No data yet</div></div>:(
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
                    <div style={S.card}><div style={S.cardH}><span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>📈 Monthly Spend</span></div><div style={S.cardB}>{monthData.length>0?<BarChart data={monthData} color={C.accent}/>:<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:30}}>Add invoices with dates</div>}</div></div>
                    <div style={S.card}><div style={S.cardH}><span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>🏢 Vendors</span></div><div style={S.cardB}><DonutChart data={vendorData}/></div></div>
                    <div style={S.card}><div style={S.cardH}><span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>🏷️ Categories</span></div>
                      <div style={S.cardB}>{Object.entries(catMap).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>(
                        <div key={cat} style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                            <span style={{fontWeight:600}}>{cat}</span>
                            <span style={{fontFamily:C.mono,color:C.green}}>{fmtINR(val)} <span style={{color:C.muted}}>({Math.round(val/catTotal*100)}%)</span></span>
                          </div>
                          <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:COLORS[i%COLORS.length],borderRadius:3,width:Math.round(val/catTotal*100)+"%"}}/></div>
                        </div>
                      ))}</div>
                    </div>
                    <div style={S.card}><div style={S.cardH}><span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>⚡ Auto Categories</span></div>
                      <div style={S.cardB}>{CATS.map(cat=>{const count=invoices.filter(i=>i.category===cat).length;if(!count) return null;return(<div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border+"33",fontSize:12}}><span style={{color:C.muted}}>{cat}</span><span style={{fontFamily:C.mono,fontWeight:700,color:C.accent}}>{count}</span></div>);})}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GST ── */}
            {tab==="gst"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
                  {[[fmtINR(totalTax),"Total GST Paid",C.amber],[fmtINR(totalTax*0.5),"Est. CGST",C.accent],[fmtINR(totalTax*0.5),"Est. SGST",C.purple]].map(([v,l,c])=>(
                    <div key={l} style={{...S.card,marginBottom:0,padding:20,borderTop:"2px solid "+c}}>
                      <div style={{fontSize:24,fontWeight:800,color:c,marginBottom:4}}>{v}</div>
                      <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:0.5,fontFamily:C.mono}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <div style={S.cardH}><span style={{fontWeight:700,fontSize:12,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>🧾 Monthly GST Report</span></div>
                  {Object.entries(gstByMonth).length===0?<div style={{textAlign:"center",padding:40,color:C.muted,fontSize:12}}>No GST data yet</div>:(
                    <div>
                      {Object.entries(gstByMonth).map(([month,val])=>(
                        <div key={month} style={{padding:"14px 18px",borderBottom:"1px solid "+C.border+"33",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:13,fontWeight:600}}>{month}</span>
                          <span style={{fontFamily:C.mono,fontWeight:700,color:C.amber,fontSize:14}}>{fmtINR(val)}</span>
                        </div>
                      ))}
                      <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid "+C.border}}>
                        <span style={{fontWeight:700}}>TOTAL GST</span>
                        <span style={{fontFamily:C.mono,fontWeight:800,color:C.amber,fontSize:16}}>{fmtINR(totalTax)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORY ── */}
            {tab==="history"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div style={{fontSize:13,color:C.muted,fontFamily:C.mono}}>{invoices.length} invoices stored locally</div>
                  {invoices.length>0&&<button style={S.btn("rgba(255,77,106,0.15)",C.red)} onClick={()=>{if(window.confirm("Delete all history?"))setInvoices([])}}>🗑️ Clear All</button>}
                </div>
                {invoices.length===0?<div style={{textAlign:"center",padding:60,color:C.muted}}><div style={{fontSize:48,marginBottom:16}}>🕐</div><div style={{fontSize:15,fontWeight:700}}>No history yet</div></div>:(
                  <div style={S.card}>
                    {invoices.map((inv,i)=>(
                      <div key={inv.id} style={{padding:"14px 18px",borderBottom:"1px solid "+C.border+"33",display:"flex",alignItems:"center",gap:14}}>
                        <div style={{width:36,height:36,background:"rgba(0,198,255,0.1)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📄</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{inv.vendor||"Unknown Vendor"}</div>
                          <div style={{fontSize:11,color:C.muted,fontFamily:C.mono}}>{inv.fileName} · {inv.date||"No date"} · #{inv.invoiceNumber||"—"}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.green,fontFamily:C.mono}}>{fmtINR(inv.amount)}</div>
                          <div style={{fontSize:10,color:C.muted,marginTop:2}}>{inv.category||"Other"}</div>
                        </div>
                        <button style={S.btn(C.border,C.text)} onClick={()=>{setEditId(inv.id);setEditData({...inv})}}>✏️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}{/* ── AUTOMATION ── */}
            {tab==="automation"&&(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  {[{icon:"📊",title:"Excel Export",desc:"Formatted .xls with totals & colors",btn:"Download Excel",color:C.green,action:()=>{if(!invoices.length)return toast("No invoices!","error");exportExcel(invoices);toast("✅ Excel downloaded!","success");}},
                    {icon:"📄",title:"CSV Export",desc:"Raw data for any tool or database",btn:"Download CSV",color:C.accent,action:()=>{if(!invoices.length)return toast("No invoices!","error");exportCSV(invoices);toast("✅ CSV downloaded!","success");}},
                  ].map(e=>(
                    <div key={e.title} style={{...S.card,marginBottom:0,padding:20,borderTop:"2px solid "+e.color}}>
                      <div style={{fontSize:30,marginBottom:10}}>{e.icon}</div>
                      <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{e.title}</div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:16,fontFamily:C.mono,lineHeight:1.5}}>{e.desc}</div>
                      <button style={S.btn(e.color)} onClick={e.action}>{e.btn}</button>
                    </div>
                  ))}
                </div>
                <GoogleSheetsSection invoices={invoices} toast={toast} S={S} C={C}/>
                <EmailSection invoices={invoices} toast={toast} S={S} C={C}/>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

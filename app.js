// ======================
// Utility Functions
// ======================

function loadEntries() {
  let entries = JSON.parse(localStorage.getItem("entries") || "[]");
  entries = entries.map(e => ({
    date: e.date || "",
    start: e.start || "",
    end: e.end || "",
    hours: parseFloat(e.hours || 0),
    paid: e.paid === undefined ? false : e.paid,
    payCut: parseFloat(e.payCut || 0)
  }));
  return entries;
}

function saveEntries(entries) {
  localStorage.setItem("entries", JSON.stringify(entries));
}

function getRate() {
  return parseFloat(localStorage.getItem("hourlyRate")) || parseFloat(document.getElementById("rate").value) || 10;
}

function getWeeklyLimit() {
  return parseFloat(localStorage.getItem("weeklyLimit")) || 20;
}

function formatCurrency(amount) {
  return "£" + amount.toFixed(2);
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function isSameWeek(date, ref) {
  const startOfRefWeek = getStartOfWeek(ref);
  const endOfRefWeek = new Date(startOfRefWeek);
  endOfRefWeek.setDate(startOfRefWeek.getDate() + 6);
  return date >= startOfRefWeek && date <= endOfRefWeek;
}

function isSameMonth(date, ref) {
  return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
}

function getLastFridayBefore(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day >= 5) ? day - 5 : 7 - (5 - day);
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

// ======================
// Pre-fill Entries
// ======================

function prefillEntries() {
  const entries = [
    { date: '2025-08-09', start: '01:30', end: '05:00', hours: 3.5, paid: false, payCut: 0 },
    { date: '2025-08-09', start: '06:00', end: '11:00', hours: 5, paid: false, payCut: 0 },
    { date: '2025-08-10', start: '-', end: '-', hours: 9.5, paid: false, payCut: 0 },
    { date: '2025-08-16', start: '01:00', end: '06:00', hours: 5, paid: false, payCut: 0 }
  ];
  if (!localStorage.getItem("entries")) saveEntries(entries);
}

// ======================
// Dashboard Calculation
// ======================

function updateDashboard(payday = null) {
  const entries = loadEntries();
  const now = new Date();

  let weeklyHours=0, weeklyEarnings=0, prevWeekHours=0, prevWeekEarnings=0;
  let monthlyHours=0, monthlyEarnings=0, prevMonthHours=0, prevMonthEarnings=0;
  let totalHours=0, totalEarnings=0;
  let pendingPayCutHours=0, pendingPayCutEarnings=0;

  const rate = getRate();
  const thisWeekStart = getStartOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate()-7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate()-1);

  let payCutStart = payday ? getLastFridayBefore(payday) : null;
  let payCutEnd = payday ? new Date(payday) : null;

  entries.forEach(e=>{
    const d = new Date(e.date);
    const hours = parseFloat(e.hours||0);
    const earnings = hours*rate;

    if(isSameWeek(d, now)){ weeklyHours+=hours; weeklyEarnings+=earnings; }
    if(d>=lastWeekStart && d<=lastWeekEnd){ prevWeekHours+=hours; prevWeekEarnings+=earnings; }
    if(isSameMonth(d, now)){ monthlyHours+=hours; monthlyEarnings+=earnings; }
    const prevMonth = new Date(now.getFullYear(), now.getMonth()-1,1);
    if(isSameMonth(d, prevMonth)){ prevMonthHours+=hours; prevMonthEarnings+=earnings; }

    if(payCutStart && payCutEnd && d>=payCutStart && d<=payCutEnd){ 
      pendingPayCutHours+=hours; pendingPayCutEarnings+=earnings; 
    } else if(!e.paid){
      totalHours+=hours; totalEarnings+=earnings;
    }
  });

  totalHours+=pendingPayCutHours;
  totalEarnings+=pendingPayCutEarnings;

  document.getElementById("weekly-hours").innerText = weeklyHours.toFixed(2)+" hrs";
  document.getElementById("weekly-earnings").innerText = formatCurrency(weeklyEarnings);
  document.getElementById("previous-week-hours").innerText = prevWeekHours.toFixed(2)+" hrs";
  document.getElementById("previous-week-earnings").innerText = formatCurrency(prevWeekEarnings);
  document.getElementById("monthly-hours").innerText = monthlyHours.toFixed(2)+" hrs";
  document.getElementById("monthly-earnings").innerText = formatCurrency(monthlyEarnings);
  document.getElementById("previous-month-hours").innerText = prevMonthHours.toFixed(2)+" hrs";
  document.getElementById("previous-month-earnings").innerText = formatCurrency(prevMonthEarnings);
  document.getElementById("total-hours").innerText = totalHours.toFixed(2)+" hrs";
  document.getElementById("total-earnings").innerText = formatCurrency(totalEarnings);
  document.getElementById("pending-paycut-hours").innerText = pendingPayCutHours.toFixed(2)+" hrs";
  document.getElementById("pending-paycut-earnings").innerText = formatCurrency(pendingPayCutEarnings);

  updateRestriction(weeklyHours);
  document.getElementById("week-progress").style.width = Math.min((weeklyHours/getWeeklyLimit()*100),100)+"%";
}

// ======================
// Restriction Pill
// ======================

function updateRestriction(weeklyHours){
  const pill = document.getElementById("restriction-pill");
  const limit = getWeeklyLimit();
  const terms = JSON.parse(localStorage.getItem("terms")||"[]");
  const now = new Date();

  const inTerm = terms.some(t=>{
    const start = new Date(t.start);
    const end = new Date(t.end);
    return now >= start && now <= end;
  });

  if(inTerm){
    pill.innerText = "Full-time — no restriction";
    pill.className = "pill ok";
    document.getElementById("week-progress").style.width = "100%";
    return;
  }

  if(weeklyHours <= limit){
    pill.innerText = `OK (${weeklyHours.toFixed(2)}/${limit} hrs)`;
    pill.className = "pill ok";
  } else {
    pill.innerText = `Exceeded (${weeklyHours.toFixed(2)}/${limit} hrs)`;
    pill.className = "pill danger";
  }

  document.getElementById("week-progress").style.width = Math.min((weeklyHours/limit)*100,100) + "%";
}

// ======================
// Save Entry
// ======================

document.getElementById("save").addEventListener("click",()=>{
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  let hours = parseFloat(document.getElementById("hours").value);
  let payCut = parseFloat(document.getElementById("payCut").value||0);
  if(!date) return alert("Enter date");

  if(!hours && start && end){
    const s=new Date("1970-01-01T"+start+":00");
    const e=new Date("1970-01-01T"+end+":00");
    hours=(e-s)/(1000*60*60);
  }

  if(!hours || hours<=0) return alert("Invalid hours");

  const entries = loadEntries();
  entries.push({date, start, end, hours, paid:false, payCut});
  saveEntries(entries);
  updateDashboard();
  renderHistory();
});

// ======================
// Render History
// ======================

function renderHistory(){
  const tbody=document.querySelector("#historyTable tbody");
  tbody.innerHTML="";
  const entries = loadEntries();
  const rate = getRate();
  entries.forEach((e,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${e.date}</td><td>${e.start||"-"}</td><td>${e.end||"-"}</td>
    <td>${e.hours}</td><td>${formatCurrency(e.hours*rate)}</td>
    <td>${e.paid?'<span class="pill ok">Paid</span>':`<button data-index="${i}" class="markPaid ghost">Mark Paid</button>`}</td>
    <td>${e.payCut||0}</td>
    <td><button data-index="${i}" class="deleteEntry ghost">Delete</button></td>`;
    tbody.appendChild(tr);
  });

  document.querySelectorAll(".markPaid").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx = btn.dataset.index;
      const entries = loadEntries();
      entries[idx].paid = true;
      saveEntries(entries);
      updateDashboard();
      renderHistory();
    });
  });

  document.querySelectorAll(".deleteEntry").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const idx = btn.dataset.index;
      let entries = loadEntries();
      entries.splice(idx,1);
      saveEntries(entries);
      updateDashboard();
      renderHistory();
    });
  });
}

// ======================
// Export & Mark All Paid
// ======================

document.getElementById("exportCsv").addEventListener("click",()=>{
  const entries = loadEntries();
  if(!entries.length) return alert("No data to export");
  const header=["Date","Start","End","Hours","Paid","PayCut"].join(",");
  const rows=entries.map(e=>[e.date,e.start,e.end,e.hours,e.paid,e.payCut].join(","));
  const csv=[header].concat(rows).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="work-hours.csv"; a.click();
});

document.getElementById("markAllPaid").addEventListener("click",()=>{
  let entries = loadEntries();
  entries = entries.map(e=>({...e, paid:true}));
  saveEntries(entries);
  updateDashboard();
  renderHistory();
});

// ======================
// Tabs
// ======================

document.querySelectorAll(".tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(p=>p.style.display="none");
    document.getElementById(tab.dataset.tab).style.display="block";
  });
});

// ======================
// Term Dates
// ======================

document.getElementById("addTerm").addEventListener("click",()=>{
  const start=document.getElementById("termStart").value;
  const end=document.getElementById("termEnd").value;
  if(!start||!end) return alert("Enter start and end dates");
  const terms=JSON.parse(localStorage.getItem("terms")||"[]");
  terms.push({start,end});
  localStorage.setItem("terms",JSON.stringify(terms));
  renderTerms();
  updateDashboard();
});

function renderTerms(){
  const terms=JSON.parse(localStorage.getItem("terms")||"[]");
  const ul=document.getElementById("termList");
  ul.innerHTML="";
  terms.forEach(t=>{
    const li=document.createElement("li");
    li.textContent=`${t.start} → ${t.end}`;
    ul.appendChild(li);
  });
}

// ======================
// Save Settings
// ======================

document.getElementById("saveSettings").addEventListener("click", () => {
  const rate = parseFloat(document.getElementById("rate").value) || 10;
  const weeklyLimit = parseFloat(document.getElementById("weeklyLimit").value) || 20;
  localStorage.setItem("hourlyRate", rate);
  localStorage.setItem("weeklyLimit", weeklyLimit);
  alert("Settings saved!");
  updateDashboard();
});

// ======================
// Init
// ======================

prefillEntries();
updateDashboard();
renderHistory();
renderTerms();

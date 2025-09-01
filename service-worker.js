// ======================
// Export CSV
// ======================

document.getElementById("exportCsv").addEventListener("click", () => {
  const entries = loadEntries();
  if (!entries.length) return alert("No data to export");
  const rate = getRate();

  const header = ["Date", "Start", "End", "Hours", "Earnings", "Paid"].join(",");
  const rows = entries.map(e => [
    e.date,
    e.start || "-",
    e.end || "-",
    e.hours,
    (e.hours * rate).toFixed(2),   // earnings
    e.paid ? "Yes" : "No"
  ].join(","));

  const csv = [header].concat(rows).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "work-hours.csv";
  a.click();
});

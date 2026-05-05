let flows = [];
let stockFlows = {};

const processButton = document.getElementById("process");
const fileInput = document.getElementById("file");
const summaryEl = document.getElementById("summary");
const tableEl = document.getElementById("table");

processButton.addEventListener("click", run);

function run() {
  const file = fileInput.files[0];
  if (!file) {
    summaryEl.textContent = "Please select an XTB export file first.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
    parseCash(wb);
    parseClosed(wb);
    calculate();
  };

  reader.readAsArrayBuffer(file);
}

function parseCash(wb) {
  const sheet = wb.Sheets["Cash Operations"];
  if (!sheet) return;

  const rows = XLSX.utils.sheet_to_json(sheet, { range: 3 });
  flows = [];
  stockFlows = {};

  rows.forEach((row) => {
    if (!row["Ticker"] || !row["Time"] || !row["Amount"]) return;
    if (!row["Type"] || !row["Type"].includes("Stock")) return;

    const stock = row["Ticker"];
    const amount = parseFloat(row["Amount"]);
    const date = new Date(row["Time"]);

    flows.push({ date, amount });

    if (!stockFlows[stock]) stockFlows[stock] = [];
    stockFlows[stock].push({ date, amount });
  });
}

function parseClosed(wb) {
  const sheet = wb.Sheets["Closed Positions"];
  if (!sheet) return;

  const rows = XLSX.utils.sheet_to_json(sheet, { range: 3 });
  rows.forEach((row) => {
    if (!row["Symbol"] || !row["Profit"]) return;

    const stock = row["Symbol"];
    const profit = parseFloat(row["Profit"]);
    const closeDate = new Date(row["Close Time"]);

    if (!stockFlows[stock]) stockFlows[stock] = [];
    stockFlows[stock].push({ date: closeDate, amount: profit });
  });
}

function xirr(flows) {
  if (!flows.length) return 0;

  let rate = 0.1;
  for (let i = 0; i < 100; i += 1) {
    let f = 0;
    let df = 0;
    const t0 = flows[0].date;

    flows.forEach((cf) => {
      const t = (cf.date - t0) / 86400000 / 365;
      f += cf.amount / Math.pow(1 + rate, t);
      df += (-t * cf.amount) / Math.pow(1 + rate, t + 1);
    });

    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-6) return newRate * 100;
    rate = newRate;
  }

  return rate * 100;
}

function calculate() {
  const rows = [];
  let best = { stock: "", value: -Infinity };
  let worst = { stock: "", value: Infinity };

  Object.keys(stockFlows).forEach((stock) => {
    const value = xirr(stockFlows[stock]);
    rows.push({ stock, value });

    if (value > best.value) best = { stock, value };
    if (value < worst.value) worst = { stock, value };
  });

  const portfolioValue = xirr(flows);
  summaryEl.innerHTML = `Portfolio XIRR (realized): ${portfolioValue.toFixed(2)}%<br>` +
    `Best: ${best.stock} (${best.value.toFixed(2)}%)<br>` +
    `Worst: ${worst.stock} (${worst.value.toFixed(2)}%)`;

  tableEl.innerHTML = buildTable(rows);
}

function buildTable(rows) {
  if (!rows.length) return "<tr><td colspan=2>No stock flows found.</td></tr>";

  const header = "<tr><th>Stock</th><th>XIRR</th></tr>";
  const body = rows
    .map((row) => `<tr><td>${row.stock}</td><td>${row.value.toFixed(2)}%</td></tr>`)
    .join("");

  return header + body;
}

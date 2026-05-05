let flows = [];
let stockStats = {};

const processButton = document.getElementById("process");
const fileInput = document.getElementById("file");
const summaryEl = document.getElementById("summary");
const detailsEl = document.getElementById("details");
const tableEl = document.getElementById("table");

processButton.addEventListener("click", run);

function run() {
  const file = fileInput.files[0];
  if (!file) {
    summaryEl.textContent = "Please select a portfolio Excel file first.";
    detailsEl.textContent = "";
    tableEl.innerHTML = "";
    return;
  }

  summaryEl.textContent = "Reading file and parsing portfolio data...";
  detailsEl.textContent = "";
  tableEl.innerHTML = "";

  const reader = new FileReader();
  reader.onload = function (e) {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
    parseWorkbook(wb);
    calculate();
  };

  reader.readAsArrayBuffer(file);
}

function parseWorkbook(wb) {
  flows = [];
  stockStats = {};

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null, range: 4 });
    rows.forEach((rawRow) => {
      parseRow(rawRow);
    });
  });
}

function parseRow(rawRow) {
  const row = normalizeRow(rawRow);
  const symbol = findFirst(row, ["ticker", "symbol", "instrument", "isin"]);
  if (!symbol) return;

  const isFlowRow = hasAnyKey(row, ["amount", "profit", "profit/loss", "cash flow", "net amount", "total amount", "pl", "p/l"]);
  const isValueRow = hasAnyKey(row, ["market value", "current value", "position value", "real value", "value"]);

  const date = parseDate(findFirst(row, ["time", "date", "close time", "open time", "execution time", "trade date", "position date", "close time (utc)", "open time (utc)", "time (utc)"]));
  const flowAmount = parseNumber(findFirst(row, ["amount", "profit", "profit/loss", "cash flow", "net amount", "total amount", "pl", "p/l"]));

  if (isFlowRow && flowAmount != null && date) {
    const flowType = hasAnyKey(row, ["profit", "profit/loss", "pl", "p/l"]) ? "profit" : "cash";
    addStockFlow(symbol, date, flowAmount, flowType);
    return;
  }

  const currentValue = parseNumber(findFirst(row, ["market value", "current value", "position value", "real value", "value"]));
  const units = parseNumber(findFirst(row, ["volume", "units", "quantity"]));
  const price = parseNumber(findFirst(row, ["price", "close price", "open price", "current price"]));

  if (currentValue != null) {
    addCurrentValue(symbol, currentValue, date || new Date());
    return;
  }

  if (units != null && price != null) {
    addCurrentValue(symbol, units * price, date || new Date());
  }
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    normalized[key.toString().trim().toLowerCase()] = value;
  });
  return normalized;
}

function findFirst(row, keys) {
  return keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && value !== "");
}

function hasAnyKey(row, keys) {
  return keys.some((key) => row[key] !== undefined && row[key] !== null && row[key] !== "");
}

function parseDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  }

  const stringValue = value.toString().trim();
  const numeric = Number(stringValue);
  if (!Number.isNaN(numeric) && stringValue.length <= 8) {
    return new Date(Date.UTC(1899, 11, 30) + numeric * 86400000);
  }

  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;

  let text = value.toString().trim();
  if (text === "") return null;

  text = text.replace(/[^0-9.,\-]/g, "");
  text = text.replace(/[\s\u202f\u00A0]/g, "");

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(/,/g, ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    text = text.replace(/,/g, ".");
  }

  const parsed = parseFloat(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function addStockFlow(symbol, date, amount, type) {
  const stock = symbol.toString().trim();
  if (!stock) return;

  if (!stockStats[stock]) {
    stockStats[stock] = {
      invested: 0,
      realized: 0,
      currentValue: 0,
      flows: [],
    };
  }

  stockStats[stock].flows.push({ date, amount, type });
  flows.push({ date, amount });

  if (amount < 0) {
    stockStats[stock].invested += amount;
  } else if (type !== "current") {
    stockStats[stock].realized += amount;
  }
}

function addCurrentValue(symbol, value, date) {
  const stock = symbol.toString().trim();
  if (!stock) return;

  if (!stockStats[stock]) {
    stockStats[stock] = {
      invested: 0,
      realized: 0,
      currentValue: 0,
      flows: [],
    };
  }

  stockStats[stock].currentValue += value;
  stockStats[stock].flows.push({ date, amount: value, type: "current" });
  flows.push({ date, amount: value });
}

function xirr(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return NaN;
  const hasPositive = cashFlows.some((f) => f.amount > 0);
  const hasNegative = cashFlows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return NaN;

  const flows = cashFlows.slice().sort((a, b) => a.date - b.date);
  let rate = 0.1;

  for (let i = 0; i < 100; i += 1) {
    let f = 0;
    let df = 0;
    const t0 = flows[0].date;

    flows.forEach((cf) => {
      const t = (cf.date - t0) / 86400000 / 365;
      const denom = Math.pow(1 + rate, t);
      f += cf.amount / denom;
      df += (-t * cf.amount) / (denom * (1 + rate));
    });

    if (df === 0) break;
    const newRate = rate - f / df;
    if (!Number.isFinite(newRate)) break;
    if (Math.abs(newRate - rate) < 1e-8) return newRate * 100;
    rate = newRate;
    if (rate <= -0.99999999) rate = -0.99999999;
  }

  return rate * 100;
}

function calculate() {
  const rows = [];
  let bestXirr = { stock: "", value: -Infinity };
  let worstXirr = { stock: "", value: Infinity };

  Object.entries(stockStats).forEach(([stock, stats]) => {
    const invested = -stats.invested;
    const netProfit = stats.realized + stats.currentValue + stats.invested;
    const returnPct = invested > 0 ? (netProfit / invested) * 100 : NaN;
    const xirrValue = xirr(stats.flows);

    rows.push({
      stock,
      invested,
      realized: stats.realized,
      currentValue: stats.currentValue,
      returnPct,
      xirr: xirrValue,
    });

    if (!Number.isNaN(xirrValue)) {
      if (xirrValue > bestXirr.value) bestXirr = { stock, value: xirrValue };
      if (xirrValue < worstXirr.value) worstXirr = { stock, value: xirrValue };
    }
  });

  const totalInvested = rows.reduce((sum, row) => sum + row.invested, 0);
  const totalRealized = rows.reduce((sum, row) => sum + row.realized, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.currentValue, 0);
  const totalNetProfit = totalRealized + totalValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : NaN;
  const portfolioXirr = xirr(flows);

  summaryEl.innerHTML = `Portfolio invested: ${formatCurrency(totalInvested)}<br>` +
    `Total realized: ${formatCurrency(totalRealized)}<br>` +
    `Current portfolio value: ${formatCurrency(totalValue)}<br>` +
    `Total return: ${formatPercent(totalReturnPct)}<br>` +
    `Portfolio XIRR: ${formatPercent(portfolioXirr)}`;

  detailsEl.innerHTML = `Stocks found: ${rows.length}. ` +
    `Best stock XIRR: ${bestXirr.stock ? `${bestXirr.stock} (${formatPercent(bestXirr.value)})` : "N/A"}. ` +
    `Worst stock XIRR: ${worstXirr.stock ? `${worstXirr.stock} (${formatPercent(worstXirr.value)})` : "N/A"}.`;

  tableEl.innerHTML = buildTable(rows);
}

function buildTable(rows) {
  if (!rows.length) return "<tr><td colspan=6>No stock rows were detected in the uploaded file.</td></tr>";

  const header = `<tr>
      <th>Stock</th>
      <th>Invested</th>
      <th>Realized</th>
      <th>Current Value</th>
      <th>Return %</th>
      <th>XIRR %</th>
    </tr>`;

  const body = rows
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((row) => `<tr>
      <td>${row.stock}</td>
      <td>${formatCurrency(row.invested)}</td>
      <td>${formatCurrency(row.realized)}</td>
      <td>${formatCurrency(row.currentValue)}</td>
      <td>${formatPercent(row.returnPct)}</td>
      <td>${formatPercent(row.xirr)}</td>
    </tr>`)
    .join("");

  return header + body;
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}%`;
}

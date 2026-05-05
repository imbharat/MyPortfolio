let flows = [];
let stockStats = {};
let parseStats = { totalRows: 0, matchedRows: 0, sheets: {} };

const processButton = document.getElementById("process");
const fileInput = document.getElementById("file");
const summaryEl = document.getElementById("summary");
const detailsEl = document.getElementById("details");
const tableEl = document.getElementById("table");

processButton.addEventListener("click", run);

async function run() {
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
  reader.onload = async function (e) {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
    parseWorkbook(wb);
    await fetchLivePrices();
    calculate();
  };

  reader.readAsArrayBuffer(file);
}

function parseWorkbook(wb) {
  flows = [];
  stockStats = {};
  parseStats = { totalRows: 0, matchedRows: 0, sheets: {}, priceInfo: "" };

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;

    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null, range: 4 });
    let sheetStats = { totalRows: rows.length, matchedRows: 0 };

    if (name.toLowerCase().includes("cash")) {
      sheetStats = parseCashOperations(rows);
    } else if (name.toLowerCase().includes("closed")) {
      sheetStats = parseClosedPositions(rows);
    } else {
      rows.forEach((rawRow) => {
        if (parseRow(rawRow)) {
          sheetStats.matchedRows += 1;
        }
      });
    }

    parseStats.totalRows += sheetStats.totalRows;
    parseStats.matchedRows += sheetStats.matchedRows;
    parseStats.sheets[name] = sheetStats;
  });
}

function parseCashOperations(rows) {
  const stats = { totalRows: rows.length, matchedRows: 0 };

  rows.forEach((rawRow) => {
    const row = normalizeRow(rawRow);
    const symbol = findFirst(row, ["ticker", "symbol", "instrument", "isin"]);
    const amount = parseNumber(row["amount"]);
    const date = parseDate(findFirst(row, ["time", "date", "execution time", "position date"]));
    const volume = parseNumber(findFirst(row, ["volume", "units", "quantity"]));
    const type = row["type"]?.toString().toLowerCase() || "";

    if (!symbol || amount == null || !date) return;

    if (type.includes("stock") || type.includes("buy") || type.includes("sell") || type.includes("dividend") || type.includes("interest") || type.includes("deposit") || type.includes("withdrawal")) {
      addStockFlow(symbol, date, amount, "cash");
      adjustOpenUnits(symbol, volume, type);
      stats.matchedRows += 1;
    }
  });

  return stats;
}

function parseClosedPositions(rows) {
  const stats = { totalRows: rows.length, matchedRows: 0 };

  rows.forEach((rawRow) => {
    const row = normalizeRow(rawRow);
    const symbol = findFirst(row, ["ticker", "symbol", "instrument", "isin"]);
    if (!symbol) return;

    const closeDate = parseDate(findFirst(row, ["close time", "close time (utc)", "close date"]));
    const saleValue = parseNumber(row["sale value"]);
    const volume = parseNumber(findFirst(row, ["volume", "units", "quantity"]));

    if (closeDate && saleValue != null) {
      addStockFlow(symbol, closeDate, saleValue, "cash");
    }

    if (volume != null) {
      adjustOpenUnits(symbol, -Math.abs(volume), "closed");
    }

    if (closeDate || volume != null) {
      stats.matchedRows += 1;
    }
  });

  return stats;
}

function parseRow(rawRow) {
  const row = normalizeRow(rawRow);
  const symbol = findFirst(row, ["ticker", "symbol", "instrument", "isin"]);
  if (!symbol) return false;

  const isFlowRow = hasAnyKey(row, ["amount", "profit", "profit/loss", "cash flow", "net amount", "total amount", "pl", "p/l"]);
  const date = parseDate(findFirst(row, ["time", "date", "close time", "open time", "execution time", "trade date", "position date", "close time (utc)", "open time (utc)", "time (utc)"]));
  const flowAmount = parseNumber(findFirst(row, ["amount", "profit", "profit/loss", "cash flow", "net amount", "total amount", "pl", "p/l"]));

  if (isFlowRow && flowAmount != null && date) {
    const flowType = hasAnyKey(row, ["profit", "profit/loss", "pl", "p/l"]) ? "profit" : "cash";
    addStockFlow(symbol, date, flowAmount, flowType);
    return true;
  }

  const currentValue = parseNumber(findFirst(row, ["market value", "current value", "position value", "real value", "value"]));
  const units = parseNumber(findFirst(row, ["volume", "units", "quantity"]));
  const price = parseNumber(findFirst(row, ["price", "close price", "open price", "current price"]));

  if (currentValue != null) {
    addCurrentValue(symbol, currentValue, date || new Date());
    return true;
  }

  if (units != null && price != null) {
    addCurrentValue(symbol, units * price, date || new Date());
    adjustOpenUnits(symbol, units, "buy");
    return true;
  }

  return false;
}

function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    normalized[key.toString().trim().toLowerCase()] = value;
  });
  return normalized;
}

function ensureStockStats(stock) {
  const key = stock.toString().trim();
  if (!stockStats[key]) {
    stockStats[key] = {
      invested: 0,
      realized: 0,
      currentValue: 0,
      flows: [],
      openUnits: 0,
      currentPrice: null,
    };
  }
  return stockStats[key];
}

function adjustOpenUnits(symbol, volume, type) {
  if (volume == null || Number.isNaN(volume)) return;
  const stock = ensureStockStats(symbol);
  const sign = type?.toString().toLowerCase() || "";
  if (sign.includes("sell") || sign.includes("close") || sign.includes("withdrawal")) {
    stock.openUnits -= Math.abs(volume);
  } else if (sign.includes("purchase") || sign.includes("buy") || sign.includes("deposit")) {
    stock.openUnits += volume;
  } else {
    stock.openUnits += volume;
  }
}

async function fetchLivePrices() {
  const tickers = Object.entries(stockStats)
    .filter(([, stats]) => stats.openUnits && stats.currentValue === 0)
    .map(([stock]) => stock);

  if (!tickers.length) {
    parseStats.priceInfo = "No open positions require live pricing.";
    return;
  }

  parseStats.priceInfo = `Looking up live prices for ${tickers.length} open ticker${tickers.length === 1 ? "" : "s"}...`;

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const price = await fetchTickerPrice(ticker);
        if (price == null) {
          throw new Error("price unavailable");
        }

        const stats = ensureStockStats(ticker);
        stats.currentPrice = price;
        const positionValue = price * stats.openUnits;
        stats.currentValue = positionValue;
        stats.flows.push({ date: new Date(), amount: positionValue, type: "current" });
        flows.push({ date: new Date(), amount: positionValue });
        return { ticker, price, positionValue };
      } catch (error) {
        return { ticker, error: error.message };
      }
    })
  );

  const good = results.filter((r) => r.status === "fulfilled" && !r.value?.error);
  const failed = results.filter((r) => r.status === "fulfilled" && r.value?.error);
  const rejected = results.filter((r) => r.status === "rejected");

  parseStats.priceInfo = `Live pricing: ${good.length}/${tickers.length} fetched successfully.`;
  if (failed.length || rejected.length) {
    const messages = failed
      .map((r) => `${r.value.ticker}: ${r.value.error}`)
      .concat(rejected.map((r) => r.reason?.message || "fetch failed"));
    parseStats.priceInfo += ` ${messages.join("; ")}`;
  }
}

async function fetchTickerPrice(ticker) {
  const baseTicker = ticker.split('.')[0];
  const exchange = ticker.split('.')[1] || '';
  const candidates = [
    ticker,
    `${baseTicker}.US`,
    `${baseTicker}.DE`,
    `${baseTicker}.UK`,
    `${baseTicker}.WA`, // Warsaw
    `${baseTicker}.PL`,
    `${baseTicker}.L`,  // London
  ].filter((t, i, arr) => arr.indexOf(t) === i); // unique

  for (const candidate of candidates) {
    try {
      const price = await fetchTickerPriceDirect(candidate);
      if (price != null) {
        return price;
      }
    } catch (error) {
      // continue to next candidate
    }
  }

  throw new Error(`no price found for ${ticker}`);
}

async function fetchTickerPriceDirect(ticker) {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(ticker)}&f=sd2t2ohlcv&h&e=csv`;
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://api.allorigins.cf/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
  ];

  let lastError = null;

  for (const proxy of proxies) {
    const proxyUrl = proxy.endsWith("fetch/") ? `${proxy}${url}` : `${proxy}${encodeURIComponent(url)}`;
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        lastError = new Error(`proxy ${proxy} returned ${response.status}`);
        continue;
      }
      return parseStooqCsv(await response.text());
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const directResponse = await fetch(url);
    if (!directResponse.ok) {
      throw new Error(`direct fetch failed ${directResponse.status}`);
    }
    return parseStooqCsv(await directResponse.text());
  } catch (directError) {
    throw lastError || directError;
  }
}

function parseStooqCsv(text) {
  if (!text) return null;
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const values = lines[1].split(",");
  const close = values[6];
  if (!close || close.toUpperCase() === "N/D") return null;
  return parseNumber(close);
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
      openUnits: stats.openUnits || 0,
      currentPrice: stats.currentPrice || null,
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

  const sheetDetails = Object.entries(parseStats.sheets)
    .map(([sheet, stats]) => `${sheet}: ${stats.matchedRows}/${stats.totalRows} rows matched`)
    .join(" | ");

  detailsEl.innerHTML = `Parsed rows: ${parseStats.totalRows}, matched stock rows: ${parseStats.matchedRows}. ` +
    `Sheets: ${sheetDetails}. ` +
    `Stocks found: ${rows.length}. ` +
    `Best stock XIRR: ${bestXirr.stock ? `${bestXirr.stock} (${formatPercent(bestXirr.value)})` : "N/A"}. ` +
    `Worst stock XIRR: ${worstXirr.stock ? `${worstXirr.stock} (${formatPercent(worstXirr.value)})` : "N/A"}. ` +
    `${parseStats.priceInfo || ""}`;

  tableEl.innerHTML = buildTable(rows);
}

function buildTable(rows) {
  if (!rows.length) return "<tr><td colspan=8>No stock rows were detected in the uploaded file.</td></tr>";

  const header = `<tr>
      <th>Stock</th>
      <th>Units</th>
      <th>Price</th>
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
      <td>${row.openUnits.toFixed ? row.openUnits : row.openUnits}</td>
      <td>${row.currentPrice != null ? formatCurrency(row.currentPrice) : "-"}</td>
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

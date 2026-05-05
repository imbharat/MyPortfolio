// ─── State ────────────────────────────────────────────────────────────────────
let stocks         = {};    // {ticker: StockData}
let chartInstances = [];    // Chart.js instances — destroyed before each rebuild
let divFlows       = [];    // {date, ticker, amount} — dividend payments only
let lastRows       = null;  // cached for lazy chart build on tab switch
let chartsReady    = false;
let lang           = "pl";  // current language

// ─── Translations ───────────────────────────────────────────────────────────────
const LANG = {
  pl: {
    appTitle:          "Analizator Portfela",
    selectFile:        "Wybierz plik Excel z portfelem",
    analyze:           "Analizuj",
    tabData:           "Podsumowanie i Tabela",
    tabCharts:         "Wykresy",
    readingFile:       "Wczytywanie pliku…",
    fetchingPrices:    (n) => `Pobieranie kursów dla ${n} spółek…`,
    noOpenPositions:   "Brak otwartych pozycji do wyceny.",
    livePricesLabel:   "Kursy bieżące →",
    noFile:            "Najpierw wybierz plik Excel z portfelem.",
    errPrefix:         "Błąd: ",
    resetBtn:          "↵ Analizuj inny plik",
    // Summary
    overall:           "Ogółem",
    totalInvested:     "Zainwestowano",
    totalReceived:     "Wartość sprzedaży",
    openValue:         "Wartość otwartych pozycji",
    netPnl:            "Zysk/Strata netto",
    totalReturn:       "Zwrot całkowity",
    pfXirr:            "XIRR Portfela",
    openUnrealized:    "Otwarte pozycje (niezrealizowane)",
    costBasis:         "Koszt nabycia",
    currentValue:      "Wartość bieżąca",
    unrealizedPnl:     "P&L niezrealizowany",
    unrealizedReturn:  "Zwrot niezrealizowany",
    closedRealized:    "Zamknięte pozycje (zrealizowane)",
    proceeds:          "Wpływy",
    realizedPnl:       "P&L zrealizowany",
    realizedReturn:    "Zwrot zrealizowany",
    // Table
    colTicker:         "Ticker",
    colName:           "Nazwa",
    colUnits:          "Jednostki",
    colPrice:          "Kurs",
    colInvested:       "Zainwestowano",
    colReceived:       "Otrzymano",
    colOpenVal:        "Wartość",
    colUnrlzd:         "P&L niezrealizowany",
    colRlzd:           "P&L zrealizowany",
    colNetPnl:         "P&L netto",
    colReturn:         "Zwrot %",
    colXirr:           "XIRR %",
    groupOpen:         "Otwarte pozycje",
    groupClosed:       "Zamknięte pozycje",
    noData:            "Brak danych o akcjach.",
    noPrice:           "brak kursu",
    cardAvg:           "Śr. cena",
    // Charts
    chAllocTitle:      "Alokacja portfela (wartość bieżąca)",
    chRetTitle:        "Otwarte pozycje — Zwrot %",
    chCostTitle:       "Koszt nabycia vs Wartość bieżąca (PLN)",
    chCostBasis:       "Koszt nabycia",
    chCurrVal:         "Wartość bieżąca",
    chXirrTitle:       "XIRR % na akcję (zwrot roczny)",
    chWaterfallTitle:  "Wodospad P&L wg akcji (PLN)",
    chWaterfallTip:    "P&L netto",
    chBubbleTitle:     "Wielkość pozycji vs Zwrot % vs XIRR",
    chBubbleX:         "Zwrot całkowity %",
    chBubbleY:         "XIRR %",
    chBubbleTipReturn: "Zwrot",
    chBubbleTipXirr:   "XIRR",
    chBubbleTipValue:  "Wartość",
    chDivTitle:        "Dywidendy wg miesiąca (PLN)",
    chCumTitle:        "Skumulowany kapitał zainwestowany w czasie",
    chCumLabel:        "Skumulowane inwestycje (PLN)",
    chCumToday:        "Wartość portfela dziś",
    noAlloc:           "Brak otwartych pozycji z kursami.",
    noRetData:         "Brak danych o zwrotach.",
    noCostData:        "Brak otwartych pozycji z kursami.",
    noXirrData:        "Brak danych XIRR.",
    noWaterfall:       "Brak danych P&L.",
    noBubble:          "Za mało pozycji z XIRR do wyświetlenia.",
    noDividend:        "Brak danych o dywidendach.",
    noCumData:         "Za mało historii transakcji.",
  },
  en: {
    appTitle:          "Portfolio Analyzer",
    selectFile:        "Select Excel portfolio file",
    analyze:           "Analyze",
    tabData:           "Summary & Table",
    tabCharts:         "Charts",
    readingFile:       "Reading file…",
    fetchingPrices:    (n) => `Fetching live prices for ${n} stocks…`,
    noOpenPositions:   "No open positions to price.",
    livePricesLabel:   "Live prices →",
    noFile:            "Please select a portfolio Excel file first.",
    errPrefix:         "Error: ",
    resetBtn:          "↵ Analyze another file",
    // Summary
    overall:           "Overall",
    totalInvested:     "Total Invested",
    totalReceived:     "Total Received (Sells)",
    openValue:         "Open Positions Value",
    netPnl:            "Net P&L",
    totalReturn:       "Total Return",
    pfXirr:            "Portfolio XIRR",
    openUnrealized:    "Open Positions (Unrealized)",
    costBasis:         "Cost Basis",
    currentValue:      "Current Value",
    unrealizedPnl:     "Unrealized P&L",
    unrealizedReturn:  "Unrealized Return",
    closedRealized:    "Closed Positions (Realized)",
    proceeds:          "Proceeds",
    realizedPnl:       "Realized P&L",
    realizedReturn:    "Realized Return",
    // Table
    colTicker:         "Ticker",
    colName:           "Name",
    colUnits:          "Units (open)",
    colPrice:          "Live Price",
    colInvested:       "Invested",
    colReceived:       "Received",
    colOpenVal:        "Open Value",
    colUnrlzd:         "Unrlzd P&L",
    colRlzd:           "Rlzd P&L",
    colNetPnl:         "Net P&L",
    colReturn:         "Return %",
    colXirr:           "XIRR %",
    groupOpen:         "Open Positions",
    groupClosed:       "Closed Positions",
    noData:            "No stock data found.",
    noPrice:           "no price",
    cardAvg:           "Avg",
    // Charts
    chAllocTitle:      "Portfolio Allocation (current value)",
    chRetTitle:        "Open Positions — Return %",
    chCostTitle:       "Cost Basis vs Current Value (PLN)",
    chCostBasis:       "Cost Basis",
    chCurrVal:         "Current Value",
    chXirrTitle:       "XIRR % per Stock (Annualised Return)",
    chWaterfallTitle:  "P&L Waterfall by Stock (PLN)",
    chWaterfallTip:    "Net P&L",
    chBubbleTitle:     "Position Size vs Return % vs XIRR",
    chBubbleX:         "Total Return %",
    chBubbleY:         "XIRR %",
    chBubbleTipReturn: "Return",
    chBubbleTipXirr:   "XIRR",
    chBubbleTipValue:  "Value",
    chDivTitle:        "Dividend Income by Month (PLN)",
    chCumTitle:        "Cumulative Capital Invested Over Time",
    chCumLabel:        "Cumulative Invested (PLN)",
    chCumToday:        "Portfolio Value today",
    noAlloc:           "No open positions with live prices.",
    noRetData:         "No return data available.",
    noCostData:        "No open positions with live prices.",
    noXirrData:        "No XIRR data available.",
    noWaterfall:       "No P&L data available.",
    noBubble:          "Not enough open positions with XIRR to plot.",
    noDividend:        "No dividend data found.",
    noCumData:         "Not enough transaction history to plot.",
  },
};

function t(key) {
  const v = LANG[lang][key];
  return typeof v === "function" ? v : (v ?? key);
}

function applyLang() {
  // Static elements with data-i18n attribute
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (el.tagName === "BUTTON" || el.tagName === "OPTION") {
      el.textContent = t(key);
    } else {
      el.textContent = t(key);
    }
  });
  document.title = t("appTitle");
  // Re-render live content if results are showing
  if (lastRows) {
    summaryEl.innerHTML = buildSummary(lastRows.__summary);
    tableEl.innerHTML   = buildTable(lastRows);
    cardListEl.innerHTML = buildCards(lastRows);
    if (chartsReady) { chartsReady = false; buildCharts(lastRows); chartsReady = true; }
  }
}

// StockData shape:
// {
//   name: string,
//   flows: [{date, amount}],   // negative = investment, positive = proceeds/dividend
//   openUnits: number,
//   totalBuyUnits: number,     // all units ever bought (for avg cost basis)
//   currentPrice: number|null,
//   currentPriceCcy: string|null,
//   currentValue: number,      // live price × openUnits in PLN (0 until price fetched)
// }

// ─── DOM ──────────────────────────────────────────────────────────────────────
const processButton = document.getElementById("process");
const fileInput     = document.getElementById("file");
const uploadSection = document.getElementById("upload-section");
const summaryEl     = document.getElementById("summary");
const detailsEl     = document.getElementById("details");
const tableEl       = document.getElementById("table");
const cardListEl    = document.getElementById("card-list");
const chartsEl      = document.getElementById("charts");
const loaderEl      = document.getElementById("loader");
const loaderMsgEl   = document.getElementById("loader-msg");
const tabsEl        = document.getElementById("tabs");

document.querySelectorAll(".tab-btn").forEach((btn) =>
  btn.addEventListener("click", () => showTab(btn.dataset.tab))
);

const langSelect = document.getElementById("lang-select");
if (langSelect) {
  langSelect.value = lang;
  langSelect.addEventListener("change", () => { lang = langSelect.value; applyLang(); });
}

processButton.addEventListener("click", run);

// ─── Entry ────────────────────────────────────────────────────────────────────
async function run() {
  const file = fileInput.files[0];
  if (!file) {
    showError(t("noFile"));
    return;
  }

  if (uploadSection) uploadSection.hidden = true;
  processButton.disabled = true;
  showLoader(t("readingFile"));
  tableEl.innerHTML = "";
  detailsEl.textContent = "";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const _warn = console.warn; console.warn = () => {};
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    console.warn = _warn;
    parseWorkbook(wb);
    showLoader(t("fetchingPrices")(Object.keys(stocks).length));
    await fetchAllLivePrices();
    hideLoader();
    renderResults();
  } catch (err) {
    hideLoader();
    showError(t("errPrefix") + err.message);
    console.error(err);
  } finally {
    processButton.disabled = false;
  }
}

// ─── Parsing ──────────────────────────────────────────────────────────────────
function parseWorkbook(wb) {
  stocks   = {};
  divFlows = [];

  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;

    // Rows as arrays; headers are on row index 4 (5th row)
    const allRows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null, header: 1 });
    if (allRows.length < 5) return;

    const headerRow = allRows[4];
    const headers = headerRow.map((h) => (h ? h.toString().trim().toLowerCase() : ""));

    const dataRows = allRows.slice(5).map((arr) => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h] = arr[i]; });
      return obj;
    });

    const nameLower = sheetName.toLowerCase();
    // Closed Positions is intentionally skipped — Cash Operations already contains
    // every buy/sell transaction. Parsing both would double-count closed stocks.
    if (nameLower.includes("cash")) {
      parseCashOperations(dataRows);
    }
  });
}

/**
 * Cash Operations sheet
 * Columns: type | ticker | instrument | time | amount | id | comment | product
 */
function parseCashOperations(rows) {
  rows.forEach((row) => {
    const type   = (row["type"] || "").toString().trim().toLowerCase();
    const ticker = (row["ticker"] || "").toString().trim().toUpperCase();
    const name   = (row["instrument"] || ticker).toString().trim();
    const date   = parseDate(row["time"]);
    const amount = parseNum(row["amount"]);

    if (!date || amount == null) return;
    if (type === "total" || type === "") return;

    // Parse volume from comment, e.g. "OPEN BUY 0.0565 @ 388.08"
    const comment = (row["comment"] || "").toString();
    const commentMatch = comment.match(/(?:OPEN|CLOSE)\s+(?:BUY|SELL)\s+([\d.]+)/i);
    const volume = commentMatch ? parseFloat(commentMatch[1]) : null;

    if (type === "stock purchase" || type === "stock buy") {
      if (!ticker) return;
      ensureStock(ticker, name);
      const inv = -Math.abs(amount);
      stocks[ticker].flows.push({ date, amount: inv });
      if (volume != null) {
        stocks[ticker].openUnits    += volume;
        stocks[ticker].totalBuyUnits += volume;
      }

    } else if (type === "stock sell") {
      if (!ticker) return;
      ensureStock(ticker, name);
      const proceeds = Math.abs(amount);
      stocks[ticker].flows.push({ date, amount: proceeds });
      if (volume != null) stocks[ticker].openUnits -= volume;

    } else if (type.includes("dividend")) {
      if (!ticker) return;
      ensureStock(ticker, name);
      stocks[ticker].flows.push({ date, amount });
      divFlows.push({ date, ticker, amount: Math.abs(amount) });
    }
    // deposits, withdrawals, interest, stamp duty → not relevant for stock P&L
  });
}

/**
 * Closed Positions sheet
 * Columns: instrument | category | ticker | type | volume | open price | open time (utc) |
 *          close price | close time (utc) | product | profit/loss | ... | purchase value | sale value | ...
 *
 * NOTE: We use this sheet only to backfill per-stock flows for stocks that may NOT appear
 * in Cash Operations (shouldn't happen with eToro but keeps things robust).
 * To avoid double-counting with Cash Operations, we track which tickers already have flows.
 */
function parseClosedPositions(rows) {
  rows.forEach((row) => {
    const ticker = (row["ticker"] || "").toString().trim().toUpperCase();
    const name   = (row["instrument"] || ticker).toString().trim();
    if (!ticker || ticker.toLowerCase() === "profit/loss") return;

    const openTime      = parseDate(row["open time (utc)"]  || row["open time"]);
    const closeTime     = parseDate(row["close time (utc)"] || row["close time"]);
    const purchaseValue = parseNum(row["purchase value"]);
    const saleValue     = parseNum(row["sale value"]);

    if (!openTime || !closeTime) return;

    ensureStock(ticker, name);

    // Only add flows from this sheet if the ticker has no Cash Operations flows yet
    // (prevents double-counting)
    if (stocks[ticker].flows.length === 0) {
      if (purchaseValue != null) {
        stocks[ticker].flows.push({ date: openTime,  amount: -Math.abs(purchaseValue) });
        portfolioFlows.push({ date: openTime, amount: -Math.abs(purchaseValue) });
      }
      if (saleValue != null) {
        stocks[ticker].flows.push({ date: closeTime, amount:  Math.abs(saleValue) });
        portfolioFlows.push({ date: closeTime, amount: Math.abs(saleValue) });
      }
    }
  });
}

function ensureStock(ticker, name) {
  if (!stocks[ticker]) {
    stocks[ticker] = { name: name || ticker, flows: [], openUnits: 0, totalBuyUnits: 0, currentPrice: null, currentPriceCcy: null, currentValue: 0 };
  } else if (name && stocks[ticker].name === ticker) {
    stocks[ticker].name = name;
  }
}

// ─── Currency helpers ─────────────────────────────────────────────────────────
let fxRates = {};  // e.g. { USD: 3.85, EUR: 4.20, GBP: 4.85 }  — PLN per 1 unit

/** Returns the native currency code for a Yahoo Finance price of this ticker */
function tickerCurrency(ticker) {
  if (!ticker.includes(".")) return "USD";
  const sfx = ticker.split(".").pop().toUpperCase();
  switch (sfx) {
    case "US": return "USD";
    case "DE": return "EUR";
    case "UK": return "GBp";  // Yahoo BA.L quotes in pence, not pounds
    case "PL": return "PLN";
    default:   return "PLN";
  }
}

async function loadFxRates() {
  // Use stooq forex pairs through same proxy as equity prices — no CORS issues
  const pairs = { USD: "usdpln", EUR: "eurpln", GBP: "gbppln" };
  await Promise.allSettled(
    Object.entries(pairs).map(async ([ccy, stooqSym]) => {
      try {
        const price = await fetchStooqRaw(stooqSym);
        if (price > 0) { fxRates[ccy] = price; }
      } catch { /* use fallback */ }
    })
  );
  // Fallbacks if fetch failed (approximate May 2026)
  if (!fxRates.USD) fxRates.USD = 3.85;
  if (!fxRates.EUR) fxRates.EUR = 4.20;
  if (!fxRates.GBP) fxRates.GBP = 4.85;
}

/** Convert a Yahoo-quoted price to PLN */
function toPLN(priceNative, ticker) {
  const ccy = tickerCurrency(ticker);
  if (ccy === "PLN")  return priceNative;
  if (ccy === "GBp")  return (priceNative / 100) * fxRates.GBP;  // pence → GBP → PLN
  return priceNative * (fxRates[ccy] || 1);
}

// ─── Live prices ──────────────────────────────────────────────────────────────
async function fetchAllLivePrices() {
  const openTickers = Object.entries(stocks)
    .filter(([, s]) => s.openUnits > 0.00001)
    .map(([ticker]) => ticker);

  if (!openTickers.length) {
    detailsEl.textContent = t("noOpenPositions");
    return;
  }

  await loadFxRates();

  const results = await Promise.allSettled(openTickers.map((t) => fetchPrice(t)));
  const today = new Date();
  const log = [];

  results.forEach((res, i) => {
    const ticker = openTickers[i];
    if (res.status === "fulfilled" && res.value != null) {
      const priceNative = res.value;
      const pricePLN    = toPLN(priceNative, ticker);
      const ccy         = tickerCurrency(ticker);
      const valuePLN    = pricePLN * stocks[ticker].openUnits;

      stocks[ticker].currentPrice    = priceNative;
      stocks[ticker].currentPriceCcy = ccy;
      stocks[ticker].currentValue    = valuePLN;
      stocks[ticker].flows.push({ date: today, amount: valuePLN }); // terminal flow for XIRR

      const label = ccy === "GBp" ? "p" : ccy;
      log.push(`${stocks[ticker].name}: ${pricePLN.toFixed(2)} zł`);
    } else {
      log.push(`${stocks[ticker].name}: no price`);
    }
  });

  detailsEl.innerHTML = `<strong>${t("livePricesLabel")}</strong> ${esc(log.join(" | "))}`;
}

/** Map eToro ticker suffix → Yahoo Finance symbol */
function toYahooTicker(ticker) {
  if (!ticker.includes(".")) return ticker;
  const dot  = ticker.lastIndexOf(".");
  const base = ticker.slice(0, dot);
  const sfx  = ticker.slice(dot + 1).toUpperCase();
  switch (sfx) {
    case "US": return base;              // GOOGL.US  → GOOGL
    case "PL": return `${base}.WA`;      // PKO.PL    → PKO.WA
    case "UK": return `${base}.L`;       // BA.UK     → BA.L
    case "DE": return `${base}.DE`;      // XDWH.DE   → XDWH.DE (unchanged)
    default:   return ticker;
  }
}

/**
 * Map eToro ticker suffix → Stooq symbol.
 * Polish stocks on Stooq use bare ticker with NO exchange suffix.
 */
function toStooqSymbol(ticker) {
  const dot = ticker.lastIndexOf(".");
  if (dot === -1) return ticker.toLowerCase();
  const sfx = ticker.slice(dot + 1).toUpperCase();
  if (sfx === "PL") return ticker.slice(0, dot).toLowerCase(); // PKO.PL → pko
  return ticker.toLowerCase(); // GOOGL.US → googl.us, VWCE.DE → vwce.de
}

async function fetchPrice(ticker) {
  // Route Yahoo Finance through corsproxy to avoid CORS block in browser
  try {
    const sym = toYahooTicker(ticker);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
    const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;
    const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const j = await res.json();
      const p = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (p > 0) { return p; }
    }
  } catch { /* fall through to stooq */ }

  // Stooq fallback — use correct exchange-specific symbol format
  return fetchStooqRaw(toStooqSymbol(ticker));
}

/** Fetch a Stooq CSV quote for any symbol (stock or forex pair) via proxy */
async function fetchStooqRaw(sym) {
  const stooqUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(stooqUrl)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(stooqUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(stooqUrl)}`,
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const p = parseStooqCsv(await res.text());
      if (p != null) { return p; }
    } catch { /* try next */ }
  }
  return null;
}

function parseStooqCsv(text) {
  if (!text) return null;
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const parts = lines[1].split(",");
  const close = parts[6];
  if (!close || close.toUpperCase() === "N/D") return null;
  const v = parseFloat(close);
  return Number.isFinite(v) ? v : null;
}

// ─── XIRR ─────────────────────────────────────────────────────────────────────
function xirr(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return NaN;
  const sorted = cashFlows.slice().sort((a, b) => a.date - b.date);
  if (!sorted.some((f) => f.amount < 0)) return NaN;
  if (!sorted.some((f) => f.amount > 0)) return NaN;

  // Suppress XIRR only for same-day or near-same-day flows (mathematically degenerate).
  // Very short holds produce extreme annualised numbers — that is correct and informative.
  const spanDays = (sorted[sorted.length - 1].date - sorted[0].date) / 86400000;
  if (spanDays < 3) return NaN;

  const t0 = sorted[0].date.getTime();
  const yr = (cf) => (cf.date.getTime() - t0) / 86400000 / 365.25;

  const npv  = (r) => sorted.reduce((s, cf) => s + cf.amount / Math.pow(1 + r, yr(cf)), 0);
  const dnpv = (r) => sorted.reduce((s, cf) => {
    const y = yr(cf);
    return y === 0 ? s : s - y * cf.amount / Math.pow(1 + r, y + 1);
  }, 0);

  let rate = 0.1;
  for (let i = 0; i < 200; i++) {
    const f = npv(rate), df = dnpv(rate);
    if (!Number.isFinite(f) || df === 0) break;
    const delta = f / df;
    rate -= delta;
    if (rate < -0.9999) rate = -0.9999;
    if (Math.abs(delta) < 1e-9) return rate * 100;
  }
  return NaN;
}

// ─── Calculations ─────────────────────────────────────────────────────────────
function calcStock(s) {
  const isOpen     = s.openUnits > 0.00001;
  const invested   = s.flows.filter((f) => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);
  const currVal    = s.currentValue; // PLN; 0 if closed or no live price yet

  // Average-cost basis split between open and closed units
  const avgBuy      = s.totalBuyUnits > 0 ? invested / s.totalBuyUnits : 0;
  const unrInvested = avgBuy * Math.max(s.openUnits, 0); // cost of still-held units
  const rlzInvested = invested - unrInvested;              // cost of sold/closed units

  // received = all positive flows EXCEPT the terminal current-value flow
  const received   = s.flows.filter((f) => f.amount > 0).reduce((sum, f) => sum + f.amount, 0) - currVal;

  const rlzPnl     = received - rlzInvested;               // gain/loss on closed units
  const unrPnl     = currVal > 0 ? currVal - unrInvested : (isOpen ? NaN : 0); // NaN if open but no price
  const netPnl     = rlzPnl + (isNaN(unrPnl) ? 0 : unrPnl);
  const returnPct  = invested > 0 ? ((rlzPnl + (isNaN(unrPnl) ? 0 : unrPnl)) / invested) * 100 : NaN;
  const xirrVal    = xirr(s.flows);
  return { isOpen, invested, unrInvested, rlzInvested, received, currVal, rlzPnl, unrPnl, netPnl, returnPct, xirrVal };
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function renderResults() {
  const rows = [];

  Object.entries(stocks).forEach(([ticker, s]) => {
    const c = calcStock(s);
    if (c.invested === 0 && c.received === 0) return;
    rows.push({ ticker, name: s.name, openUnits: s.openUnits,
      currentPrice: s.currentPrice, currentPriceCcy: s.currentPriceCcy, currentValue: s.currentValue, ...c });
  });

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const totInvested  = rows.reduce((s, r) => s + r.invested,    0);
  const totReceived  = rows.reduce((s, r) => s + r.received,    0);
  const totCurrVal   = rows.reduce((s, r) => s + r.currVal,     0);

  // Realized (fully-closed positions)
  const closedRows   = rows.filter(r => !r.isOpen);
  const rlzInvested  = closedRows.reduce((s, r) => s + r.rlzInvested, 0);
  const rlzReceived  = closedRows.reduce((s, r) => s + r.received,    0);
  const rlzPnl       = closedRows.reduce((s, r) => s + r.rlzPnl,      0);
  const rlzReturn    = rlzInvested > 0 ? (rlzPnl / rlzInvested) * 100 : NaN;

  // Unrealized (open positions)
  const openRows     = rows.filter(r => r.isOpen);
  const unrInvested  = openRows.reduce((s, r) => s + r.unrInvested, 0);
  const unrCurrVal   = openRows.reduce((s, r) => s + r.currVal,     0);
  // Only count unrealized P&L for positions that have a live price
  const unrPnl       = openRows.filter(r => !isNaN(r.unrPnl)).reduce((s, r) => s + r.unrPnl, 0);
  const unrInvestedPriced = openRows.filter(r => !isNaN(r.unrPnl)).reduce((s, r) => s + r.unrInvested, 0);
  const unrReturn    = unrInvestedPriced > 0 ? (unrPnl / unrInvestedPriced) * 100 : NaN;

  const totNetPnl    = rlzPnl + unrPnl;
  const totReturn    = totInvested > 0 ? (totNetPnl / totInvested) * 100 : NaN;

  // Portfolio XIRR: rebuilt fresh from stock flows (no deposits) to avoid double-counting
  const pfFlows = Object.values(stocks).flatMap(s => s.flows);
  const pfXirr  = xirr(pfFlows);

  summaryEl.innerHTML = buildSummary({
    totInvested, totReceived, totCurrVal, totNetPnl, totReturn, pfXirr,
    rlzInvested, rlzReceived, rlzPnl, rlzReturn,
    unrInvested, unrCurrVal, unrPnl, unrReturn,
  });
  const summaryData = { totInvested, totReceived, totCurrVal, totNetPnl, totReturn, pfXirr, rlzInvested, rlzReceived, rlzPnl, rlzReturn, unrInvested, unrCurrVal, unrPnl, unrReturn };
  tableEl.innerHTML = buildTable(rows);
  cardListEl.innerHTML = buildCards(rows);
  lastRows           = rows;
  lastRows.__summary = summaryData;
  chartsReady = false;
  if (tabsEl) { tabsEl.hidden = false; showTab("data"); }
  document.body.classList.add("has-results");
}

function buildSummary({ totInvested, totReceived, totCurrVal, totNetPnl, totReturn, pfXirr,
                        rlzInvested, rlzReceived, rlzPnl, rlzReturn,
                        unrInvested, unrCurrVal, unrPnl, unrReturn }) {
  const cc = v => isNaN(v) ? "" : v >= 0 ? "pos" : "neg";
  return `
  <div class="summary-section-label">${t("overall")}</div>
  <div class="summary-grid">
    ${card(t("totalInvested"),    fmtCcy(totInvested),  "")}
    ${card(t("totalReceived"),    fmtCcy(totReceived),  "")}
    ${card(t("openValue"),        fmtCcy(totCurrVal),   "")}
    ${card(t("netPnl"),           fmtCcy(totNetPnl),    cc(totNetPnl))}
    ${card(t("totalReturn"),      fmtPct(totReturn),    cc(totReturn))}
    ${card(t("pfXirr"),           fmtPct(pfXirr),       cc(pfXirr))}
  </div>
  <div class="summary-row-2">
    <div>
      <div class="summary-section-label">${t("openUnrealized")}</div>
      <div class="summary-grid summary-grid-4">
        ${card(t("costBasis"),         fmtCcy(unrInvested), "")}
        ${card(t("currentValue"),      fmtCcy(unrCurrVal),  "")}
        ${card(t("unrealizedPnl"),     fmtCcy(unrPnl),      cc(unrPnl))}
        ${card(t("unrealizedReturn"),  fmtPct(unrReturn),   cc(unrReturn))}
      </div>
    </div>
    <div>
      <div class="summary-section-label">${t("closedRealized")}</div>
      <div class="summary-grid summary-grid-4">
        ${card(t("costBasis"),        fmtCcy(rlzInvested), "")}
        ${card(t("proceeds"),         fmtCcy(rlzReceived),  "")}
        ${card(t("realizedPnl"),      fmtCcy(rlzPnl),      cc(rlzPnl))}
        ${card(t("realizedReturn"),   fmtPct(rlzReturn),   cc(rlzReturn))}
      </div>
    </div>
  </div>
  <button class="reset-btn" onclick="resetUI()">${t("resetBtn")}</button>`;
}

function card(label, value, cls) {
  return `<div class="summary-card ${cls}">
    <span class="label">${label}</span>
    <span class="value">${value}</span>
  </div>`;
}

function resetUI() {
  if (uploadSection) uploadSection.hidden = false;
  document.body.classList.remove("has-results");
  chartInstances.forEach((c) => { try { c.destroy(); } catch {} });
  chartInstances = [];
  lastRows       = null;
  chartsReady    = false;
  if (tabsEl) tabsEl.hidden = true;
  hideLoader();
  chartsEl.innerHTML    = "";
  summaryEl.innerHTML   = "";
  detailsEl.textContent = "";
  tableEl.innerHTML     = "";
  fileInput.value       = "";
}

// ─── Tab switching ─────────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.getElementById("tab-data").hidden   = (name !== "data");
  document.getElementById("tab-charts").hidden = (name !== "charts");
  if (name === "charts") {
    if (!chartsReady && lastRows) { buildCharts(lastRows); chartsReady = true; }
    requestAnimationFrame(() => chartInstances.forEach((c) => c.resize()));
  }
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function buildCharts(rows) {
  if (typeof Chart === "undefined") return;

  chartInstances.forEach((c) => { try { c.destroy(); } catch {} });
  chartInstances = [];
  chartsEl.innerHTML = "";

  const openRows = rows.filter((r) => r.isOpen && r.currVal > 0);
  const evalRows = rows
    .filter((r) => r.isOpen && r.currVal > 0 && !isNaN(r.returnPct))
    .slice()
    .sort((a, b) => b.returnPct - a.returnPct);

  if (!openRows.length && !evalRows.length) return;

  chartsEl.innerHTML = `
    <div class="chart-box chart-box-auto" id="ch-ret-box"><canvas id="ch-ret"></canvas></div>
    <div class="chart-box" id="ch-alloc-box"><canvas id="ch-alloc"></canvas></div>
    <div class="chart-box chart-box-auto" id="ch-cost-box"><canvas id="ch-cost"></canvas></div>
    <div class="chart-box chart-box-auto" id="ch-xirr-box"><canvas id="ch-xirr"></canvas></div>
    <div class="chart-box chart-box-wide" id="ch-waterfall-box"><canvas id="ch-waterfall"></canvas></div>
    <div class="chart-box" id="ch-bubble-box"><canvas id="ch-bubble"></canvas></div>
    <div class="chart-box chart-box-wide" id="ch-cum-box"><canvas id="ch-cum"></canvas></div>
    <div class="chart-box chart-box-wide" id="ch-div-box"><canvas id="ch-div"></canvas></div>`;

  const PALETTE = [
    "#007acc","#28a745","#fd7e14","#6f42c1","#17a2b8",
    "#e83e8c","#ffc107","#20c997","#0f3460","#6c757d",
    "#ff6b6b","#4ecdc4",
  ];

  // ── Donut: portfolio allocation ────────────────────────────────────
  if (openRows.length) {
    const sorted = openRows.slice().sort((a, b) => b.currVal - a.currVal);
    const total  = sorted.reduce((s, r) => s + r.currVal, 0);
    document.getElementById("ch-alloc-box").style.height = "320px";
    chartInstances.push(new Chart(document.getElementById("ch-alloc"), {
      type: "doughnut",
      data: {
        labels: sorted.map((r) => r.name),
        datasets: [{
          data: sorted.map((r) => r.currVal),
          backgroundColor: sorted.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 2,
          borderColor: "#fff",
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { font: { size: 11 }, boxWidth: 14, padding: 10 } },
          title: {
            display: true, text: t("chAllocTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return `  ${fmtCcy(ctx.raw)} PLN  (${pct}%)`;
              },
            },
          },
        },
      },
    }));
  } else {
    document.getElementById("ch-alloc-box").innerHTML =
      `<p class="chart-empty">${t("noAlloc")}</p>`;
  }

  // ── Horizontal bar: return % per stock ───────────────────────────
  if (evalRows.length) {
    const colors = evalRows.map((r) =>
      r.returnPct >= 0 ? "rgba(40,167,69,.8)" : "rgba(220,53,69,.8)"
    );
    const boxH = evalRows.length * 32 + 80;
    document.getElementById("ch-ret-box").style.height = boxH + "px";
    chartInstances.push(new Chart(document.getElementById("ch-ret"), {
      type: "bar",
      data: {
        labels: evalRows.map((r) => r.name),
        datasets: [{
          label: "Return %",
          data: evalRows.map((r) => r.returnPct),
          backgroundColor: colors,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          title: {
            display: true, text: t("chRetTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: { callbacks: { label: (ctx) => `  ${fmtPct(ctx.raw)}` } },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: { callback: (v) => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {minimumFractionDigits:1,maximumFractionDigits:1}) + "%" },
          },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    }));
  } else {
    document.getElementById("ch-ret-box").innerHTML =
      `<p class="chart-empty">${t("noRetData")}</p>`;
  }

  // ── Grouped bar: cost basis vs current value per open position ──────
  const costRows = openRows.slice().sort((a, b) => b.unrInvested - a.unrInvested);
  if (costRows.length) {
    const boxH = costRows.length * 40 + 100;
    document.getElementById("ch-cost-box").style.height = boxH + "px";
    chartInstances.push(new Chart(document.getElementById("ch-cost"), {
      type: "bar",
      data: {
        labels: costRows.map((r) => r.name),
        datasets: [
          {
            label: t("chCostBasis"),
            data: costRows.map((r) => r.unrInvested),
            backgroundColor: "rgba(0,122,204,.65)",
            borderRadius: 3,
          },
          {
            label: t("chCurrVal"),
            data: costRows.map((r) => r.currVal),
            backgroundColor: costRows.map((r) =>
              r.currVal >= r.unrInvested ? "rgba(40,167,69,.75)" : "rgba(220,53,69,.75)"
            ),
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
          title: {
            display: true, text: t("chCostTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `  ${ctx.dataset.label}: ${fmtCcy(ctx.raw)} PLN`,
            },
          },
        },
        scales: {
          x: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { callback: (v) => fmtCcy(v) } },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    }));
  } else {
    document.getElementById("ch-cost-box").innerHTML =
      `<p class="chart-empty">${t("noCostData")}</p>`;
  }

  // ── Line: cumulative invested vs portfolio value over time ──────────
  // Collect all buy flows across all stocks, bucket by month
  const allFlows = Object.values(stocks).flatMap((s) => s.flows);
  const buyFlows = allFlows.filter((f) => f.amount < 0).sort((a, b) => a.date - b.date);

  if (buyFlows.length >= 2) {
    // Build a sorted list of unique months (YYYY-MM)
    const monthKey  = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const allMonths = [];
    const seen      = new Set();
    buyFlows.forEach((f) => {
      const k = monthKey(f.date);
      if (!seen.has(k)) { seen.add(k); allMonths.push(k); }
    });
    // Extend to today
    const todayKey = monthKey(new Date());
    if (!seen.has(todayKey)) allMonths.push(todayKey);

    // Running cumulative invested by month
    let running = 0;
    const investedByMonth = {};
    buyFlows.forEach((f) => { investedByMonth[monthKey(f.date)] = (investedByMonth[monthKey(f.date)] || 0) + Math.abs(f.amount); });

    const cumInvested = [];
    allMonths.forEach((m) => {
      running += investedByMonth[m] || 0;
      cumInvested.push(running);
    });

    // Current total value at last month point
    const totalCurrVal = openRows.reduce((s, r) => s + r.currVal, 0);
    const totalReceived = rows.reduce((s, r) => s + r.received, 0);
    // Approximate portfolio value at each month: scale linearly up to today's known value
    // (We only know exact value today; for prior months use cumulative invested as proxy,
    //  then replace the last point with realised+current for accuracy.)
    const cumValue = cumInvested.map((v, i) => {
      if (i === allMonths.length - 1) return totalCurrVal + totalReceived;
      return v; // placeholder — same as invested (no time-series value data available)
    });
    // Instead: use a simpler honest approach — just show cumulative invested over time,
    // and mark today's total value as a single endpoint annotation.
    const labels = allMonths.map((m) => {
      const [y, mo] = m.split("-");
      return new Date(y, mo - 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    });

    const boxH2 = Math.max(240, allMonths.length * 28 + 80);
    document.getElementById("ch-cum-box").style.height = boxH2 + "px";
    chartInstances.push(new Chart(document.getElementById("ch-cum"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: t("chCumLabel"),
            data: cumInvested,
            borderColor: "#007acc",
            backgroundColor: "rgba(0,122,204,.08)",
            borderWidth: 2,
            pointRadius: 3,
            fill: true,
            tension: 0.3,
          },
          {
            label: t("chCumToday"),
            data: allMonths.map((m, i) => i === allMonths.length - 1 ? (totalCurrVal + totalReceived) : null),
            borderColor: "#28a745",
            backgroundColor: "rgba(40,167,69,.15)",
            borderWidth: 0,
            pointRadius: allMonths.map((_, i) => i === allMonths.length - 1 ? 8 : 0),
            pointBackgroundColor: "#28a745",
            pointStyle: "rectRot",
            fill: false,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } },
          title: {
            display: true, text: t("chCumTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: { callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${fmtCcy(ctx.raw)} PLN` } },
        },
        scales: {
          x: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { callback: (v) => fmtCcy(v) } },
        },
      },
    }));
  } else {
    document.getElementById("ch-cum-box").innerHTML =
      `<p class="chart-empty">${t("noCumData")}</p>`;
  }

  // ── Horizontal bar: XIRR % per stock (all positions with valid XIRR) ────
  const xirrRows = rows
    .filter((r) => !isNaN(r.xirrVal))
    .slice()
    .sort((a, b) => b.xirrVal - a.xirrVal);
  if (xirrRows.length) {
    const boxH = xirrRows.length * 32 + 80;
    document.getElementById("ch-xirr-box").style.height = boxH + "px";
    chartInstances.push(new Chart(document.getElementById("ch-xirr"), {
      type: "bar",
      data: {
        labels: xirrRows.map((r) => r.name),
        datasets: [{
          label: "XIRR %",
          data: xirrRows.map((r) => r.xirrVal),
          backgroundColor: xirrRows.map((r) =>
            r.xirrVal >= 0 ? "rgba(40,167,69,.8)" : "rgba(220,53,69,.8)"
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          title: {
            display: true, text: t("chXirrTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: { callbacks: { label: (ctx) => `  ${fmtPct(ctx.raw)}` } },
        },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: { callback: (v) => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {minimumFractionDigits:1,maximumFractionDigits:1}) + "%" },
          },
          y: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    }));
  } else {
    document.getElementById("ch-xirr-box").innerHTML =
      `<p class="chart-empty">${t("noXirrData")}</p>`;
  }

  // ── Waterfall: net P&L contribution per stock ─────────────────────────
  const wfRows = rows
    .filter((r) => !isNaN(r.netPnl))
    .slice()
    .sort((a, b) => b.netPnl - a.netPnl);
  if (wfRows.length) {
    const wfH = Math.max(280, wfRows.length * 36 + 80);
    document.getElementById("ch-waterfall-box").style.height = wfH + "px";
    let running = 0;
    const floatData = wfRows.map((r) => {
      const start = running;
      running += r.netPnl;
      return r.netPnl >= 0 ? [start, running] : [running, start];
    });
    floatData.push([0, running]); // total bar
    const wfLabels = [...wfRows.map((r) => r.name), "TOTAL"];
    const wfColors = [
      ...wfRows.map((r) => r.netPnl >= 0 ? "rgba(40,167,69,.8)" : "rgba(220,53,69,.8)"),
      running >= 0 ? "rgba(0,122,204,.85)" : "rgba(220,53,69,.85)",
    ];
    chartInstances.push(new Chart(document.getElementById("ch-waterfall"), {
      type: "bar",
      data: {
        labels: wfLabels,
        datasets: [{ label: "Net P&L (PLN)", data: floatData, backgroundColor: wfColors, borderRadius: 3 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true, text: t("chWaterfallTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const [lo, hi] = ctx.raw;
                return `  ${t("chWaterfallTip")}: ${fmtCcy(hi - lo)} PLN`;
              },
            },
          },
        },
        scales: {
          x: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { font: { size: 10 }, maxRotation: 45, autoSkip: false } },
          y: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { callback: (v) => fmtCcy(v) } },
        },
      },
    }));
  } else {
    document.getElementById("ch-waterfall-box").innerHTML =
      `<p class="chart-empty">${t("noWaterfall")}</p>`;
  }

  // ── Bubble: Return % vs XIRR %, bubble size = position value ──────────
  const bubRows = rows.filter((r) =>
    r.isOpen && r.currVal > 0 && !isNaN(r.returnPct) && !isNaN(r.xirrVal)
  );
  if (bubRows.length >= 2) {
    const maxVal = Math.max(...bubRows.map((r) => r.currVal));
    document.getElementById("ch-bubble-box").style.height = "340px";
    chartInstances.push(new Chart(document.getElementById("ch-bubble"), {
      type: "bubble",
      data: {
        datasets: bubRows.map((r, i) => ({
          label: r.name,
          data: [{ x: r.returnPct, y: r.xirrVal, r: Math.max(6, Math.round(Math.sqrt(r.currVal / maxVal) * 28)) }],
          backgroundColor: PALETTE[i % PALETTE.length] + "bb",
          borderColor:      PALETTE[i % PALETTE.length],
          borderWidth: 1,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } },
          title: {
            display: true, text: t("chBubbleTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const r = bubRows[ctx.datasetIndex];
                return [
                  `  ${r.name}`,
                  `  ${t("chBubbleTipReturn")}: ${fmtPct(r.returnPct)}`,
                  `  ${t("chBubbleTipXirr")}:   ${fmtPct(r.xirrVal)}`,
                  `  ${t("chBubbleTipValue")}:  ${fmtCcy(r.currVal)} PLN`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: t("chBubbleX"), font: { size: 11 } },
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: { callback: (v) => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {minimumFractionDigits:1,maximumFractionDigits:1}) + "%" },
          },
          y: {
            title: { display: true, text: t("chBubbleY"), font: { size: 11 } },
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: { callback: (v) => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toLocaleString(lang === "pl" ? "pl-PL" : "en-US", {minimumFractionDigits:1,maximumFractionDigits:1}) + "%" },
          },
        },
      },
    }));
  } else {
    document.getElementById("ch-bubble-box").innerHTML =
      `<p class="chart-empty">${t("noBubble")}</p>`;
  }

  // ── Bar: dividend income by month ───────────────────────────────────
  if (divFlows.length) {
    const monthKey  = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const byMonth   = {};
    divFlows.forEach((d) => { byMonth[monthKey(d.date)] = (byMonth[monthKey(d.date)] || 0) + d.amount; });
    const months    = Object.keys(byMonth).sort();
    const divLabels = months.map((m) => {
      const [y, mo] = m.split("-");
      return new Date(y, mo - 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    });
    const divH = Math.max(200, months.length * 40 + 80);
    document.getElementById("ch-div-box").style.height = divH + "px";
    chartInstances.push(new Chart(document.getElementById("ch-div"), {
      type: "bar",
      data: {
        labels: divLabels,
        datasets: [{
          label: t("chDivTitle").replace(" (PLN)",""),
          data: months.map((m) => byMonth[m]),
          backgroundColor: "rgba(23,162,184,.75)",
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true, text: t("chDivTitle"),
            color: "#0f3460", font: { size: 13, weight: "700" }, padding: { bottom: 12 },
          },
          tooltip: { callbacks: { label: (ctx) => `  ${fmtCcy(ctx.raw)} PLN` } },
        },
        scales: {
          x: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { font: { size: 10 }, maxRotation: 45 } },
          y: { grid: { color: "rgba(0,0,0,.04)" }, ticks: { callback: (v) => fmtCcy(v) } },
        },
      },
    }));
  } else {
    document.getElementById("ch-div-box").innerHTML =
      `<p class="chart-empty">${t("noDividend")}</p>`;
  }
}

function buildCards(rows) {
  if (!rows.length) return `<p class="card-empty">${t("noData")}</p>`;

  const sortGroup = (arr) => arr.slice().sort((a, b) => {
    if (!isNaN(b.returnPct) && !isNaN(a.returnPct)) return b.returnPct - a.returnPct;
    return isNaN(a.returnPct) ? 1 : -1;
  });

  const openRows   = sortGroup(rows.filter(r => r.isOpen));
  const closedRows = sortGroup(rows.filter(r => !r.isOpen));

  const groupHdr = (label, cls, count) =>
    `<div class="card-group-hdr ${cls}">${label} <small>(${count})</small></div>`;

  const makeCard = (r) => {
    const rc  = r.netPnl >= 0 ? "pos" : "neg";
    const xc  = isNaN(r.xirrVal) ? "" : r.xirrVal >= 0 ? "pos" : "neg";
    const avgPrice = r.isOpen && r.openUnits > 0.00001
      ? `${fmtNum(r.unrInvested / r.openUnits, 2)} zł`
      : null;
    const curPrice = r.currVal > 0 && r.openUnits > 0.00001
      ? `${fmtNum(r.currVal / r.openUnits, 2)} zł`
      : (r.isOpen ? `<span class="err">${t("noPrice")}</span>` : "");
    return `<div class="stock-card">
      <div class="card-left">
        <span class="card-name">${esc(r.name)}</span>
        ${avgPrice ? `<span class="card-avg">${t("cardAvg")}: ${avgPrice}</span>` : ""}
      </div>
      <div class="card-right">
        <span class="card-return ${rc}">${fmtPct(r.returnPct)}</span>
        <span class="card-xirr ${xc}">XIRR: ${fmtPct(r.xirrVal)}</span>
        ${curPrice ? `<span class="card-price">${curPrice}</span>` : ""}
      </div>
    </div>`;
  };

  let html = "";
  if (openRows.length) {
    html += groupHdr(t("groupOpen"), "card-ghdr-open", openRows.length);
    html += openRows.map(makeCard).join("");
  }
  if (closedRows.length) {
    html += groupHdr(t("groupClosed"), "card-ghdr-closed", closedRows.length);
    html += closedRows.map(makeCard).join("");
  }
  return html;
}

function buildTable(rows) {
  if (!rows.length) return `<tr><td colspan="12" class="empty">${t("noData")}</td></tr>`;

  const sortGroup = (arr) => arr.slice().sort((a, b) => {
    if (!isNaN(b.returnPct) && !isNaN(a.returnPct)) return b.returnPct - a.returnPct;
    return isNaN(a.returnPct) ? 1 : -1;
  });

  const openRows   = sortGroup(rows.filter(r => r.isOpen));
  const closedRows = sortGroup(rows.filter(r => !r.isOpen));

  const hdr = `<thead><tr>
    <th>${t("colTicker")}</th><th>${t("colName")}</th><th>${t("colUnits")}</th><th>${t("colPrice")}</th>
    <th>${t("colInvested")}</th><th>${t("colReceived")}</th><th>${t("colOpenVal")}</th>
    <th>${t("colUnrlzd")}</th><th>${t("colRlzd")}</th>
    <th>${t("colNetPnl")}</th><th>${t("colReturn")}</th><th>${t("colXirr")}</th>
  </tr></thead>`;

  const groupHdr = (label, cls, count) =>
    `<tr class="group-hdr ${cls}"><td colspan="12">${label} <small>(${count})</small></td></tr>`;

  const makeRow = (r) => {
    const rc = r.netPnl >= 0 ? "pos" : "neg";
    const xc = isNaN(r.xirrVal) ? "" : r.xirrVal >= 0 ? "pos" : "neg";
    const uc = isNaN(r.unrPnl) ? "" : r.unrPnl >= 0 ? "pos" : "neg";
    const lc = r.rlzPnl >= 0 ? "pos" : "neg";
    const priceCell = r.currVal > 0 && r.openUnits > 0.00001
      ? `${fmtNum(r.currVal / r.openUnits, 2)} <small class="ccy">zł</small>`
      : (r.openUnits > 0.00001 ? `<span class="err">${t("noPrice")}</span>` : "—");
    return `<tr>
      <td><code>${esc(r.ticker)}</code></td>
      <td>${esc(r.name)}</td>
      <td>${r.openUnits > 0.00001 ? fmtNum(r.openUnits, 4) : "—"}</td>
      <td>${priceCell}</td>
      <td>${fmtCcy(r.invested)}</td>
      <td>${r.received > 0 ? fmtCcy(r.received) : "—"}</td>
      <td>${r.currVal > 0 ? fmtCcy(r.currVal) : "—"}</td>
      <td class="${uc}">${isNaN(r.unrPnl) ? "—" : fmtCcy(r.unrPnl)}</td>
      <td class="${lc}">${fmtCcy(r.rlzPnl)}</td>
      <td class="${rc}">${fmtCcy(r.netPnl)}</td>
      <td class="${rc}">${fmtPct(r.returnPct)}</td>
      <td class="${xc}">${fmtPct(r.xirrVal)}</td>
    </tr>`;
  };

  let body = "<tbody>";
  if (openRows.length) {
    body += groupHdr(t("groupOpen"), "group-open", openRows.length);
    body += openRows.map(makeRow).join("");
  }
  if (closedRows.length) {
    body += groupHdr(t("groupClosed"), "group-closed", closedRows.length);
    body += closedRows.map(makeRow).join("");
  }
  body += "</tbody>";

  return hdr + body;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function setStatus(msg) { summaryEl.textContent = msg; }
function showLoader(msg) {
  if (loaderMsgEl) loaderMsgEl.textContent = msg;
  if (loaderEl)    loaderEl.hidden = false;
}
function hideLoader() {
  if (loaderEl) loaderEl.hidden = true;
}
function showError(msg)  { summaryEl.innerHTML = `<span class="err">${esc(msg)}</span>`; }

function parseDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  const s = value.toString().trim();
  if (!s) return null;
  const n = Number(s);
  if (!isNaN(n) && s.length <= 8) return new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseNum(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  let s = value.toString().trim().replace(/[^\d.,\-]/g, "");
  if (!s) return null;
  const commas = (s.match(/,/g) || []).length;
  const dots   = (s.match(/\./g) || []).length;
  if (commas > 0 && dots > 0) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (commas > 0) {
    s = s.replace(/,/g, ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function fmtCcy(v) {
  if (v == null || isNaN(v)) return "—";
  const locale = lang === "pl" ? "pl-PL" : "en-US";
  return v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return "—";
  const locale = lang === "pl" ? "pl-PL" : "en-US";
  const abs = Math.abs(v).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v >= 0 ? "+" : "−") + abs + "%";
}

function fmtNum(v, dp = 2) {
  if (v == null || isNaN(v)) return "—";
  const locale = lang === "pl" ? "pl-PL" : "en-US";
  return v.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

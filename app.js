// ==========================================================================
// CryptoPulse Core Application Script
// ==========================================================================

// --- State Definitions ---
const COINS_METADATA = {
    BTC: { id: "bitcoin", name: "Bitcoin", symbol: "BTC", logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png", basePrice: 64250.00, volatility: 0.008 },
    ETH: { id: "ethereum", name: "Ethereum", symbol: "ETH", logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", basePrice: 3480.00, volatility: 0.012 },
    SOL: { id: "solana", name: "Solana", symbol: "SOL", logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png", basePrice: 142.50, volatility: 0.018 },
    LINK: { id: "chainlink", name: "Chainlink", symbol: "LINK", logo: "https://assets.coingecko.com/coins/images/877/small/chainlink.png", basePrice: 14.80, volatility: 0.015 },
    ADA: { id: "cardano", name: "Cardano", symbol: "ADA", logo: "https://assets.coingecko.com/coins/images/975/small/cardano.png", basePrice: 0.38, volatility: 0.014 },
    DOT: { id: "polkadot", name: "Polkadot", symbol: "DOT", logo: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png", basePrice: 5.95, volatility: 0.016 },
    DOGE: { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", logo: "https://assets.coingecko.com/coins/images/325/small/dogecoin.png", basePrice: 0.125, volatility: 0.025 },
    AVAX: { id: "avalanche-2", name: "Avalanche", symbol: "AVAX", logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedColor_TransBg.png", basePrice: 26.30, volatility: 0.020 }
};

let appState = {
    cash: 35000.00, // Starting simulated cash
    holdings: {
        BTC: { amount: 0.15, avgPrice: 62000.00 },
        ETH: { amount: 1.5, avgPrice: 3250.00 },
        SOL: { amount: 20.0, avgPrice: 130.00 }
    },
    watchlist: ["BTC", "ETH", "SOL"],
    transactions: [
        { id: "tx-1", timestamp: Date.now() - 86400000 * 3, type: "BUY", symbol: "BTC", price: 62000.00, amount: 0.15, total: 9300.00, fee: 9.30, status: "SUCCESS" },
        { id: "tx-2", timestamp: Date.now() - 86400000 * 2, type: "BUY", symbol: "ETH", price: 3250.00, amount: 1.5, total: 4875.00, fee: 4.88, status: "SUCCESS" },
        { id: "tx-3", timestamp: Date.now() - 86400000 * 1, type: "BUY", symbol: "SOL", price: 130.00, amount: 20.0, total: 2600.00, fee: 2.60, status: "SUCCESS" }
    ],
    prices: {}, // Will be populated with current prices
    prevPrices: {}, // Stored prices from last tick for visual indicators
    dayStartPrices: {}, // Base prices for 24h change calculation
    activeTab: "dashboard",
    activeChartCoin: "BTC",
    activeChartTimeframe: "7D",
    tradeAction: "buy" // or "sell"
};

// --- Constant Parameters ---
const TRADING_FEE_PCT = 0.001; // 0.1% transaction fee
const TICK_INTERVAL_MS = 3000; // Simulated market price update speed (3 seconds)

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    loadStateFromStorage();
    initializePrices();
    setupNavigation();
    setupTradingForm();
    lucide.createIcons();
    
    // Initial Render
    updateGlobalHeader();
    renderTickerTape();
    populateAssetSelects();
    onTradeCoinChange();
    switchTab(appState.activeTab);
    
    // Set up dynamic simulation tick
    setInterval(simulationTick, TICK_INTERVAL_MS);
});

// --- State Persistence ---
function saveStateToStorage() {
    localStorage.setItem("cryptopulse_state", JSON.stringify({
        cash: appState.cash,
        holdings: appState.holdings,
        watchlist: appState.watchlist,
        transactions: appState.transactions,
        activeChartCoin: appState.activeChartCoin,
        activeChartTimeframe: appState.activeChartTimeframe
    }));
}

function loadStateFromStorage() {
    const saved = localStorage.getItem("cryptopulse_state");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState.cash = parsed.cash ?? appState.cash;
            appState.holdings = parsed.holdings ?? appState.holdings;
            appState.watchlist = parsed.watchlist ?? appState.watchlist;
            appState.transactions = parsed.transactions ?? appState.transactions;
            appState.activeChartCoin = parsed.activeChartCoin ?? appState.activeChartCoin;
            appState.activeChartTimeframe = parsed.activeChartTimeframe ?? appState.activeChartTimeframe;
        } catch (e) {
            console.error("Failed to load localstorage state, starting fresh", e);
        }
    }
}

function initializePrices() {
    Object.keys(COINS_METADATA).forEach(symbol => {
        const metadata = COINS_METADATA[symbol];
        
        // Dynamic starting price within a small offset of baseline
        const startingOffset = (Math.random() - 0.5) * 0.04;
        const currentPrice = metadata.basePrice * (1 + startingOffset);
        
        appState.prices[symbol] = currentPrice;
        appState.prevPrices[symbol] = currentPrice;
        
        // 24h baseline starts around 2% offset to provide realistic initial chart
        appState.dayStartPrices[symbol] = currentPrice * (1 + (Math.random() - 0.48) * 0.05);
    });
}

// --- Navigation SPA ---
function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            const tabName = button.getAttribute("data-tab");
            switchTab(tabName);
        });
    });
}

function switchTab(tabId) {
    appState.activeTab = tabId;
    
    // Update Sidebar CSS
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });
    
    // Update Tab View CSS
    document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.toggle("active", pane.id === tabId);
    });
    
    // Render view-specific elements
    if (tabId === "dashboard") {
        updateDashboardView();
    } else if (tabId === "markets") {
        renderMarketsTable();
    } else if (tabId === "portfolio") {
        renderPortfolioView();
    } else if (tabId === "ledger") {
        renderLedgerTable();
    }
}

// --- Market Price Simulation (Brownian Random Walk) ---
function simulationTick() {
    Object.keys(COINS_METADATA).forEach(symbol => {
        const coin = COINS_METADATA[symbol];
        appState.prevPrices[symbol] = appState.prices[symbol];
        
        // Fluctuations: random factor * volatility, slightly biased upward
        const bias = 0.0003; // Dynamic long term growth bias
        const movement = (Math.random() - 0.49) * coin.volatility + bias;
        
        appState.prices[symbol] = Math.max(0.0001, appState.prices[symbol] * (1 + movement));
    });
    
    // Update elements depending on active view
    updateGlobalHeader();
    updateTickerTapePrices();
    
    if (appState.activeTab === "dashboard") {
        updateDashboardPrices();
    } else if (appState.activeTab === "markets") {
        updateMarketsTablePrices();
    } else if (appState.activeTab === "portfolio") {
        updatePortfolioPrices();
    }
}

// --- Header Stats Render ---
function updateGlobalHeader() {
    const cryptoValue = calculatePortfolioCryptoValue();
    const netWorth = appState.cash + cryptoValue;
    
    // Animate net worth changes smoothly
    const prevNetWorthText = document.getElementById("global-net-worth").innerText;
    const prevNetWorth = parseFloat(prevNetWorthText.replace(/[^0-9.-]+/g, ""));
    
    document.getElementById("global-net-worth").innerText = formatCurrency(netWorth);
    document.getElementById("sidebar-cash-balance").innerText = formatCurrency(appState.cash);
    
    // Calculate P&L relative to initial seed portfolio
    // Initial Seed value: $35,000 Cash + 0.15 BTC * 62000 ($9,300) + 1.5 ETH * 3250 ($4,875) + 20 SOL * 130 ($2,600) = $51,775
    // Let's measure P&L relative to a fixed base investment of $50,000 simulator dollars
    const investedBase = 50000.00;
    const netReturn = netWorth - investedBase;
    const returnPct = (netReturn / investedBase) * 100;
    
    const pnlEl = document.getElementById("global-pnl");
    pnlEl.className = "stat-value " + (netReturn >= 0 ? "positive" : "negative");
    pnlEl.innerText = `${netReturn >= 0 ? "+" : ""}${formatCurrency(netReturn)} (${returnPct.toFixed(2)}%)`;
}

// --- Ticker Tape Slider ---
function renderTickerTape() {
    const container = document.getElementById("ticker-tape");
    container.innerHTML = "";
    
    Object.keys(COINS_METADATA).forEach(symbol => {
        const coin = COINS_METADATA[symbol];
        const tickerEl = document.createElement("div");
        tickerEl.className = "ticker-item";
        tickerEl.id = `ticker-${symbol}`;
        tickerEl.onclick = () => selectCoinForChart(symbol);
        
        tickerEl.innerHTML = `
            <span class="ticker-symbol">${symbol}</span>
            <span class="ticker-price" id="ticker-price-${symbol}">$0.00</span>
            <span class="ticker-change" id="ticker-change-${symbol}">0.00%</span>
        `;
        container.appendChild(tickerEl);
    });
    
    updateTickerTapePrices();
}

function updateTickerTapePrices() {
    Object.keys(COINS_METADATA).forEach(symbol => {
        const currentPrice = appState.prices[symbol];
        const prevPrice = appState.prevPrices[symbol];
        const dayStart = appState.dayStartPrices[symbol];
        
        const priceEl = document.getElementById(`ticker-price-${symbol}`);
        const changeEl = document.getElementById(`ticker-change-${symbol}`);
        const containerEl = document.getElementById(`ticker-${symbol}`);
        
        if (!priceEl || !changeEl) return;
        
        priceEl.innerText = formatCurrency(currentPrice);
        
        const changePct = ((currentPrice - dayStart) / dayStart) * 100;
        changeEl.innerText = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
        changeEl.className = "ticker-change " + (changePct >= 0 ? "positive" : "negative");
        
        // Trigger price flash indicator
        if (currentPrice > prevPrice) {
            flashPriceChange(containerEl, "up");
        } else if (currentPrice < prevPrice) {
            flashPriceChange(containerEl, "down");
        }
    });
}

function flashPriceChange(element, direction) {
    if (!element) return;
    element.classList.remove("tick-up", "tick-down");
    void element.offsetWidth; // Force CSS reflow
    element.classList.add(direction === "up" ? "tick-up" : "tick-down");
}

// --- Dashboard View Management ---
function updateDashboardView() {
    selectCoinForChart(appState.activeChartCoin, true);
    renderDashboardLists();
}

function selectCoinForChart(symbol, forceRefresh = false) {
    if (!COINS_METADATA[symbol]) return;
    
    const wasDifferentCoin = appState.activeChartCoin !== symbol;
    appState.activeChartCoin = symbol;
    saveStateToStorage();
    
    // Style active timeframe buttons
    document.querySelectorAll(".time-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-timeframe") === appState.activeChartTimeframe);
    });
    
    // Bind timeframe triggers
    document.querySelectorAll(".time-btn").forEach(btn => {
        btn.onclick = (e) => {
            appState.activeChartTimeframe = e.target.getAttribute("data-timeframe");
            saveStateToStorage();
            selectCoinForChart(appState.activeChartCoin, true);
        };
    });
    
    // Update Header Metadata
    const coin = COINS_METADATA[symbol];
    document.getElementById("chart-coin-icon").src = coin.logo;
    document.getElementById("chart-coin-name").innerText = coin.name;
    document.getElementById("chart-coin-symbol").innerText = `${symbol}/USD`;
    
    updateDashboardPrices();
    
    // Render dynamic Chart.js
    if (typeof renderMainPriceChart === "function") {
        renderMainPriceChart(symbol, appState.activeChartTimeframe, forceRefresh || wasDifferentCoin);
    }
}

function updateDashboardPrices() {
    const symbol = appState.activeChartCoin;
    const currentPrice = appState.prices[symbol];
    const dayStart = appState.dayStartPrices[symbol];
    const changePct = ((currentPrice - dayStart) / dayStart) * 100;
    
    const priceEl = document.getElementById("chart-coin-price");
    const changeEl = document.getElementById("chart-coin-change");
    
    if (priceEl && changeEl) {
        priceEl.innerText = formatCurrency(currentPrice);
        changeEl.innerText = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
        changeEl.className = "chart-change " + (changePct >= 0 ? "positive" : "negative");
    }
    
    // Update trade form estimates in real-time
    calculateEstimates();
}

function renderDashboardLists() {
    // 1. Markets Mini List (Filtered to non-watchlist/all coins up to 4 items)
    const miniListContainer = document.getElementById("dashboard-mini-list");
    miniListContainer.innerHTML = "";
    
    const symbols = Object.keys(COINS_METADATA).slice(0, 4);
    symbols.forEach(symbol => {
        const coin = COINS_METADATA[symbol];
        const currentPrice = appState.prices[symbol];
        const dayStart = appState.dayStartPrices[symbol];
        const changePct = ((currentPrice - dayStart) / dayStart) * 100;
        
        const row = document.createElement("div");
        row.className = "mini-coin-row";
        row.onclick = () => selectCoinForChart(symbol);
        row.innerHTML = `
            <div class="coin-meta">
                <img src="${coin.logo}" alt="${coin.name}">
                <div>
                    <span class="coin-title">${coin.name}</span>
                    <span class="coin-subtitle">${symbol}</span>
                </div>
            </div>
            <div class="coin-price-block">
                <span class="coin-price-val">${formatCurrency(currentPrice)}</span>
                <span class="coin-price-chg ${changePct >= 0 ? 'positive' : 'negative'}">${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%</span>
            </div>
        `;
        miniListContainer.appendChild(row);
    });
    
    // 2. Watchlist List
    renderDashboardWatchlist();
}

function renderDashboardWatchlist() {
    const listContainer = document.getElementById("dashboard-watchlist-list");
    listContainer.innerHTML = "";
    
    if (appState.watchlist.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-notice">
                <i data-lucide="star-off"></i>
                <span>Your watchlist is empty. Mark stars in the Markets tab!</span>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    appState.watchlist.forEach(symbol => {
        const coin = COINS_METADATA[symbol];
        const currentPrice = appState.prices[symbol];
        const dayStart = appState.dayStartPrices[symbol];
        const changePct = ((currentPrice - dayStart) / dayStart) * 100;
        
        const row = document.createElement("div");
        row.className = "mini-coin-row";
        row.onclick = () => selectCoinForChart(symbol);
        row.innerHTML = `
            <div class="coin-meta">
                <img src="${coin.logo}" alt="${coin.name}">
                <div>
                    <span class="coin-title">${coin.name}</span>
                    <span class="coin-subtitle">${symbol}</span>
                </div>
            </div>
            <div class="coin-price-block">
                <span class="coin-price-val">${formatCurrency(currentPrice)}</span>
                <span class="coin-price-chg ${changePct >= 0 ? 'positive' : 'negative'}">${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%</span>
            </div>
        `;
        listContainer.appendChild(row);
    });
}

// --- Trading Module Panel ---
function setupTradingForm() {
    // Populate select element
    const selectEl = document.getElementById("trade-coin-select");
    selectEl.innerHTML = "";
    Object.keys(COINS_METADATA).forEach(symbol => {
        const coin = COINS_METADATA[symbol];
        const opt = document.createElement("option");
        opt.value = symbol;
        opt.innerText = `${coin.name} (${symbol})`;
        selectEl.appendChild(opt);
    });
}

function populateAssetSelects() {
    const select = document.getElementById("trade-coin-select");
    select.value = appState.activeChartCoin;
}

function setTradeAction(action) {
    appState.tradeAction = action;
    
    const buyBtn = document.getElementById("trade-buy-tab");
    const sellBtn = document.getElementById("trade-sell-tab");
    const executeBtn = document.getElementById("execute-trade-btn");
    const amountLabel = document.getElementById("amount-label");
    const currencySuffix = document.getElementById("trade-currency-suffix");
    
    buyBtn.classList.toggle("active", action === "buy");
    sellBtn.classList.toggle("active", action === "sell");
    
    if (action === "buy") {
        executeBtn.className = "btn btn-primary btn-block";
        executeBtn.innerText = `Buy ${appState.activeChartCoin}`;
        amountLabel.innerText = "Amount (USD)";
        currencySuffix.innerText = "USD";
    } else {
        executeBtn.className = "btn btn-danger btn-block";
        executeBtn.innerText = `Sell ${appState.activeChartCoin}`;
        amountLabel.innerText = `Amount (${appState.activeChartCoin})`;
        currencySuffix.innerText = appState.activeChartCoin;
    }
    
    // Clear amounts
    document.getElementById("trade-amount").value = "";
    calculateEstimates();
}

function onTradeCoinChange() {
    const select = document.getElementById("trade-coin-select");
    const symbol = select.value;
    
    selectCoinForChart(symbol);
    setTradeAction(appState.tradeAction);
}

function setTradePercentage(pct) {
    const symbol = appState.activeChartCoin;
    const amountInput = document.getElementById("trade-amount");
    
    if (appState.tradeAction === "buy") {
        // Calculate max buying power accounting for 0.1% fees
        // purchase + fee = cash  => purchase + (0.001 * purchase) = cash => purchase * 1.001 = cash
        const maxPurchase = appState.cash / (1 + TRADING_FEE_PCT);
        const amount = maxPurchase * (pct / 100);
        amountInput.value = amount.toFixed(2);
    } else {
        // Sell percentage of owned crypto
        const owned = appState.holdings[symbol]?.amount || 0;
        const amount = owned * (pct / 100);
        amountInput.value = amount.toFixed(8);
    }
    calculateEstimates();
}

function calculateEstimates() {
    const symbol = appState.activeChartCoin;
    const currentPrice = appState.prices[symbol];
    const amountVal = parseFloat(document.getElementById("trade-amount").value) || 0;
    
    const estPriceEl = document.getElementById("est-coin-price");
    const estQtyEl = document.getElementById("est-quantity");
    const estFeeEl = document.getElementById("est-fee");
    const estTotalEl = document.getElementById("est-total");
    const estTotalLabel = document.getElementById("est-total-label");
    
    estPriceEl.innerText = formatCurrency(currentPrice);
    
    if (appState.tradeAction === "buy") {
        // Buying using USD
        const fee = amountVal * TRADING_FEE_PCT;
        const purchaseVal = amountVal - fee;
        const qty = purchaseVal / currentPrice;
        
        estQtyEl.innerText = qty.toFixed(8);
        estFeeEl.innerText = formatCurrency(fee);
        estTotalLabel.innerText = "Total Cost (inc. fee)";
        estTotalEl.innerText = formatCurrency(amountVal);
    } else {
        // Selling using crypto quantity
        const totalValue = amountVal * currentPrice;
        const fee = totalValue * TRADING_FEE_PCT;
        const netProceeds = totalValue - fee;
        
        estQtyEl.innerText = amountVal.toFixed(8);
        estFeeEl.innerText = formatCurrency(fee);
        estTotalLabel.innerText = "Estimated Proceeds";
        estTotalEl.innerText = formatCurrency(netProceeds);
    }
}

function executeTrade(event) {
    event.preventDefault();
    const symbol = appState.activeChartCoin;
    const currentPrice = appState.prices[symbol];
    const amountVal = parseFloat(document.getElementById("trade-amount").value);
    
    if (isNaN(amountVal) || amountVal <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
    }
    
    if (appState.tradeAction === "buy") {
        const totalCost = amountVal; // inclusive of fee
        const fee = totalCost * TRADING_FEE_PCT;
        const netPurchaseUsd = totalCost - fee;
        const qty = netPurchaseUsd / currentPrice;
        
        if (totalCost > appState.cash) {
            showToast(`Insufficient cash. Required: ${formatCurrency(totalCost)}. Available: ${formatCurrency(appState.cash)}`, "error");
            return;
        }
        
        // Execute Buy
        appState.cash -= totalCost;
        if (!appState.holdings[symbol]) {
            appState.holdings[symbol] = { amount: 0, avgPrice: 0 };
        }
        
        const oldQty = appState.holdings[symbol].amount;
        const oldAvg = appState.holdings[symbol].avgPrice;
        const newQty = oldQty + qty;
        const newAvg = ((oldQty * oldAvg) + (qty * currentPrice)) / newQty;
        
        appState.holdings[symbol].amount = newQty;
        appState.holdings[symbol].avgPrice = newAvg;
        
        // Log transaction
        logTransaction("BUY", symbol, currentPrice, qty, totalCost, fee);
        showToast(`Successfully purchased ${qty.toFixed(6)} ${symbol}!`, "success");
        
    } else {
        // Execute Sell
        const cryptoToSell = amountVal;
        const owned = appState.holdings[symbol]?.amount || 0;
        
        if (cryptoToSell > owned) {
            showToast(`Insufficient asset balance. Trying to sell: ${cryptoToSell.toFixed(6)} ${symbol}. Owned: ${owned.toFixed(6)} ${symbol}`, "error");
            return;
        }
        
        const totalValue = cryptoToSell * currentPrice;
        const fee = totalValue * TRADING_FEE_PCT;
        const netProceeds = totalValue - fee;
        
        appState.cash += netProceeds;
        appState.holdings[symbol].amount -= cryptoToSell;
        
        // Clean up empty holding
        if (appState.holdings[symbol].amount <= 0.00000001) {
            delete appState.holdings[symbol];
        }
        
        // Log transaction
        logTransaction("SELL", symbol, currentPrice, cryptoToSell, netProceeds, fee);
        showToast(`Successfully sold ${cryptoToSell.toFixed(6)} ${symbol} for ${formatCurrency(netProceeds)}!`, "success");
    }
    
    // Reset Form
    document.getElementById("trade-amount").value = "";
    saveStateToStorage();
    updateGlobalHeader();
    renderDashboardLists();
    
    // Redraw allocation chart if loaded
    if (appState.activeTab === "portfolio") {
        renderPortfolioView();
    }
}

// --- Transaction History ---
function logTransaction(type, symbol, price, amount, total, fee) {
    const tx = {
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        type,
        symbol,
        price,
        amount,
        total,
        fee,
        status: "SUCCESS"
    };
    appState.transactions.unshift(tx);
}

// --- Markets Tab View ---
let marketSearchQuery = "";
let marketFilterMode = "all"; // "all" or "watchlist"

function filterMarkets(mode) {
    marketFilterMode = mode;
    document.getElementById("market-filter-all").classList.toggle("active", mode === "all");
    document.getElementById("market-filter-watchlist").classList.toggle("active", mode === "watchlist");
    renderMarketsTable();
}

function renderMarketsTable() {
    const tbody = document.getElementById("markets-table-body");
    tbody.innerHTML = "";
    
    const query = document.getElementById("market-search").value.toLowerCase();
    
    let filteredSymbols = Object.keys(COINS_METADATA).filter(symbol => {
        const coin = COINS_METADATA[symbol];
        const matchesQuery = coin.name.toLowerCase().includes(query) || symbol.toLowerCase().includes(query);
        
        if (marketFilterMode === "watchlist") {
            return matchesQuery && appState.watchlist.includes(symbol);
        }
        return matchesQuery;
    });
    
    if (filteredSymbols.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-notice">
                    <i data-lucide="search-code" style="width:36px; height:36px;"></i>
                    <span>No cryptocurrencies match your query.</span>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    filteredSymbols.forEach((symbol, index) => {
        const coin = COINS_METADATA[symbol];
        const price = appState.prices[symbol];
        const dayStart = appState.dayStartPrices[symbol];
        const changePct = ((price - dayStart) / dayStart) * 100;
        const isWatched = appState.watchlist.includes(symbol);
        
        // Mock 24h High/Low
        const high = Math.max(price, dayStart) * 1.015;
        const low = Math.min(price, dayStart) * 0.985;
        
        const row = document.createElement("tr");
        row.id = `market-row-${symbol}`;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="table-coin-cell" style="cursor:pointer;" onclick="switchTab('dashboard'); selectCoinForChart('${symbol}');">
                    <img src="${coin.logo}" alt="${coin.name}">
                    <div>
                        <strong style="display:block;">${coin.name}</strong>
                        <span class="table-coin-symbol">${symbol}</span>
                    </div>
                </div>
            </td>
            <td class="font-semibold" id="table-price-${symbol}">${formatCurrency(price)}</td>
            <td class="align-right font-semibold ${changePct >= 0 ? 'positive' : 'negative'}" id="table-change-${symbol}">
                ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%
            </td>
            <td class="align-right text-muted" style="font-size:0.8rem;">
                ${formatCurrency(high)} / ${formatCurrency(low)}
            </td>
            <td>
                <canvas class="sparkline-canvas" id="sparkline-${symbol}"></canvas>
            </td>
            <td class="action-cell">
                <button class="btn-icon ${isWatched ? 'active' : ''}" onclick="toggleWatchlist('${symbol}', event)">
                    <i data-lucide="star"></i>
                </button>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openTradeModal('${symbol}')">
                    Trade
                </button>
            </td>
        `;
        tbody.appendChild(row);
        
        // Draw sparkline canvas
        renderSparkline(symbol);
    });
    
    lucide.createIcons();
}

function updateMarketsTablePrices() {
    Object.keys(COINS_METADATA).forEach(symbol => {
        const rowEl = document.getElementById(`market-row-${symbol}`);
        if (!rowEl) return;
        
        const priceEl = document.getElementById(`table-price-${symbol}`);
        const changeEl = document.getElementById(`table-change-${symbol}`);
        
        const currentPrice = appState.prices[symbol];
        const prevPrice = appState.prevPrices[symbol];
        const dayStart = appState.dayStartPrices[symbol];
        const changePct = ((currentPrice - dayStart) / dayStart) * 100;
        
        if (priceEl && changeEl) {
            priceEl.innerText = formatCurrency(currentPrice);
            changeEl.innerText = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`;
            changeEl.className = "align-right font-semibold " + (changePct >= 0 ? 'positive' : 'negative');
        }
        
        // Flash animation
        if (currentPrice > prevPrice) {
            flashPriceChange(rowEl, "up");
        } else if (currentPrice < prevPrice) {
            flashPriceChange(rowEl, "down");
        }
    });
}

function toggleWatchlist(symbol, event) {
    event.stopPropagation();
    const idx = appState.watchlist.indexOf(symbol);
    if (idx > -1) {
        appState.watchlist.splice(idx, 1);
        showToast(`Removed ${symbol} from Watchlist`, "info");
    } else {
        appState.watchlist.push(symbol);
        showToast(`Added ${symbol} to Watchlist`, "success");
    }
    saveStateToStorage();
    renderMarketsTable();
}

function renderSparkline(symbol) {
    const canvas = document.getElementById(`sparkline-${symbol}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = canvas.width = 100;
    const height = canvas.height = 36;
    
    // Generate static historical path based on seed
    let seedValue = 0;
    const points = [];
    const pointsCount = 10;
    
    // Seed hash based on coin symbol letters
    for(let i=0; i<symbol.length; i++) {
        seedValue += symbol.charCodeAt(i);
    }
    
    for (let i = 0; i < pointsCount; i++) {
        const rnd = Math.sin(seedValue + i * 1.5) * Math.cos(seedValue - i * 0.8);
        points.push(rnd);
    }
    
    // Scale and Plot
    const maxVal = Math.max(...points);
    const minVal = Math.min(...points);
    const range = maxVal - minVal || 1;
    
    const color = appState.prices[symbol] >= appState.dayStartPrices[symbol] ? '#10b981' : '#ef4444';
    
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    points.forEach((val, idx) => {
        const x = (idx / (pointsCount - 1)) * width;
        const y = height - 4 - ((val - minVal) / range) * (height - 8);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Gradient shading under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + '20');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.fill();
}

// --- Portfolio View Layout ---
function renderPortfolioView() {
    const tbody = document.getElementById("holdings-table-body");
    tbody.innerHTML = "";
    
    const holdingSymbols = Object.keys(appState.holdings);
    
    if (holdingSymbols.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-notice">
                    <i data-lucide="folder-open" style="width:36px; height:36px;"></i>
                    <span>You don't hold any simulated crypto assets. Open the dashboard to buy!</span>
                </td>
            </tr>
        `;
        document.getElementById("no-assets-message").style.display = "flex";
        if (document.getElementById("allocationChart")) {
            document.getElementById("allocationChart").style.display = "none";
        }
        updatePortfolioStats();
        lucide.createIcons();
        return;
    }
    
    document.getElementById("no-assets-message").style.display = "none";
    if (document.getElementById("allocationChart")) {
        document.getElementById("allocationChart").style.display = "block";
    }
    
    holdingSymbols.forEach(symbol => {
        const holding = appState.holdings[symbol];
        const coin = COINS_METADATA[symbol];
        const currentPrice = appState.prices[symbol];
        const currentValue = holding.amount * currentPrice;
        const costBasis = holding.amount * holding.avgPrice;
        const pnl = currentValue - costBasis;
        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>
                <div class="table-coin-cell">
                    <img src="${coin.logo}" alt="${coin.name}">
                    <div>
                        <strong style="display:block;">${coin.name}</strong>
                        <span class="table-coin-symbol">${symbol}</span>
                    </div>
                </div>
            </td>
            <td class="align-right font-semibold">${holding.amount.toFixed(6)} ${symbol}</td>
            <td class="align-right text-muted">${formatCurrency(holding.avgPrice)}</td>
            <td class="align-right font-semibold" id="portfolio-price-${symbol}">${formatCurrency(currentPrice)}</td>
            <td class="align-right font-semibold" id="portfolio-value-${symbol}">${formatCurrency(currentValue)}</td>
            <td class="align-right font-semibold ${pnl >= 0 ? 'positive' : 'negative'}" id="portfolio-pnl-${symbol}">
                ${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)} (${pnlPct.toFixed(2)}%)
            </td>
            <td class="action-cell">
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openTradeModal('${symbol}')">
                    Trade
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePortfolioStats();
    
    // Draw allocation doughnut
    if (typeof renderAllocationChart === "function") {
        renderAllocationChart();
    }
}

function updatePortfolioStats() {
    const cryptoValue = calculatePortfolioCryptoValue();
    const netWorth = appState.cash + cryptoValue;
    const investedBase = 50000.00;
    
    const pnl = netWorth - investedBase;
    const pnlPct = (pnl / investedBase) * 100;
    
    document.getElementById("portfolio-asset-value").innerText = formatCurrency(cryptoValue);
    document.getElementById("portfolio-invested").innerText = formatCurrency(investedBase);
    
    const pnlValEl = document.getElementById("portfolio-net-pnl");
    const pnlPctEl = document.getElementById("portfolio-pnl-percentage");
    const pnlIconEl = document.getElementById("portfolio-pnl-icon");
    
    pnlValEl.innerText = `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}`;
    pnlValEl.className = pnl >= 0 ? "positive" : "negative";
    pnlPctEl.innerText = `${pnlPct.toFixed(2)}% Overall ROI`;
    
    if (pnlIconEl) {
        pnlIconEl.className = "stat-card-icon " + (pnl >= 0 ? "positive" : "negative");
        pnlIconEl.innerHTML = pnl >= 0 ? '<i data-lucide="arrow-up-right"></i>' : '<i data-lucide="arrow-down-left"></i>';
    }
    lucide.createIcons();
}

function updatePortfolioPrices() {
    Object.keys(appState.holdings).forEach(symbol => {
        const holding = appState.holdings[symbol];
        const currentPrice = appState.prices[symbol];
        const currentValue = holding.amount * currentPrice;
        const costBasis = holding.amount * holding.avgPrice;
        const pnl = currentValue - costBasis;
        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
        
        const priceEl = document.getElementById(`portfolio-price-${symbol}`);
        const valueEl = document.getElementById(`portfolio-value-${symbol}`);
        const pnlEl = document.getElementById(`portfolio-pnl-${symbol}`);
        
        if (priceEl && valueEl && pnlEl) {
            priceEl.innerText = formatCurrency(currentPrice);
            valueEl.innerText = formatCurrency(currentValue);
            pnlEl.innerText = `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)} (${pnlPct.toFixed(2)}%)`;
            pnlEl.className = "align-right font-semibold " + (pnl >= 0 ? "positive" : "negative");
        }
    });
    
    updatePortfolioStats();
}

function calculatePortfolioCryptoValue() {
    let total = 0;
    Object.keys(appState.holdings).forEach(symbol => {
        const price = appState.prices[symbol] || 0;
        const amount = appState.holdings[symbol].amount || 0;
        total += price * amount;
    });
    return total;
}

// --- Ledger Transaction History Tab ---
function renderLedgerTable() {
    const tbody = document.getElementById("ledger-table-body");
    tbody.innerHTML = "";
    
    if (appState.transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-notice">
                    <i data-lucide="history" style="width:36px; height:36px;"></i>
                    <span>No transaction history. Complete a purchase on the Dashboard!</span>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    appState.transactions.forEach(tx => {
        const row = document.createElement("tr");
        const date = new Date(tx.timestamp).toLocaleString();
        
        row.innerHTML = `
            <td>${date}</td>
            <td>
                <span class="badge" style="background:${tx.type === 'BUY' ? 'var(--bg-success-fade)' : 'var(--bg-danger-fade)'}; color:${tx.type === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'};">
                    ${tx.type}
                </span>
            </td>
            <td><strong>${tx.symbol}</strong></td>
            <td class="align-right font-semibold">${formatCurrency(tx.price)}</td>
            <td class="align-right">${tx.amount.toFixed(6)}</td>
            <td class="align-right font-semibold">${formatCurrency(tx.total)}</td>
            <td class="align-right text-muted">${formatCurrency(tx.fee)}</td>
            <td>
                <span class="status-badge success">
                    ${tx.status}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function confirmResetPortfolio() {
    if (confirm("Are you sure you want to reset the simulation? This will restore your cash balance to $50,000 USD and wipe all position history.")) {
        appState.cash = 50000.00;
        appState.holdings = {};
        appState.transactions = [];
        appState.watchlist = ["BTC", "ETH", "SOL"];
        saveStateToStorage();
        showToast("Simulation database reset completed.", "info");
        switchTab("dashboard");
    }
}

// --- Modal Interactive Trading System ---
let modalActiveCoin = "";
let modalTradeAction = "buy";

function openTradeModal(symbol) {
    if (!COINS_METADATA[symbol]) return;
    
    modalActiveCoin = symbol;
    modalTradeAction = "buy";
    
    // Update headers
    const coin = COINS_METADATA[symbol];
    document.getElementById("modal-coin-logo").src = coin.logo;
    document.getElementById("modal-coin-name").innerText = coin.name;
    document.getElementById("modal-coin-price").innerText = formatCurrency(appState.prices[symbol]);
    
    // Set up tabs
    setModalTradeAction("buy");
    
    // Open Overlay
    const overlay = document.getElementById("trade-modal");
    overlay.classList.add("active");
}

function closeTradeModal() {
    const overlay = document.getElementById("trade-modal");
    overlay.classList.remove("active");
}

function setModalTradeAction(action) {
    modalTradeAction = action;
    
    const buyBtn = document.getElementById("modal-buy-tab");
    const sellBtn = document.getElementById("modal-sell-tab");
    const executeBtn = document.getElementById("modal-execute-btn");
    const amountLabel = document.getElementById("modal-amount-label");
    const currencySuffix = document.getElementById("modal-currency-suffix");
    
    buyBtn.classList.toggle("active", action === "buy");
    sellBtn.classList.toggle("active", action === "sell");
    
    const symbol = modalActiveCoin;
    const owned = appState.holdings[symbol]?.amount || 0;
    
    document.getElementById("modal-cash-balance").innerText = formatCurrency(appState.cash);
    document.getElementById("modal-coin-balance").innerText = `${owned.toFixed(6)} ${symbol}`;
    
    if (action === "buy") {
        executeBtn.className = "btn btn-primary btn-block";
        executeBtn.innerText = `Buy ${symbol}`;
        amountLabel.innerText = "Amount (USD)";
        currencySuffix.innerText = "USD";
    } else {
        executeBtn.className = "btn btn-danger btn-block";
        executeBtn.innerText = `Sell ${symbol}`;
        amountLabel.innerText = `Amount (${symbol})`;
        currencySuffix.innerText = symbol;
    }
    
    document.getElementById("modal-trade-amount").value = "";
    calculateModalEstimates();
}

function setModalTradePercentage(pct) {
    const symbol = modalActiveCoin;
    const amountInput = document.getElementById("modal-trade-amount");
    
    if (modalTradeAction === "buy") {
        const maxPurchase = appState.cash / (1 + TRADING_FEE_PCT);
        const amount = maxPurchase * (pct / 100);
        amountInput.value = amount.toFixed(2);
    } else {
        const owned = appState.holdings[symbol]?.amount || 0;
        const amount = owned * (pct / 100);
        amountInput.value = amount.toFixed(8);
    }
    calculateModalEstimates();
}

function calculateModalEstimates() {
    const symbol = modalActiveCoin;
    const currentPrice = appState.prices[symbol];
    const amountVal = parseFloat(document.getElementById("modal-trade-amount").value) || 0;
    
    const estQtyEl = document.getElementById("modal-est-quantity");
    const estFeeEl = document.getElementById("modal-est-fee");
    const estTotalEl = document.getElementById("modal-est-total");
    const estTotalLabel = document.getElementById("modal-est-total-label");
    
    if (modalTradeAction === "buy") {
        const fee = amountVal * TRADING_FEE_PCT;
        const purchaseVal = amountVal - fee;
        const qty = purchaseVal / currentPrice;
        
        estQtyEl.innerText = qty.toFixed(8);
        estFeeEl.innerText = formatCurrency(fee);
        estTotalLabel.innerText = "Total Cost (inc. fee)";
        estTotalEl.innerText = formatCurrency(amountVal);
    } else {
        const totalValue = amountVal * currentPrice;
        const fee = totalValue * TRADING_FEE_PCT;
        const netProceeds = totalValue - fee;
        
        estQtyEl.innerText = amountVal.toFixed(8);
        estFeeEl.innerText = formatCurrency(fee);
        estTotalLabel.innerText = "Estimated Proceeds";
        estTotalEl.innerText = formatCurrency(netProceeds);
    }
}

function executeModalTrade(event) {
    event.preventDefault();
    const symbol = modalActiveCoin;
    const currentPrice = appState.prices[symbol];
    const amountVal = parseFloat(document.getElementById("modal-trade-amount").value);
    
    if (isNaN(amountVal) || amountVal <= 0) {
        showToast("Please enter a valid amount", "error");
        return;
    }
    
    if (modalTradeAction === "buy") {
        const totalCost = amountVal;
        const fee = totalCost * TRADING_FEE_PCT;
        const netPurchaseUsd = totalCost - fee;
        const qty = netPurchaseUsd / currentPrice;
        
        if (totalCost > appState.cash) {
            showToast(`Insufficient cash. Required: ${formatCurrency(totalCost)}. Available: ${formatCurrency(appState.cash)}`, "error");
            return;
        }
        
        appState.cash -= totalCost;
        if (!appState.holdings[symbol]) {
            appState.holdings[symbol] = { amount: 0, avgPrice: 0 };
        }
        
        const oldQty = appState.holdings[symbol].amount;
        const oldAvg = appState.holdings[symbol].avgPrice;
        const newQty = oldQty + qty;
        const newAvg = ((oldQty * oldAvg) + (qty * currentPrice)) / newQty;
        
        appState.holdings[symbol].amount = newQty;
        appState.holdings[symbol].avgPrice = newAvg;
        
        logTransaction("BUY", symbol, currentPrice, qty, totalCost, fee);
        showToast(`Successfully purchased ${qty.toFixed(6)} ${symbol}!`, "success");
        
    } else {
        const cryptoToSell = amountVal;
        const owned = appState.holdings[symbol]?.amount || 0;
        
        if (cryptoToSell > owned) {
            showToast(`Insufficient asset balance. Trying to sell: ${cryptoToSell.toFixed(6)} ${symbol}. Owned: ${owned.toFixed(6)} ${symbol}`, "error");
            return;
        }
        
        const totalValue = cryptoToSell * currentPrice;
        const fee = totalValue * TRADING_FEE_PCT;
        const netProceeds = totalValue - fee;
        
        appState.cash += netProceeds;
        appState.holdings[symbol].amount -= cryptoToSell;
        
        if (appState.holdings[symbol].amount <= 0.00000001) {
            delete appState.holdings[symbol];
        }
        
        logTransaction("SELL", symbol, currentPrice, cryptoToSell, netProceeds, fee);
        showToast(`Successfully sold ${cryptoToSell.toFixed(6)} ${symbol} for ${formatCurrency(netProceeds)}!`, "success");
    }
    
    closeTradeModal();
    saveStateToStorage();
    updateGlobalHeader();
    
    // Refresh page components
    if (appState.activeTab === "dashboard") {
        updateDashboardView();
    } else if (appState.activeTab === "markets") {
        renderMarketsTable();
    } else if (appState.activeTab === "portfolio") {
        renderPortfolioView();
    } else if (appState.activeTab === "ledger") {
        renderLedgerTable();
    }
}

// --- Toast Alerts Notification Manager ---
function showToast(message, type = "success") {
    const container = document.getElementById("notifications-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "check-circle";
    if (type === "error") icon = "alert-circle";
    if (type === "info") icon = "info";
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    
    // Automatically delete after 4 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3700);
}

// --- Utility Formatters ---
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

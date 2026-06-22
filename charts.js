// ==========================================================================
// CryptoPulse Charting Engine (Chart.js Integration)
// ==========================================================================

let mainPriceChartInstance = null;
let allocationChartInstance = null;

// Color mapper for cryptocurrencies
const ASSET_COLORS = {
    BTC: { border: "#f7931a", fill: "rgba(247, 147, 26, 0.15)" },
    ETH: { border: "#627eea", fill: "rgba(98, 126, 234, 0.15)" },
    SOL: { border: "#14f195", fill: "rgba(20, 241, 149, 0.15)" },
    LINK: { border: "#375bd2", fill: "rgba(55, 91, 210, 0.15)" },
    ADA: { border: "#0033ad", fill: "rgba(0, 51, 173, 0.15)" },
    DOT: { border: "#e6007a", fill: "rgba(230, 0, 122, 0.15)" },
    DOGE: { border: "#c2a633", fill: "rgba(194, 166, 51, 0.15)" },
    AVAX: { border: "#e84142", fill: "rgba(232, 65, 66, 0.15)" },
    CASH: { border: "#8e8a9f", fill: "rgba(142, 138, 159, 0.15)" }
};

// --- Historical Data Generator (Symmetric Random Walk) ---
function generateHistoricalPriceData(currentPrice, timeframe, symbol) {
    let count = 30;
    let factor = 0.015;
    let labels = [];
    
    // Choose count & volatility scale based on timeframe
    switch (timeframe) {
        case "24H":
            count = 24;
            factor = 0.004;
            for (let i = count - 1; i >= 0; i--) {
                labels.push(i === 0 ? "Now" : `${i}h ago`);
            }
            break;
        case "7D":
            count = 28; // 4 readings per day
            factor = 0.008;
            for (let i = count - 1; i >= 0; i--) {
                const hours = i * 6;
                if (hours === 0) labels.push("Now");
                else if (hours % 24 === 0) labels.push(`${hours/24}d ago`);
                else labels.push("");
            }
            break;
        case "30D":
            count = 30;
            factor = 0.015;
            for (let i = count - 1; i >= 0; i--) {
                labels.push(i === 0 ? "Now" : `${i}d ago`);
            }
            break;
        case "1Y":
            count = 52; // Weekly points
            factor = 0.04;
            for (let i = count - 1; i >= 0; i--) {
                if (i === 0) labels.push("Now");
                else if (i % 4 === 0) labels.push(`${Math.round(i/4.3)}mo`);
                else labels.push("");
            }
            break;
    }

    // Seed randomness using character codes of symbol to keep curves recognizable but dynamic
    let seedValue = 0;
    for (let i = 0; i < symbol.length; i++) {
        seedValue += symbol.charCodeAt(i);
    }
    
    // Backward random walk calculation
    let prices = new Array(count);
    prices[count - 1] = currentPrice;
    
    for (let i = count - 2; i >= 0; i--) {
        const rnd = Math.sin(seedValue + i * 1.8) * Math.cos(seedValue - i * 0.7);
        const noise = (rnd * 0.5) + (Math.random() - 0.485); // biased slightly upwards
        prices[i] = prices[i + 1] * (1 - (noise * factor));
    }
    
    return { labels, prices };
}

// --- Main Price History Line Chart ---
function renderMainPriceChart(symbol, timeframe, forceRefresh = false) {
    const canvas = document.getElementById("mainPriceChart");
    if (!canvas) return;
    
    const currentPrice = appState.prices[symbol] || 100;
    const { labels, prices } = generateHistoricalPriceData(currentPrice, timeframe, symbol);
    
    // Determine overall trend color
    const isUpTrend = prices[prices.length - 1] >= prices[0];
    const trendColor = isUpTrend ? "#10b981" : "#ef4444";
    
    // Set up Chart.js context
    const ctx = canvas.getContext("2d");
    
    // Destroy previous chart to prevent render conflicts
    if (mainPriceChartInstance && !forceRefresh) {
        // Just update values for performance
        mainPriceChartInstance.data.labels = labels;
        mainPriceChartInstance.data.datasets[0].data = prices;
        mainPriceChartInstance.data.datasets[0].borderColor = trendColor;
        mainPriceChartInstance.update("none"); // skip animation for price ticks
        return;
    }
    
    if (mainPriceChartInstance) {
        mainPriceChartInstance.destroy();
    }
    
    // Create fill gradient under the line
    const fillGradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    fillGradient.addColorStop(0, trendColor + "28"); // 16% opacity
    fillGradient.addColorStop(1, trendColor + "00"); // Transparent
    
    // Chart Config
    mainPriceChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: `${symbol} Price`,
                data: prices,
                borderColor: trendColor,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: trendColor,
                pointHoverBorderColor: "#fff",
                pointHoverBorderWidth: 2,
                fill: true,
                backgroundColor: fillGradient,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: "index",
                    intersect: false,
                    backgroundColor: "rgba(10, 8, 25, 0.95)",
                    titleColor: "#8e8a9f",
                    bodyColor: "#f3f1fa",
                    borderColor: "rgba(123, 74, 255, 0.3)",
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#5b5770",
                        font: { family: "Plus Jakarta Sans", size: 10 }
                    },
                    border: { display: false }
                },
                y: {
                    grid: {
                        color: "rgba(255, 255, 255, 0.03)",
                        tickBorderDash: [4, 4]
                    },
                    ticks: {
                        color: "#5b5770",
                        font: { family: "Plus Jakarta Sans", size: 10 },
                        callback: function(value) {
                            return "$" + value.toLocaleString();
                        }
                    },
                    border: { display: false }
                }
            },
            interaction: {
                intersect: false,
                mode: "index"
            }
        }
    });
}

// --- Portfolio Asset Allocation Doughnut Chart ---
function renderAllocationChart() {
    const canvas = document.getElementById("allocationChart");
    if (!canvas) return;
    
    // Prepare Data: Combine cash + all holdings value
    const labels = ["USD Cash"];
    const values = [appState.cash];
    const colors = [ASSET_COLORS.CASH.border];
    
    Object.keys(appState.holdings).forEach(symbol => {
        const amount = appState.holdings[symbol].amount || 0;
        const price = appState.prices[symbol] || 0;
        const totalVal = amount * price;
        
        if (totalVal > 0.01) {
            labels.push(symbol);
            values.push(totalVal);
            colors.push(ASSET_COLORS[symbol]?.border || "#7b4aff");
        }
    });
    
    // Render/Destroy logic
    if (allocationChartInstance) {
        allocationChartInstance.destroy();
    }
    
    const ctx = canvas.getContext("2d");
    allocationChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "rgba(10, 8, 25, 0.95)",
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#8e8a9f",
                        boxWidth: 12,
                        padding: 16,
                        font: { family: "Plus Jakarta Sans", size: 11, weight: 600 }
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(10, 8, 25, 0.95)",
                    borderColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: $${val.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

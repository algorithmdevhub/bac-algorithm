// REAL-TIME APPSCRIPT PORTED ENGINE STATE
let stats = {
    bets: 0,
    wagered: 0,
    wins: 0,
    losses: 0,
    profit: 0
};

// Add this near your other variable declarations at the top of script.js
let lifetimeStats = JSON.parse(localStorage.getItem('oscar_lifetime') || '{"profit": 0, "wagered": 0}');

let handHistory = [];

// PREVIOUS STATE CACHE TRACKERS
let engineLastBetSide = "";
let engineLastBetAmount = 0;

// DOM ELEMENT SELECTION CACHE MAP
const elUnitInput = document.getElementById('prof-unit'); // Add this
const elBankrollInput = document.getElementById('prof-bankroll'); // Add this
const elBets = document.getElementById('val-bets');
const elWins = document.getElementById('val-wins');
const elLosses = document.getElementById('val-losses');
const elProfit = document.getElementById('val-profit');
const elUnitDisplay = document.getElementById('display-unit');
const elBankrollDisplay = document.getElementById('display-bankroll');
const elNextSide = document.getElementById('nb-side');
const elNextAmount = document.getElementById('nb-amount');
const elBeadRoad = document.getElementById('bead-road-display');

// NEW: Home Page Stats DOM Selections
const elHomeBankroll = document.getElementById('home-bankroll');
const elHomeProfit = document.getElementById('home-profit');
const elHomeWagered = document.getElementById('home-wagered');
const elHomeWinRate = document.getElementById('home-winrate');

/// REGISTER SYSTEM EVENT ATTACHMENTS
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initEventHandlers();
    
    // This updates the Welcome Back name
    updateWelcomeHeader(); 

    const savedProfile = JSON.parse(localStorage.getItem('oscar_user_profile') || '{"unit": 10, "bankroll": 1000}');
    
    if (elUnitDisplay.innerText === "0") elUnitDisplay.innerText = savedProfile.unit || 0;
    if (elBankrollDisplay.innerText === "0") elBankrollDisplay.innerText = savedProfile.bankroll || 0;

    updateUI();
});

/**
 * CONSOLIDATED INITIALIZATION
 */
function initEventHandlers() {
    document.getElementById('btn-reset-history').addEventListener('click', resetHistoryOnly);
    document.getElementById('btn-reset').addEventListener('click', resetEngine);

    document.getElementById('btn-reset-lifetime').addEventListener('click', () => {
    if(confirm("Reset all lifetime statistics?")) {
        lifetimeStats = { profit: 0, wagered: 0 };
        localStorage.setItem('oscar_lifetime', JSON.stringify(lifetimeStats));
        updateUI();
        }
    });

    document.querySelectorAll('[data-side]').forEach(button => {
        button.addEventListener('click', () => {
            addHand(button.getAttribute('data-side'));
        });
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.getAttribute('data-tab'), tab);
        });
    });

    document.getElementById('btn-save-profile').addEventListener('click', saveProfile);

    ['toggle-hp', 'toggle-hc', 'toggle-lp', 'toggle-lc'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateUI);
    });

    // KEEP THIS: It provides a better user experience when typing in new values
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('focus', function() {
            if (this.value == "0") this.value = "";
        });
    });
}

/**
 * Resets ONLY the hand history array and the visual Bead Road.
 */
function resetHistoryOnly() {
    handHistory = [];
    engineLastBetSide = "";
    engineLastBetAmount = 0;
    
    // Clear the DOM display and refresh the UI
    elBeadRoad.innerHTML = '';
    updateUI();
}

/**
 * Full engine reset
 */
function resetEngine() {
    // Reset internal stats
    stats = { bets: 0, wagered: 0, wins: 0, losses: 0, profit: 0 };
    handHistory = [];
    engineLastBetSide = "";
    engineLastBetAmount = 0;
    
    // Reset toggle switches
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    // Fetch defaults from saved profile
    const savedProfile = JSON.parse(localStorage.getItem('oscar_user_profile') || '{"unit": 10, "bankroll": 1000}');

    // Reset the UI displays to saved defaults instead of 0
    if (elUnitDisplay) elUnitDisplay.innerText = savedProfile.unit || 10;
    if (elBankrollDisplay) elBankrollDisplay.innerText = savedProfile.bankroll || 1000;

    renderBeadRoad();
    updateUI();
}

// 1:1 REPLICATION OF GOOGLE APPSCRIPT PATTERN MATRIX ENTRIES
const opposite = s => s === "P" ? "B" : "P";

function getPattern(player, index, firstHand) {
    switch (player) {
        case 3: return Math.floor(index / 2) % 2 === 0 ? firstHand : opposite(firstHand);
        case 4: return Math.floor(index / 3) % 2 === 0 ? firstHand : opposite(firstHand);
        case 5: return index % 2 === 0 ? firstHand : opposite(firstHand);
        case 6: { const seq = [firstHand, opposite(firstHand), opposite(firstHand), firstHand]; return seq[index % 4]; }
        case 7: { const seq = [firstHand, opposite(firstHand), opposite(firstHand), opposite(firstHand), firstHand]; return seq[index % 5]; }
        case 8: { const seq = firstHand === "P" ? ["P","B","P","P","B","B"] : ["B","P","B","B","P","P"]; return seq[index % 6]; }
    }
    return "";
}

// HAND RECORD INJECTION PIPELINE
function addHand(side) {
    // Only process if we have a valid bet recommendation
    if (handHistory.length > 0 && engineLastBetAmount > 0 && (engineLastBetSide === "P" || engineLastBetSide === "B")) {
        stats.bets++;
        stats.wagered += engineLastBetAmount; 
        
        // Update Lifetime Wagered
        lifetimeStats.wagered += engineLastBetAmount;

        const curBank = Number(elBankrollDisplay.innerText.replace(/[^0-9.-]+/g, "")) || 0;

        if (engineLastBetSide === side) {
            stats.wins++;
            stats.profit += engineLastBetAmount;
            
            // Update Lifetime Profit for a win
            lifetimeStats.profit += engineLastBetAmount;
            
            elBankrollDisplay.innerText = curBank + engineLastBetAmount;
        } else {
            stats.losses++;
            stats.profit -= engineLastBetAmount;
            
            // Update Lifetime Profit for a loss
            lifetimeStats.profit -= engineLastBetAmount;
            
            elBankrollDisplay.innerText = curBank - engineLastBetAmount;
        }

        // Save the updated lifetime stats to LocalStorage
        localStorage.setItem('oscar_lifetime', JSON.stringify(lifetimeStats));
    }
    
    handHistory.push(side);
    renderBeadRoad();
    updateUI();
}

// FULL MULTI-AGENT COMPUTATION LAYER
function calculateNextBet() {
// Fetch from profile
    const savedProfile = JSON.parse(localStorage.getItem('oscar_user_profile') || '{"unit": 50}');
    const baseUnit = Number(savedProfile.unit) || 50; // ADD THIS LINE to define baseUnit

    const hands = handHistory;
    const firstHand = hands.find(h => h === "P" || h === "B");
    if (!firstHand) return { side: "NB", amount: 0 };

    const nextSides = [], nextAmounts = [], profits = [], peaks = [];
    for (let player = 1; player <= 8; player++) {
        let totalProfit = 0, peakProfit = 0, cycleProfit = 0, betAmount = baseUnit;
        for (let i = 0; i < hands.length; i++) {
            const actual = hands[i];
            if (actual !== "P" && actual !== "B") continue;
            let betSide = (player === 1) ? (i === 0 ? firstHand : hands[i-1]) : (player === 2 ? (i === 0 ? opposite(firstHand) : opposite(hands[i-1])) : getPattern(player, i, firstHand));
            const win = betSide === actual;
            if (i === 0) continue;
            if (win) {
                totalProfit += betAmount; cycleProfit += betAmount; peakProfit = Math.max(peakProfit, totalProfit);
                if (cycleProfit >= baseUnit) { cycleProfit = 0; betAmount = baseUnit; }
                else { betAmount = Math.min(betAmount + baseUnit, baseUnit - cycleProfit); if (betAmount < baseUnit) betAmount = baseUnit; }
            } else { totalProfit -= betAmount; cycleProfit -= betAmount; }
        }
        let lastValidIndex = hands.map((h, i) => (h === "P" || h === "B") ? i : -1).filter(i => i !== -1).pop();
        let nextSide = (lastValidIndex !== undefined) ? (player === 1 ? hands[lastValidIndex] : (player === 2 ? opposite(hands[lastValidIndex]) : getPattern(player, lastValidIndex + 1, firstHand))) : "";
        nextSides.push(nextSide); nextAmounts.push(betAmount); profits.push(totalProfit); peaks.push(peakProfit);
    }
    function buildSummary(metricArray) { return function(isMax) {
        const target = isMax ? Math.max(...metricArray) : Math.min(...metricArray);
        const indexes = metricArray.map((v, i) => v === target ? i : -1).filter(i => i !== -1);
        const uniqueSides = [...new Set(indexes.map(i => nextSides[i]))];
        return { value: target, amount: Math.max(...indexes.map(i => nextAmounts[i])), side: uniqueSides.length === 1 ? uniqueSides[0] : "NB" };
    }}
    const peakSummary = buildSummary(peaks), profitSummary = buildSummary(profits);
    const highestPeak = peakSummary(true), lowestPeak = peakSummary(false), highestProfit = profitSummary(true), lowestProfit = profitSummary(false);
    const selections = [];
    if (document.getElementById("toggle-hp").checked) selections.push({ side: highestPeak.side, amount: highestPeak.amount });
    if (document.getElementById("toggle-lp").checked) selections.push({ side: lowestPeak.side, amount: lowestPeak.amount });
    if (document.getElementById("toggle-hc").checked) selections.push({ side: highestProfit.side, amount: highestProfit.amount });
    if (document.getElementById("toggle-lc").checked) selections.push({ side: lowestProfit.side, amount: lowestProfit.amount });
    let decisionSide = "NB", decisionAmount = 0;
    if (selections.length > 0) {
        const sides = [...new Set(selections.map(x => x.side))];
        decisionAmount = Math.max(...selections.map(x => x.amount));
        if (sides.length === 1 && sides[0] !== "NB") decisionSide = sides[0];
    }
    return { side: decisionSide, amount: decisionAmount };
}

// RENDERS REAL-TIME CHANGES
function updateUI() {
    const hands = handHistory;
    const validHandsCount = hands.filter(h => h === "P" || h === "B").length;
    const resultBet = calculateNextBet();
    let finalRenderSide = (validHandsCount >= 2 && (resultBet.side === "P" || resultBet.side === "B")) ? resultBet.side : "NB";
    let finalRenderAmount = (finalRenderSide !== "NB") ? resultBet.amount : 0;
    engineLastBetSide = finalRenderSide; 
    engineLastBetAmount = finalRenderAmount;

    // Get current currency symbol (Clean: only once)
    const savedProfile = JSON.parse(localStorage.getItem('oscar_user_profile') || '{}');
    const symbol = getCurrencySymbol(savedProfile.currency || 'USD');

    // Update Unit and Bankroll displays with the symbol
    if (elUnitDisplay) {
        // Use the raw value from profile to avoid double symbols
        const val = savedProfile.unit || 0;
        elUnitDisplay.innerText = `${symbol}${val}`;
    }
    
    if (elBankrollDisplay) {
        // Strip existing symbol before re-applying to prevent "$$1000"
        const currentText = elBankrollDisplay.innerText;
        const rawNumber = currentText.replace(/[^0-9.-]+/g, ""); 
        elBankrollDisplay.innerText = `${symbol}${rawNumber}`;
    }

    // Existing Game UI Updates
    if (elBets) elBets.innerText = stats.bets;
    if (elWins) elWins.innerText = stats.wins;
    if (elLosses) elLosses.innerText = stats.losses;
    
    // Update Profit with dynamic symbol
    if (elProfit) {
        elProfit.innerText = `${symbol}${stats.profit}`;
        elProfit.style.color = stats.profit > 0 ? "#3aa76d" : (stats.profit < 0 ? "#ff3b30" : "var(--text-bright-gold)");
    }

    // Home Page Updates
    if (elHomeBankroll) {
        const cleanNumber = elBankrollDisplay.innerText.replace(/[^0-9.-]+/g, "");
        elHomeBankroll.innerText = `${symbol}${cleanNumber}`;
    }
    
    // ADD THESE LINES to actually push the values to the Home page
    if (elHomeProfit) {
        elHomeProfit.innerText = `${symbol}${stats.profit}`;
        elHomeProfit.style.color = stats.profit >= 0 ? "#3aa76d" : "#ff3b30";
    }
    
    if (elHomeWagered) {
        elHomeWagered.innerText = `${symbol}${stats.wagered}`;
    }
    
    if (elHomeWinRate) {
        const total = stats.wins + stats.losses;
        const rate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
        elHomeWinRate.innerText = `${rate}%`;
    }

    // Update Lifetime values
    document.getElementById('life-profit').innerText = `${symbol}${lifetimeStats.profit}`;
    document.getElementById('life-wagered').innerText = `${symbol}${lifetimeStats.wagered}`;

    // Next Bet Update
    if (elNextSide && elNextAmount) {
        if (hands.length === 0) { 
            elNextSide.innerText = "Enter First Hand"; 
            elNextSide.className = "side-highlight"; 
            elNextAmount.innerText = ""; 
        } else if (finalRenderSide === "NB") { 
            elNextSide.innerText = "No Bet"; 
            elNextSide.className = "side-highlight"; 
            elNextAmount.innerText = ""; 
        } else { 
            const wordMapper = finalRenderSide === "B" ? "BANKER" : "PLAYER"; 
            elNextSide.innerText = wordMapper; 
            elNextSide.className = `side-highlight ${finalRenderSide}`; 
            elNextAmount.innerText = `(${symbol}${finalRenderAmount})`;
        }
    }
}

// VISUAL BEAD INJECTION
function renderBeadRoad() {
    elBeadRoad.innerHTML = '';
    handHistory.forEach((item, index) => {
        const beadDot = document.createElement('div');
        beadDot.className = `bead ${item.toLowerCase()}`;
        beadDot.innerText = item;
        if (index === 0) { beadDot.style.border = "2px dashed var(--text-bright-gold)"; beadDot.title = "Seed Hand"; }
        elBeadRoad.appendChild(beadDot);
    });
    if (elBeadRoad.parentElement) elBeadRoad.parentElement.scrollLeft = elBeadRoad.parentElement.scrollWidth;
}

// TAB NAVIGATION
function switchTab(targetTabId, element) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');

    document.querySelectorAll('.screen-view').forEach(view => view.classList.remove('active'));

    const targetScreen = document.getElementById(`screen-${targetTabId}`);
    if (targetScreen) targetScreen.classList.add('active');

    // Show Reset only on Games tab
    const header = document.getElementById('app-header');

    if (targetTabId === 'games') {
        header.classList.remove('hide-reset');
    } else {
        header.classList.add('hide-reset');
    }
}

const modalData = {
  "HOW TO USE": `
    <h3>📖 Instructions</h3>
    <p>Getting started with Oscar Engine is simple.</p>
    <ul>
      <li>Open the Profile page and complete your setup.</li>
      <li>Enter your preferred Default Unit Size and Starting Bankroll.</li>
      <li>Save your profile settings.</li>
      <li>Go to the Games page and enable one or more Decision Rules.</li>
      <li>Record each baccarat result using the B or P buttons.</li>
      <li>Follow the Next Bet recommendation displayed by the engine.</li>
      <li>Use Reset History whenever you want to start a new shoe.</li>
    </ul>
  `,

  "OSCARS GRIND": `
    <h3>🎯 The System</h3>
    <p>Oscar's Grind is a positive progression betting system.</p>
    <ul>
      <li>Start with 1 unit.</li>
      <li>Increase bets only after wins.</li>
      <li>After losses, keep the same bet.</li>
      <li>Once a cycle reaches +1 unit profit, restart at 1 unit.</li>
    </ul>
    <p>
      The goal is steady profit growth. Oscar Engine automatically applies
      this progression to all simulated players.
    </p>
  `,

  "SUPPORT": `
    <h3>❤️ Donate</h3>
    <p>Enjoying Oscar Engine?</p>
    <ul>
      <li>Your support helps maintain the app and improve features.</li>
      <li>Every contribution is greatly appreciated.</li>
    </ul>
  `,

  "MESSAGE US": `
    <h3>💬 Chat</h3>
    <p>Questions, feedback, or feature requests?</p>
    <ul>
      <li>Send us a message and we'll do our best to respond as soon as possible.</li>
      <li>We welcome suggestions that can improve Oscar Engine.</li>
    </ul>
  `,

  "STRATEGY": `
    <h3>📊 Decision Rules</h3>
    <p>These toggles customize how the engine calculates your next move:</p>
    <ul>
      <li><b>High Peak:</b> Highest peak profit reached.</li>
      <li><b>Low Peak:</b> Lowest peak profit reached.</li>
      <li><b>High Current:</b> Highest current profit.</li>
      <li><b>Low Current:</b> Lowest current profit reached.</li>
    </ul>
    <p>
      <b>Multiple Rules:</b> If enabled rules disagree on the next side,
      the engine returns NB (No Bet).
    </p>
  `,

  "FAQS": `
    <h3>❓ Frequently Asked Questions</h3>
    <ul>
      <li><b>What does NB mean?</b><br>NB means No Bet.</li>

      <li><b>What is Wagered?</b><br>
      Total number of settled bets made by the engine.</li>

      <li><b>Does Oscar Engine guarantee profit?</b><br>
      No. It is a simulation and decision-support tool only.</li>

      <li><b>Why did the next bet change?</b><br>
      Recommendations update automatically based on current results.</li>

      <li><b>Can I use more than one rule?</b><br>
      Yes. Multiple decision rules can be enabled simultaneously.</li>

      <li><b>What happens when I reset?</b><br>
      All hand history, statistics, and session data are cleared.</li>

      <li><b>Why is there no recommendation after the first hand?</b><br>
      The engine requires additional hand data before making decisions.</li>

      <li><b>Is my data saved?</b><br>
      No. Session data is not stored permanently.</li>
    </ul>
  `
};

// Add this to your initEventHandlers()
document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const title = btn.querySelector('span').innerText;
        showModal(title, modalData[title]);
    });
});

function showModal(title, body) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('info-modal').style.display = 'flex';
}

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'none';
});

// Function to save profile to LocalStorage (or Firebase later)
function saveProfile() {
    const profileData = {
        name: document.getElementById('prof-name').value,
        unit: document.getElementById('prof-unit').value,
        bankroll: document.getElementById('prof-bankroll').value,
        currency: document.getElementById('prof-currency').value
    };
    
    localStorage.setItem('oscar_user_profile', JSON.stringify(profileData));
    
    // Refresh display values
    document.getElementById('display-unit').innerText = profileData.unit;
    document.getElementById('display-bankroll').innerText = profileData.bankroll;

    updateWelcomeHeader(); // <--- ADD THIS LINE HERE
    
    alert("Settings Saved!");
    updateUI(); 
}

// Function to load profile on app startup
function loadProfile() {
    const data = localStorage.getItem('oscar_user_profile');
    if (data) {
        const p = JSON.parse(data);
        document.getElementById('prof-name').value = p.name || "";
        document.getElementById('prof-currency').value = p.currency || "USD";
        document.getElementById('prof-unit').value = p.unit || 10;
        document.getElementById('prof-bankroll').value = p.bankroll || 1000;
        
        // Update the display elements on the Games tab
        document.getElementById('display-unit').innerText = p.unit;
        document.getElementById('display-bankroll').innerText = p.bankroll;
    }
}

// Run loadProfile() on startup inside your DOMContentLoaded listener

/**
 * Helper to get the correct currency symbol based on code
 */
function getCurrencySymbol(code) {
    const symbols = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'PHP': '₱', 
        'JPY': '¥', 'KRW': '₩', 'CNY': '¥', 'INR': '₹',
        'AUD': '$', 'CAD': '$'
    };
    return symbols[code] || '$';
}

/**
 * Example usage in your UI updates:
 * Whenever you update a price/bankroll display, use this:
 */
function updateWelcomeHeader() {
    const savedProfile = JSON.parse(localStorage.getItem('oscar_user_profile') || '{}');
    const welcomeHeader = document.getElementById('welcome-header');
    
    // If a name exists, update the text; otherwise, keep "Welcome Back, Player"
    if (savedProfile.name && savedProfile.name.trim() !== "") {
        welcomeHeader.innerText = `Welcome Back, ${savedProfile.name}`;
    } else {
        welcomeHeader.innerText = "Welcome Back, Player";
    }
}
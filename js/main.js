import * as board from './board.mjs'
import * as stats from './stats.mjs'
import { LAYOUTS } from './layouts.mjs'

// Define which metrics are "lower is better" vs "higher is better"
const lowerIsBetter = new Set([
    'SFB', 'CCB', 'DPB', 'LSB', 'HSB', 'FSB', 'WPB', 'FWPB',
    'SFS', 'CCS', 'DPS', 'LSS', 'HSS', 'FSS', 'WPS', 'FWPS',
    'ONE', 'RED', 'RP', 'LP', 'RR', 'LR'
]);

const higherIsBetter = new Set(['ALT', 'ROL', 'RI', 'LI', 'RM', 'LM']);

// Special case - hand balance should be close to 50%
const balanceMetrics = new Set(['LH', 'RH']);

// Updated thresholds with proper direction
const base = {
    // Lower is better metrics (ascending thresholds)
    "SFB": [0.04, 0.06, 0.10, 0.20],
    "CCB": [0.02, 0.04, 0.08, 0.15],
    "DPB": [0.005, 0.01, 0.02, 0.035],
    "LSB": [0.02, 0.035, 0.055, 0.08],
    "HSB": [0.05, 0.065, 0.08, 0.10],
    "FSB": [0.008, 0.015, 0.025, 0.045],
    "WPB": [0.005, 0.008, 0.015, 0.025],
    "FWPB": [0.002, 0.005, 0.010, 0.015],

    "SFS": [0.08, 0.10, 0.13, 0.20],
    "CCS": [0.04, 0.06, 0.10, 0.16],
    "DPS": [0.006, 0.012, 0.020, 0.030],
    "LSS": [0.03, 0.045, 0.065, 0.09],
    "HSS": [0.06, 0.08, 0.10, 0.14],
    "FSS": [0.01, 0.018, 0.030, 0.045],
    "WPS": [0.007, 0.012, 0.018, 0.030],
    "FWPS": [0.003, 0.008, 0.012, 0.020],

    "ONE": [0.008, 0.015, 0.025, 0.035],
    "RED": [0.02, 0.03, 0.05, 0.08],

    // Higher is better metrics (ascending thresholds)  
    "ALT": [0.25, 0.35, 0.45, 0.55],
    "ROL": [0.25, 0.30, 0.35, 0.45],

    // Finger usage - for strong fingers, higher is better
    // For weaker fingers, lower is better
    "LI": [0.04, 0.10, 0.22, 0.28],
    "RI": [0.04, 0.10, 0.22, 0.28],
    "RM": [0.04, 0.10, 0.22, 0.28],
    "LM": [0.04, 0.10, 0.22, 0.28],
    
    "LR": [0.05, 0.09, 0.12, 0.18],
    "RR": [0.05, 0.09, 0.12, 0.18],
    "LP": [0.03, 0.05, 0.07, 0.1],
    "RP": [0.03, 0.05, 0.07, 0.1],

    // Hand balance - closeness to 50% preferred
    "LH": [0.02, 0.05, 0.08, 0.12], // distance from 0.5
    "RH": [0.02, 0.05, 0.08, 0.12]  // distance from 0.5
};

window.onload = async function() {

    const selector = document.getElementById('layout-selector')
    Object.keys(LAYOUTS).forEach((layoutName, _) => {
        const button = document.createElement('button')
        button.innerHTML = layoutName
        if (layoutName === 'Зубачёвская') {
            button.setAttribute('aria-checked', 'true')
        }
        button.addEventListener('click', () => {
            Array.from(selector.children).forEach((x) => {
                x.setAttribute('aria-checked', 'false')
            })
            button.setAttribute('aria-checked', 'true')

            board.update(LAYOUTS[layoutName]);
            
        })
        selector.appendChild(button)
    })


    await stats.init()
    board.update(LAYOUTS['Зубачёвская'])

    window.addEventListener('keydown', e => {
        const keyEl = board.codeToElement[e.code]
        if (!keyEl) return

        keyEl.classList.add('active')
        setTimeout(() => keyEl.classList.remove('active'), 100)
    })
}

// Function to create colored tooltip HTML
// Function to create colored tooltip HTML
function createColoredTooltip(topContribs, total, maxFreq = 0.05) {
    // Create chroma scale - use same colors as heatmap
    const chromaScale = chroma
        .scale(['#4C5F6B', '#83A0A0', '#BCA0BC', '#F9B9F2'])
        .domain([0, maxFreq])  // Use absolute max for consistency

    return topContribs
        .map(([ngram, count]) => {
            const freq = count / total  // Use the correct total for this ngram type
            const color = chromaScale(Math.min(freq, maxFreq)).hex()
            const percentage = (freq * 100).toFixed(2)

            return `<div style="background-color: ${color};" title="${percentage}%">${ngram}</div>`
        })
        .join('')
}

window.stats = function () {
    const { ngramStats, fingerStats, endingStats, prefixStats } = stats.analyze();
    const tooltip = document.getElementById('stat-tooltip');

    // Color assignment function
    function getColor(stat, freq) {
        if (!(stat in base)) return '';

        if (balanceMetrics.has(stat)) {
            // For hand balance, measure distance from 50%
            const distance = Math.abs(freq - 0.5);
            for (let i = 0; i < 4; i++) {
                if (distance <= base[stat][i]) {
                    return ['excellent', 'good', 'okay', 'poor'][i];
                }
            }
            return 'terrible';
        }
        else if (lowerIsBetter.has(stat)) {
            // For lower-is-better metrics
            for (let i = 0; i < 4; i++) {
                if (freq <= base[stat][i]) {
                    return ['excellent', 'good', 'okay', 'poor'][i];
                }
            }
            return 'terrible';
        }
        else if (higherIsBetter.has(stat)) {
            // For higher-is-better metrics  
            for (let i = 3; i >= 0; i--) {
                if (freq >= base[stat][i]) {
                    return ['excellent', 'good', 'okay', 'poor'][i];
                }
            }
            return 'terrible';
        }
        else {
            // Default finger usage logic (moderate values preferred)
            for (let i = 0; i < 4; i++) {
                if (freq <= base[stat][i]) {
                    return ['excellent', 'good', 'okay', 'poor'][i];
                }
            }
            return 'terrible';
        }
    }

    // Render n-gram stats
    for (const [stat, { freq, top, total }] of Object.entries(ngramStats)) {
        const cell = document.getElementById(stat)
        const perc = freq.toLocaleString(undefined, {
            style: 'percent',
            minimumFractionDigits: 2,
        })

        const color = getColor(stat, freq)

        cell.innerHTML = `${stat}: ${perc}`
        cell.setAttribute("class", "")
        cell.classList.add(color)

        // Updated tooltip with colored ngrams
        cell.addEventListener('mousemove', (e) => {
            tooltip.style.display = 'grid'
            tooltip.style.left = e.pageX + 10 + 'px'
            tooltip.style.top = e.pageY + 10 + 'px'
            tooltip.innerHTML = createColoredTooltip(top, total, 0.01)
        })

        cell.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none'
        })
    }

    // Render finger stats
    for (const [stat, freq] of Object.entries(fingerStats)) {
        const cell = document.getElementById(stat);
        const perc = freq.toLocaleString(undefined, {
            style: 'percent',
            minimumFractionDigits: 2
        });

        const color = getColor(stat, freq);

        cell.innerHTML = `${stat}: ${perc}`;
        cell.setAttribute("class", "")
        cell.classList.add(color)
    }

    // Render ending stats
    const endingsDiv = document.getElementById('endings')
    endingsDiv.innerHTML = ''
    for (const [ending, categories] of Object.entries(endingStats).sort(([a], [b]) => a.localeCompare(b))) {
        const wrapper = document.createElement('div')
        wrapper.classList.add('morpheme-wrapper')
        const morphemeSpan = document.createElement('span')
        morphemeSpan.classList.add('morpheme')
        morphemeSpan.innerHTML = ending
        wrapper.appendChild(morphemeSpan)
        for (const category of categories) {
            const typeSpan = document.createElement('span')
            typeSpan.classList.add('morpheme-type')
            typeSpan.innerHTML = category
            wrapper.appendChild(typeSpan)
        }
        endingsDiv.appendChild(wrapper)
    }
        
    // Render prefix stats
    const prefixDiv = document.getElementById('prefixes')
    prefixDiv.innerHTML = ''
    for (const [prefix, categories] of Object.entries(prefixStats).sort(([a], [b]) => a.localeCompare(b))) {
        const wrapper = document.createElement('div')
        wrapper.classList.add('morpheme-wrapper')
        const morphemeSpan = document.createElement('span')
        morphemeSpan.classList.add('morpheme')
        morphemeSpan.innerHTML = prefix
        wrapper.appendChild(morphemeSpan)
        for (const category of categories) {
            const typeSpan = document.createElement('span')
            typeSpan.classList.add('morpheme-type')
            typeSpan.innerHTML = category
            wrapper.appendChild(typeSpan)
        }
        prefixDiv.appendChild(wrapper)
    }
};
import { getMonograms } from './shared.mjs'
export const codeToElement = {}  // Global mapping from key codes to DOM elements

export function layout() {
    const kbd = document.getElementById('kbd')
    let layout = ''

    const keys = document.getElementsByClassName('key')
    for (const key of keys) {
        layout += key.textContent.toLowerCase()
    }

    return layout
}

function updateKeyColors(layout) {
    const monograms = getMonograms()
    if (!monograms) return // still loading

    const charsInLayout = new Set(Array.from(layout))
    const charsInMonograms = new Set(Object.keys(monograms))
    const missingChars = Array.from(charsInLayout).filter(char => !charsInMonograms.has(char))

    const freqs = Object.entries(monograms)
        .filter(([ch]) => charsInLayout.has(ch.toLowerCase()))
    
    const values = freqs.map(([, val]) => val)
    const min = Math.min(...values)
    const max = Math.max(...values)

    const chromaScale = chroma
        .scale(['#4C5F6B', '#83A0A0', '#BCA0BC', '#F9B9F2']) // low → mid → high
        .domain([min, max])

    freqs.forEach(([char, count]) => {
        const color = chromaScale(count).hex()
        const keyEl = document.getElementsByClassName(char.toUpperCase())[0]
        if (keyEl) keyEl.style.backgroundColor = color
    })
    for (const char of missingChars) {
        const keyEl = document.getElementsByClassName(char.toUpperCase())[0]
        if (keyEl) keyEl.style.backgroundColor = '#666666'
    }
}

// The hardware key codes for the letters in QWERTY order
const KEY_CODES = [
    'Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal',
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash',
    'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote',
    'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'
]

export function update(layout) {
    kbd.innerHTML = ''
    let row;

    for (let i=0; i < layout.length; i++) {
        if ([0, 13, 26, 37].includes(i)) {
            row = document.createElement('div')
            row.className = 'keyboard-row'
            kbd.appendChild(row)
        }

        const letter = layout[i].toUpperCase()

        const key = document.createElement('div')
        key.className = `key center ${letter}`
        if ([29, 32].includes(i)) key.classList.add('homing')
        key.innerHTML = letter

        // Map the physical key code to the DOM element
        const code = KEY_CODES[i]
        if (code) codeToElement[code] = key

        row.appendChild(key)
    }

    updateKeyColors(layout)
    window.stats()
}
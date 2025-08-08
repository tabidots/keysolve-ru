import * as board from './board.mjs'
import { classify, FINGER_MAP } from './classify.mjs'
import { setMonograms, getMonograms } from './shared.mjs'

const FINGERS = ['LP', 'LR', 'LM', 'LI', 'LT', 'RT', 'RI', 'RM', 'RR', 'RP']

let BIGRAMS = null
let SKIPGRAMS = null
let TRIGRAMS = null
let ENDINGS = null
let PREFIXES = null

export async function init() {
    const monograms = await (await fetch('corpora/monograms.json')).json()
    setMonograms(monograms)
    BIGRAMS = await (await fetch('corpora/bigrams.json')).json()
    SKIPGRAMS = await (await fetch('corpora/skipgrams.json')).json()
    TRIGRAMS = await (await fetch('corpora/trigrams.json')).json()
    ENDINGS = await (await fetch('corpora/endings.json')).json()
    PREFIXES = await (await fetch('corpora/prefixes.json')).json()
}

export function analyze() {
    const letters = board.layout()
    const layout = {}
    const ngramStats = {} 
    const fingerStats = {}
    const endingStats = {}
    const prefixStats = {}

    for (let i=0; i < letters.length; i++) {
        layout[letters[i]] = i
    }

    for (const suffix of ['B', 'S', '']) {
        let grams

        switch (suffix) {
            case 'B':
                grams = BIGRAMS
                break
            case 'S':
                grams = SKIPGRAMS
                break
            default:
                grams = TRIGRAMS
                break
        }

        let curr = {}
        let contribs = {}
        let total = 0

        for (const [gram, count] of Object.entries(grams)) {
            const key = [...gram].map(x => layout[x])
            total += count

            if (key.indexOf(undefined) !== -1) {
                continue
            }

            const stats = classify(key)

            for (let stat of stats) {
                stat = stat + suffix

                curr[stat] ??= 0
                curr[stat] += count

                contribs[stat] ??= {}

                // Store the display format for the ngram
                let displayGram
                if (suffix === 'S') {
                    displayGram = `${gram[0]}_${gram[1]}`
                } else {
                    displayGram = gram
                }

                // Accumulate counts for each unique ngram
                contribs[stat][displayGram] ??= 0
                contribs[stat][displayGram] += count
            }
        }

        for (const [stat, count] of Object.entries(curr)) {
            // Convert contributions object to sorted array of [ngram, count] pairs
            const topContribs = Object.entries(contribs[stat])
                .sort((a, b) => b[1] - a[1])  // Sort by count descending
                .slice(0, 10)

            ngramStats[stat] = {
                "freq": count / total,
                "top": topContribs,  // Now array of [ngram, count] pairs
                "total": total       // Store total for this ngram type
            }
        }
    }

    let curr = {}
    let total = 0

    const monograms = getMonograms()
    for (const [gram, count] of Object.entries(monograms)) {
        const finger = FINGERS[FINGER_MAP[layout[gram]]]

        if (finger === undefined) {
            continue
        }

        curr[finger] ??= 0
        curr[finger] += count
        total += count
    }

    for (const [stat, count] of Object.entries(curr)) {
        fingerStats[stat] = count / total
    }

    fingerStats['LH'] = ['LI', 'LM', 'LR', 'LP', 'LT'].reduce((sum, x) => sum + (fingerStats[x] ?? 0), 0)
    fingerStats['RH'] = ['RI', 'RM', 'RR', 'RP', 'RT'].reduce((sum, x) => sum + (fingerStats[x] ?? 0), 0)

    for (const ending of ENDINGS) {
        const key = [...ending].map(x => layout[x])

        if (key.indexOf(undefined) !== -1) {
            continue
        }

        let endingType = classify(key)
        if (endingType.length > 0 && !endingType.includes('ALT') && !endingType.includes('ROL')) {
            endingStats[ending] = endingType
        }      
    }
    for (const prefix of PREFIXES) {
        const key = [...prefix].map(x => layout[x])

        if (key.indexOf(undefined) !== -1) {
            continue
        }

        let prefixType = classify(key)
        if (prefixType.length > 0 && !prefixType.includes('ALT') && !prefixType.includes('ROL')) {
            prefixStats[prefix] = prefixType
        }
    }

    return {
        "ngramStats": ngramStats,
        "fingerStats": fingerStats,
        "endingStats": endingStats,
        "prefixStats": prefixStats
    }
}
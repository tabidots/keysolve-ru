export const FINGER_MAP = [
    0, 0, 1, 2, 2, 3, 3, 6, 7, 7, 8, 8, 9,
        0, 1, 2, 3, 3, 6, 6, 7, 8, 9, 9, 9, 9,
         0, 1, 2, 3, 3, 6, 6, 7, 8, 9, 9,
           0, 1, 2, 3, 3, 6, 6, 7, 8, 9
]

export const COLUMNS = [
    0, 0, 1, 2, 2, 3, 4, 6, 6, 7, 8, 9, 10,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
         0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
           0, 1, 2, 3, 4, 5, 6, 7, 8, 9
]

export const HAND_MAP = [
    0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
        0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,
         0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1,
           0, 0, 0, 0, 0, 1, 1, 1, 1, 1
]

const LATERAL_STRETCH_PAIRS = new Set([
    '2-4', '4-2', '5-7', '7-5',      // existing center pairs
    '5-9', '9-5',                 // inner to far pinky
    '5-10', '10-5', 
    '5-11', '11-5',
    '5-12', '12-5',
    '8-10', '10-8',                 // right side lateral
    '8-11', '11-8',
    '8-12', '12-8'
])

function finger(idx) {
    return FINGER_MAP[idx]
}

function column(idx) {
    return COLUMNS[idx]
}

function hand(idx) {
    return HAND_MAP[idx]
}

function row(idx) {
    if (idx < 13) {
        return 0
    } else if (idx < 26) {
        return 1
    } else if (idx < 37) {
        return 2
    } else {
        return 3
    }
    
}

function ordered(idx) {
    return (
        (
            finger(idx[0]) < finger(idx[1]) &&
            finger(idx[1]) < finger(idx[2])
        ) ||
        (
            finger(idx[0]) > finger(idx[1]) &&
            finger(idx[1]) > finger(idx[2])
        )
    )
}

export function classify(key) {
    switch(key.length) {
        case 2:
            return bigrams(key)
        case 3:
            return trigrams(key)
    }
}

function bigrams(key) {
    const buckets = []

    const row1 = row(key[0])
    const row2 = row(key[1])
    const col1 = column(key[0])
    const col2 = column(key[1])
    const finger1 = finger(key[0])
    const finger2 = finger(key[1])
    const sameHand = hand(key[0]) == hand(key[1])

    if (
        finger1 == finger2 &&
        key[0] != key[1]
    ) {
        buckets.push('SF')
        // Center column bigrams
        if ([4, 5].includes(col1) || [4, 5].includes(col2)) {
            buckets.push('CC')
        // Double pinky bigrams
        } else if ([0, 9].includes(finger1)) {
            buckets.push('DP')
        }
        return buckets
    }
    
    const colPair = `${col1}-${col2}`

    if (hand(key[0]) === hand(key[1]) && LATERAL_STRETCH_PAIRS.has(colPair)) {
        buckets.push('LS')
    }

    // TODO: Consider row skips

    if (
        (
            row1 - row2 == -1 &&
            sameHand &&
            [1, 2, 7, 8].includes(finger2)
        ) ||
        (
            row1 - row2 == 1 &&
            sameHand &&
            [1, 2, 7, 8].includes(finger1)
        ) ||
        // Expanding the definition of scissors to include scrunched LH middle/index combos
        (
            row1 - row2 == -1 &&
            finger1 == 3 && finger2 == 2
        ) ||
        (
            row1 - row2 == 1 &&
            finger1 == 2 && finger2 == 3
        )
    ) {
        buckets.push('HS')
    }

    // Expanding the definition of scissors to include "winged" ring/pinky combos
    if (
        (
            row1 - row2 == -1 &&
            sameHand &&
            [0, 9].includes(finger1) &&
            [1, 8].includes(finger2)
        ) ||
        (
            row1 - row2 == 1 &&
            sameHand &&
            [1, 8].includes(finger1) &&
            [0, 9].includes(finger2)
        )
    ) {
        buckets.push('WP')
    }

    if (
        (
            row1 - row2 <= -2 &&
            sameHand &&
            [1, 2, 7, 8].includes(finger2)
        ) ||
        (
            row1 - row2 >= 2 &&
            sameHand &&
            [1, 2, 7, 8].includes(finger1)
        ) ||
        // Expanding the definition of scissors to include scrunched LH middle/index combos
        (
            row1 - row2 <= -2 &&
            finger1 == 3 && finger2 == 2
        ) ||
        (
            row1 - row2 >= 2 &&
            finger1 == 2 && finger2 == 3
        )
    ) {
        buckets.push('FS')
    }

    // Expanding the definition of full scissors to include "full winged" ring/pinky combos
    if (
        (
            row1 - row2 <= -2 &&
            sameHand &&
            [0, 9].includes(finger1) &&
            [1, 8].includes(finger2)
        ) ||
        (
            row1 - row2 >= 2 &&
            sameHand &&
            [1, 8].includes(finger1) &&
            [0, 9].includes(finger2)
        )
    ) {
        buckets.push('FWP')
    }

    return buckets
}

function trigrams(key) {
    const buckets = []

    if (
        hand(key[0]) == hand(key[2]) &&
        hand(key[0]) != hand(key[1])
    ) {
        buckets.push('ALT')
    }

    if (
        new Set(key.map(x => hand(x))).size == 2 &&
        new Set(key.map(x => finger(x))).size == 3 &&
        hand(key[0]) != hand(key[2])
    ) {
        buckets.push('ROL')
    }

    if (
        new Set(key.map(x => hand(x))).size == 1 &&
        ordered(key)
    ) {
        buckets.push('ONE')
    }

    if (
        new Set(key.map(x => hand(x))).size == 1 &&
        new Set(key.map(x => finger(x))).size == 3 &&
        !ordered(key)
    ) {
        buckets.push('RED')
    }

    return buckets
}
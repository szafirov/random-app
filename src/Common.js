export function sum(a, b) {
    return a + b
}

export function shouldResetLevels (oldTotal, newTotal, oldMax, newMax) {
    return (oldTotal < oldMax && newTotal === newMax) || (newTotal >= 0 && oldTotal < 0)
}

export function gain(players) {
    return players.map(p => p.gain).reduce(sum)
}

export function formatGains(players) {
    const formatGain = gain => (gain >= 0 ? '+' : '−') + Math.abs(gain)
    return players.map(p => formatGain(p.gain)).join('') + '=' + formatGain(gain(players))
}

export function formatMatch(gain) {
    return gain > 0 ? 'W' : gain ? 'L' : '0'
}

export function formatMatches(players) {
    return formatMatch(gain(players))
}

export function formatProperty(players, prop) {
    return players.map(p => p[prop]).join(':')
}
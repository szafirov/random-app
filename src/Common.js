export function sum(a, b) {
    return a + b
}

export function shouldResetLevels (oldTotal, newTotal, oldMax, newMax) {
    return (oldTotal < oldMax && newTotal === newMax) || (newTotal >= 0 && oldTotal < 0)
}

import Pair from './Pair.js';

const sum = (a, b) => a + b

export default class VirtualPlayer {
    constructor(pairs, defense) {
        this.pairs = [...Array(pairs).keys()].map(index => new Pair(index, defense))
        this.gain = 0
        this.total = 0
    }
    placeBets(slots) {
        // console.debug(slots)
        this.pairs.forEach(pair => pair.placeBets(slots && slots[pair.index]))
        return this.betAmount()
    }
    computeRows(outcome) {
        const rows = this.pairs.map(pair => pair.computeRow(outcome))
        this.gain = this.pairs.map(pair => pair.gain).reduce(sum)
        return this.addTotal(rows)
    }
    computeGain(outcome, won) {
        const rows = this.pairs.map(pair => pair.computeRow(outcome))
        this.gain = (won ? 1 : -1) * this.betAmount()
        return this.addTotal(rows);
    }
    addTotal(rows) {
        this.total += this.gain
        return rows.map((row, pair) => ({
            ...row,
            pair,
            gain: this.gain,
            total: this.total,
        }))
    }
    evolve(resetLevels) {
        this.pairs.forEach(pair => {
            if (resetLevels && pair.canReset()) pair.reset()
            else pair.evolve()
        })
    }
    hasPairsToReset() {
        return this.pairs.filter(pair => pair.canReset()).length > 0
    }
    betAmount = () => {
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce(sum)
        return Math.abs(betSum(0) - betSum(1))
    }
}
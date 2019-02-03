import Pair from './Pair.js';

export default class VirtualPlayer {
    constructor(pairs, defense) {
        this.pairs = [...Array(pairs).keys()].map(index => new Pair(index, defense))
        this.total = 0
        this.max = 0
        this.gain = 0
    }
    placeBets() {
        this.pairs.forEach(pair => pair.placeBets())
        return this.betAmount()
    }
    computeRowsAndEvolve(outcome, won) {
        const rows = this.pairs.map(pair => pair.computeRow(outcome))
        this.evolve(outcome, won)
        return rows.map((row, pair) => ({
            ...row,
            pair,
            gain: this.gain,
            total: this.total,
            max: this.max
        }))
    }
    evolve(outcome, won) {
        this.pairs.forEach(pair => pair.evolve(outcome))
        this.gain = (won ? 1 : -1) * this.betAmount()
        this.total += this.gain
        if (this.total >= this.max) this.pairs
            .filter(pair => pair.players[0].level > 0)
            .forEach(pair => pair.resetLevel())
        this.max = Math.max(this.max, this.total)
    }
    betAmount = () => {
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce((a, b) => a + b)
        return Math.abs(betSum(0) - betSum(1))
    }
    betAndEvolve = (outcome, slot) => {
        this.placeBets()
        this.evolve(outcome, slot)
    }
}
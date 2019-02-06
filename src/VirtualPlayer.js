import Pair from './Pair.js';

export default class VirtualPlayer {
    constructor(pairs, defense) {
        this.pairs = [...Array(pairs).keys()].map(index => new Pair(index, defense))
        this.gain = 0
        this.total = 0
    }
    placeBets() {
        this.pairs.forEach(pair => pair.placeBets())
        return this.betAmount()
    }
    computeRows(outcome) {
        const rows = this.pairs.map(pair => pair.computeGain(outcome))
        this.gain = this.pairs.map(pair => pair.gain).reduce((a, b) => a + b)
        this.total += this.gain
        return rows.map((row, pair) => ({
            ...row,
            pair,
            gain: this.gain,
            total: this.total,
        }))
    }
    computeGain(outcome, won) {
        this.pairs.map(pair => pair.computeGain(outcome))
        this.gain = (won ? 1 : -1) * this.betAmount()
        this.total += this.gain
    }
    evolve(outcome, resetLevels) {
        this.pairs.forEach(pair => pair.evolve(outcome))
        if (resetLevels) this.pairs
            .filter(pair => pair.players[0].level > 0)
            .forEach(pair => pair.resetLevel())
    }
    hasLevelToReset() {
        return this.pairs.filter(pair => pair.players[0].level > 0).length
    }
    betAmount = () => {
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce((a, b) => a + b)
        return Math.abs(betSum(0) - betSum(1))
    }
}
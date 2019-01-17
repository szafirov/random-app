import Pair from './Pair.js';

export default class VirtualPlayer {
    constructor(pairs, defense) {
        this.pairs = [...Array(pairs).keys()].map(index => new Pair(index, defense))
        this.total = 0
        this.max = 0
        this.gain = 0
    }
    placeRandomBets() {
        this.pairs.forEach(pair => {
            const randomSlot = Math.random() > 0.5 ? 1 : 0
            pair.placeBets(randomSlot)
        })
    }
    resetLevels() {
        this.pairs
            .filter(pair => pair.players[0].level > 0)
            .forEach(pair => pair.resetLevel())
    }
    evolve(outcome, round) {
        const rows = this.pairs.map(pair => pair.evolve(outcome))
        this.gain = this.pairs.map(pair => pair.gain).reduce((a, b) => a + b)
        this.total += this.gain
        if (this.total >= this.max) this.resetLevels()
        this.max = Math.max(this.max, this.total)
        return rows.map((row, index) => ({
            ...row,
            round,
            pair: index,
            gain: this.gain,
            total: this.total,
            max: this.max
        }))
    }
    bets() {
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce((a, b) => a + b)
        return [betSum(0), betSum(1)]
    }
}
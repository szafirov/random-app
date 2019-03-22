import VirtualPlayer from './VirtualPlayer.js';

const sum = (a, b) => a + b

export default class VirtualPair {

    constructor(pairs, defense, prototype) {
        this.max = 0
        this.players = [
            new VirtualPlayer(pairs, defense, prototype ? prototype.players[0] : undefined),
            new VirtualPlayer(pairs, defense, prototype ? prototype.players[1] : undefined),
        ]
    }

    placeBetsAndComputeRow(round, outcome, slot) {
        const bet1 = this.players[0].placeBets(round)
        const bet2 = this.players[1].placeBets(round)
        const bet = Math.abs(bet1 - bet2)
        const won = slot === outcome
        const won1 = won === (bet1 >= bet2)
        const won2 = won === (bet1 < bet2)
        const oldTotal = this.players.map(p => p.total).reduce(sum)
        this.players[0].computeGain(outcome, won1)
        this.players[1].computeGain(outcome, won2)
        const newTotal = this.players.map(p => p.total).reduce(sum)
        const resetLevels = this.shouldResetLevels(oldTotal, newTotal)
        this.players.forEach(p => p.evolve(resetLevels))
        this.max = Math.max(this.max, newTotal)
        return {
            round,
            pair: 0,
            bet1,
            bet2,
            bet,
            slot,
            outcome,
            match: won ? 'W' : 'L',
            total1: this.players[0].total,
            total2: this.players[1].total,
            total: newTotal,
            max: this.max,
            resetLevels
        }
    }

    shouldResetLevels = (oldTotal, newTotal) =>
        ((newTotal > this.max && this.max > 0) || (oldTotal < 0 && newTotal >= 0)) &&
        this.players.filter(p => p.hasPairsToReset()).length
}

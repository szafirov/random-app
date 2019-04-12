import VirtualPlayer from './VirtualPlayer.js'
import Common from './Common.js'

const sum = (a, b) => a + b

export default class VirtualPair {

    constructor(pairs, defense, pairSlotGenerator, prototypePlayer) {
        this.max = 0
        this.players = [
            new VirtualPlayer(pairs, defense, pairSlotGenerator, prototypePlayer),
            new VirtualPlayer(pairs, defense, pairSlotGenerator, prototypePlayer),
        ]
    }

    placeBets(round, outcome, slot) {
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
            oldTotal,
            total: newTotal,
        }

    }

    placeBetsAndComputeRow(round, outcome, slot) {
        const row = this.placeBets(round, outcome, slot)
        this.evolve(row.resetLevels)
        const oldMax = this.max
        this.max = Math.max(this.max, row.total)
        const resetLevels = Common.shouldResetLevels(row.oldTotal, row.total, oldMax, this.max)
        return {
            ...row,
            max: this.max,
            resetLevels,
        }
    }

    evolve(resetLevels) {
        this.players.forEach(p => p.evolve(resetLevels))
    }

}

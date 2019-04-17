import {sum, shouldResetLevels} from './Common.js'
import VirtualPlayer from './VirtualPlayer.js'

export default class VirtualPair {

    constructor(pairs, defense, pairSlotGenerator, prototypePlayer) {
        this.total = 0
        this.max = 0
        this.players = [
            new VirtualPlayer(pairs, defense, pairSlotGenerator, prototypePlayer),
            new VirtualPlayer(pairs, defense, pairSlotGenerator, prototypePlayer),
        ]
    }

    placeBetsAndComputeRow(round, outcome, slot) {
        const [ bet1, bet2 ] = this.players.map(p => p.placeBets(round))
        this.bet = Math.abs(bet1 - bet2)
        const won = slot === outcome
        const won1 = won === (bet1 >= bet2)
        const won2 = won === (bet1 < bet2)
        const oldTotal = this.total
        this.players[0].computeGain(outcome, won1)
        this.players[1].computeGain(outcome, won2)
        const gain = (won ? 1 : -1) * this.bet
        this.total = this.players.map(p => p.total).reduce(sum)
        const oldMax = this.max
        this.max = Math.max(this.max, this.total)
        const resetLevels = shouldResetLevels(oldTotal, this.total, oldMax, this.max)
        this.evolve(resetLevels)
        return {
            round,
            pair: 0,
            bet1,
            bet2,
            bet: this.bet,
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain,
            total1: this.players[0].total,
            total2: this.players[1].total,
            oldTotal,
            total: this.total,
            max: this.max,
            resetLevels,
        }
    }

    placeBets(round) {
        const [ bet1, bet2 ] = this.players.map(p => p.placeBets(round))
        this.bet = Math.abs(bet1 - bet2)
        return this.bet
    }

    computeGain(outcome, won) {
        const [ bet1, bet2 ] = this.players.map(p => p.bet)
        const won1 = won === (bet1 >= bet2)
        const won2 = won === (bet1 < bet2)
        this.players[0].computeGain(outcome, won1)
        this.players[1].computeGain(outcome, won2)
        this.total = this.players.map(p => p.total).reduce(sum)
    }

    evolve(resetLevels) {
        this.players.forEach(p => p.evolve(resetLevels))
    }
}

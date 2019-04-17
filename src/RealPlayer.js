import {sum, shouldResetLevels} from './Common.js'
import VirtualPair from './VirtualPair.js'

export default class RealPlayer {

    constructor(pairs, defense, pairSlotGenerator, prototypePlayer) {
        this.total = 0
        this.max = 0
        this.pairs = [
            new VirtualPair(pairs, defense, pairSlotGenerator, prototypePlayer),
            new VirtualPair(pairs, defense, pairSlotGenerator, prototypePlayer),
        ]
    }

    placeBetsAndComputeRow(round, outcome, slot) {
        const [ bet1, bet2 ] = this.pairs.map(p => p.placeBets(round))
        const bet = Math.abs(bet1 - bet2)
        const won = slot === outcome
        const won1 = won === (bet1 >= bet2)
        const won2 = won === (bet1 < bet2)
        const oldTotal = this.total
        this.pairs[0].computeGain(outcome, won1)
        this.pairs[1].computeGain(outcome, won2)
        const gain = (won ? 1 : -1) * bet
        const total1 = this.pairs[0].total
        const total2 = this.pairs[1].total
        this.total = this.pairs.map(p => p.total).reduce(sum)
        console.debug(bet1, bet2, bet, oldTotal, total1, total2, this.total)
        const oldMax = this.max
        this.max = Math.max(this.max, this.total)
        const resetLevels = shouldResetLevels(oldTotal, this.total, oldMax, this.max)
        this.pairs.forEach(p => p.evolve(resetLevels))
        return {
            round,
            pair: 0,
            bet1,
            bet2,
            bet,
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain,
            total1,
            total2,
            total: this.total,
            max: this.max,
            resetLevels,
        }
    }
}
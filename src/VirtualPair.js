import {sum, shouldResetLevels} from './Common.js'
import VirtualPlayer from './VirtualPlayer.js'
import { dualSlotGenerator } from './slots.js'


export default class VirtualPair {
    constructor(pairs, defense, slotGenerator, virtualPlayerSlotGenerator, pairSlotGenerator, prototypePlayer) {
        this.gain = 0
        this.total = 0
        this.max = 0
        this.slotGenerator = slotGenerator
        const dualSlotGenerators = dualSlotGenerator(virtualPlayerSlotGenerator)
        this.players = [
            new VirtualPlayer(pairs, defense, dualSlotGenerators[0], pairSlotGenerator, prototypePlayer),
            new VirtualPlayer(pairs, defense, dualSlotGenerators[1], pairSlotGenerator, prototypePlayer),
        ]
    }

    placeBetsAndComputeRow(round, outcome) {
        const slot = this.slotGenerator(round)
        const won = slot === outcome
        const rows = this.players.map(p => p.placeBetsAndComputeRow(round, outcome))
        const [bet1, bet2] = rows.map(r => r.bet)
        this.bet = Math.abs(bet1 - bet2)
        const oldTotal = this.total
        this.gain = this.players.map(p => p.gain).reduce(sum)
        this.total = this.players.map(p => p.total).reduce(sum)
        const oldMax = this.max
        this.max = Math.max(this.max, this.total)
        const resetLevels = shouldResetLevels(oldTotal, this.total, oldMax, this.max)
        this.evolve(resetLevels)
        return {
            round,
            rows,
            pair: 0,
            bet1,
            bet2,
            bet: this.bet,
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain1: this.players[0].gain,
            gain2: this.players[1].gain,
            gain: this.gain,
            total1: this.players[0].total,
            total2: this.players[1].total,
            oldTotal,
            total: this.total,
            max: this.max,
            resetLevels,
        }
    }

    // placeBets(round) {
    //     const [ bet1, bet2 ] = this.players.map(p => p.placeBets(round))
    //     this.bet = Math.abs(bet1 - bet2)
    //     return this.bet
    // }
    //
    // computeGain(outcome, won) {
    //     const [ bet1, bet2 ] = this.players.map(p => p.bet)
    //     const won1 = won === (bet1 >= bet2)
    //     const won2 = won === (bet1 < bet2)
    //     this.players[0].computeGain(outcome, won1)
    //     this.players[1].computeGain(outcome, won2)
    //     this.total = this.players.map(p => p.total).reduce(sum)
    // }

    evolve(resetLevels) {
        this.players.forEach(p => p.evolve(resetLevels))
    }
}

import {shouldResetLevels} from './Common.js'
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
        const rows = this.players.map(p => p.placeBetsAndComputeRow(round, outcome))
        const [slot1, slot2] = rows.map(r => r.slot)
        const [bet1, bet2] = rows.map(r => r.bet)
        const oldTotal = this.total
        this.total = this.players[0].total + this.players[1].total
        this.gain = this.total - oldTotal
        const oldMax = this.max
        this.max = Math.max(this.max, this.total)
        const resetLevels = shouldResetLevels(oldTotal, this.total, oldMax, this.max)
        this.evolve(resetLevels)
        return {
            round,
            rows,
            pair: 0,
            bet: `${bet1}:${bet2}`,
            slot: `${slot1}:${slot2}`,
            outcome,
            match: slot1 === outcome ? 'W:L' : 'L:W',
            gain: this.players.map(p => p.gain).join(':'),
            total1: this.players[0].total,
            total2: this.players[1].total,
            total: this.total,
            max: this.max,
            resetLevels,
        }
    }

    evolve(resetLevels) {
        this.players.forEach(p => p.evolve(resetLevels))
    }
}

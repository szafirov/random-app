import Random from 'random-js';
import Player from './Player'

export default class Pair {

    constructor(index, defense) {
        this.index = index
        this.level = 0
        this.random = new Random(Random.engines.mt19937().autoSeed());
        this.players = [new Player(defense), new Player(defense)]
    }

    placeBets(slots) {
        // console.debug(slots)
        const nextSlot = slots ? slots[0] : (this.random.bool() ? 1 : 0)
        this.players[0].placeBet(nextSlot)
        this.players[1].placeBet(1 - nextSlot)
    }

    playerBySlot(slot) {
        return this.players[0].slot === slot ? this.players[0] : this.players[1]
    }

    computeRow(outcome) {
        this.players.forEach(p => p.computeGain(outcome))
        const formatIndex = player => player.index + (player.star ? '*' : '')
        this.gain = this.players[0].gain + this.players[1].gain
        const formatGain = gain => (gain >= 0 ? '+' : '-') + Math.abs(gain)
        const formatProperty = (prop) => this.players.map(p => p[prop]).join(':')
        return {
            index: this.players.map(formatIndex).join(':'),
            level: this.level,
            slots: this.players.map(p => p.slot),
            slot: formatProperty('slot'),
            bet: formatProperty('bet'),
            match: this.players[0].won ? 'W:L' : 'L:W',
            pairGain: this.players.map(p => formatGain(p.gain)).join(''),
            outcome,
        }
    }

    evolve() {
        this.resetLevels = false
        this.players.forEach(p => p.evolve())
        this.level = Math.max(this.players[0].level, this.players[1].level)
        this.players.forEach(p => p.level = this.level)
    }

    canReset() {
        return this.level > 0 || this.players.filter(p => p.index > 5).length > 0
    }

    reset() {
        this.resetLevels = true
        this.players.forEach(p => p.reset())
    }
}
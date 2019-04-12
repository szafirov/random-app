import Random from 'random-js'
import Player from './Player'

export default class Pair {

    constructor(defense, slotGenerator, prototype) {
        this.randomAfterResetRounds = 3
        this.roundsSinceReset = 0
        this.level = 0
        this.slotGenerator = slotGenerator
        this.random = new Random(Random.engines.mt19937().autoSeed())
        this.players = [new Player(defense), new Player(defense)]
        this.slotsPerRound = (prototype || {}).slotsPerRound || []
        // console.debug(this.slotsPerRound.join(','))
    }

    randomSlot() {
        return this.random.bool() ? 1 : 0
    }

    computeSlot(round) {
        if (this.roundsSinceReset < this.randomAfterResetRounds) return this.randomSlot()
        if (this.slotsPerRound && round < this.slotsPerRound.length)
            return this.slotsPerRound[round]
        return this.slotGenerator(this.roundsSinceReset - this.randomAfterResetRounds)
    }

    placeBets(round) {
        this.slotsPerRound[round] = this.computeSlot(round)
        // console.debug(this.slotsPerRound.length, round, this.slotsPerRound[round])
        this.players[0].placeBet( this.slotsPerRound[round])
        this.players[1].placeBet(1 - this.slotsPerRound[round])
        this.roundsSinceReset++
        // console.debug(this.players.map(p => p.bet))
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
        return this.level > 0 || this.players.filter(p => p.index > 2).length > 0
    }

    reset() {
        this.resetLevels = true
        this.players.forEach(p => p.reset())
        this.roundsSinceReset = 0
    }
}
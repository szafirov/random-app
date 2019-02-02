import Random from 'random-js';
import Player from './Player'

export default class Pair {

    constructor(index, defense) {
        this.index = index
        this.random = new Random(Random.engines.mt19937().autoSeed());
        this.players = [new Player(defense), new Player(defense)]
    }

    placeBets() {
        const randomSlot = this.random.bool() ? 1 : 0
        this.players[0].placeBet(randomSlot)
        this.players[1].placeBet(1 - randomSlot)
    }

    playerBySlot(slot) {
        return this.players[0].slot === slot ? this.players[0] : this.players[1]
    }

    evolve(outcome) {
        this.players.forEach(p => p.evolve(outcome))
        this.gain = this.players[0].gain + this.players[1].gain
        this.level = Math.max(this.players[0].level, this.players[1].level)
        this.players.forEach(p => p.level = this.level)
        const formatGain = gain => (gain >= 0 ? '+' : '-') + Math.abs(gain)
        const formatIndex = player => player.index + (player.star ? '*' : '')
        const format = (prop) => this.players.map(p => p[prop]).join(':')
        return {
            index: this.players.map(formatIndex).join(':'),
            level: this.level,
            slot: format('slot'),
            bet: format('bet'),
            match: this.players[0].won ? 'W:L' : 'L:W',
            gain: this.players.map(p => formatGain(p.gain)).join() + '=' + this.gain,
            outcome,
        }
    }

    resetLevel() {
        this.players.forEach(p => p.resetLevel())
    }
}
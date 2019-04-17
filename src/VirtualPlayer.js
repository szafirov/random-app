import {sum, shouldResetLevels} from './Common.js'
import Pair from './Pair.js'

export default class VirtualPlayer {
    constructor(pairs, defense, pairSlotGenerator, prototype) {
        this.pairs = [...Array(pairs).keys()].map(index =>
            new Pair(defense, pairSlotGenerator, (prototype || {pairs: []}).pairs[index]))
        this.gain = 0
        this.total = 0
        this.max = 0
    }

    placeBets(round) {
        this.pairs.forEach(pair => pair.placeBets(round))
        this.bet = this.betAmount()
        return this.bet
    }

    computeRows(outcome) {
        const rows = this.pairs.map(pair => pair.computeRow(outcome))
        this.gain = this.pairs.map(pair => pair.gain).reduce(sum)
        return this.addTotal(rows)
    }

    computeGain(outcome, won) {
        const rows = this.pairs.map(pair => pair.computeRow(outcome))
        this.gain = (won ? 1 : -1) * this.betAmount()
        return this.addTotal(rows)
    }

    addTotal(rows) {
        this.total += this.gain
        return rows.map((row, pair) => ({
            ...row,
            pair,
            gain: this.gain,
            total: this.total,
        }))
    }

    evolve(resetLevels) {
        this.pairs.forEach(pair => {
            if (resetLevels && pair.canReset()) pair.reset()
            else pair.evolve()
        })
    }

    betAmount = () => {
        // console.debug(this.pairs)
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce(sum)
        // console.debug(`betSum: ${betSum(0)} - ${betSum(1)}`)
        return Math.abs(betSum(0) - betSum(1))
    }
    placeBetsAndComputeRow = (round, outcome, slot) => {
        const bet = this.placeBets(round)
        const won = slot === outcome
        const oldTotal = this.total
        this.computeGain(outcome, won)
        const resetLevels = this.resetOrEvolve(oldTotal)
        return {
            round,
            pair: 0,
            bet,
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain: this.gain,
            total: this.total,
            max: this.max,
            resetLevels
        }
    }
    resetOrEvolve = (oldTotal) => {
        const oldMax = this.max
        this.max = Math.max(this.max, this.total)
        const resetLevels = shouldResetLevels(oldTotal, this.total, oldMax, this.max)
        this.evolve(resetLevels)
        return resetLevels
    }

}
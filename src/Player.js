// const coefficients = [1, 1, 1, 2, 2, 4, 6, 10, 16, 26]
// const coefficients = [1, 1, 1, 2, 2, 3, 4, 7, 11, 18]
const coefficients = [1, 1, 2, 2, 3, 4, 4, 7, 10, 15, 18]

// const hasStarIndex = (index) => index < 5 && index !== 3
// const hasStarIndex = (index) => index <= 6

const increment = (won, index, star) => {
    if (won) {
        if (star) {
            return {
                index: 0
            }
        } else {
            return {
                index,
                star: true
            }
        }
    } else {
        return { index: index + 1 }
    }
}

export default class Player {

    constructor(defense) {
        this.defense = defense
        this.index = 0
        this.level = 0
        this.star = false
        this.slot = 0
        this.bet = 0
    }

    placeBet(slot) {
        this.slot = slot
        const levelMultiplier = this.star ? 2 : coefficients[this.index]
        this.bet = levelMultiplier * this.defense ** this.level
    }

    computeGain(outcome) {
        this.won = this.slot === outcome
        this.gain = (this.won ? 1 : -1) * this.bet
    }

    evolve() {
        const { index, star } = increment(this.won, this.index, this.star)
        this.index = index
        this.star = star
        if (this.index === coefficients.length) {
            this.level += 1
            this.index = 0
        }
    }

    reset() {
        this.level = this.index = 0
        this.star = false
    }
}
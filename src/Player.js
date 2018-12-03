const coefficients = [1, 1, 1, 2, 2, 4, 6, 10, 16, 26]

const increment = (won, index, star) => {
    if (won) {
        if (index < 5 && index !== 3) {
            return star ? 0 : index
        } else {
            return index - 3
        }
    } else {
        return index + 1
    }
}

export default class Player {

    constructor(defense) {
        this.defense = defense
        this.index = 0
        this.level = 0
        this.star = false
    }

    placeBet(slot) {
        this.slot = slot
        const levelMultiplier = this.star ? 2 : coefficients[this.index]
        this.bet = levelMultiplier * this.defense ** this.level
    }

    evolve(outcome) {
        this.won = this.slot === outcome
        this.gain = (this.won ? 1 : -1) * this.bet
        const nextStar = this.won && this.index < 5 && this.index !== 3 && !this.star
        this.index = increment(this.won, this.index, this.star)
        this.star = nextStar
        if (this.index === 10) {
            this.level += 1
            this.index = 0
        }
    }

    resetLevel() {
        this.level = 0
        this.index = 0
        this.star = false
    }
}
export default class Player {

  constructor() {
    this.round = -1
    this.value = 0
    this.index = 0
    this.level = 0
    this.star = false
    this.won = false
    this.coefficients = [1,1,1,2,2,4,6,10,16,26]
  }

  play () {
    this.round += 1
    this.won = Math.random() > 0.5
    this.value += (this.won ? 1 : -1) * this.betFactor()
    const newStar = this.won && this.index < 5 && this.index !== 3 && !this.star
    this.index = this.increment(this.won, this.index, this.star)
    if (this.index === 10) {
      this.level += 1
      this.index = 0
    }
    this.star = newStar
    return {
      round: this.round,
      won: this.won ? 1 : 0,
      index: this.index,
      level: this.level,
      bet: this.betFactor(),
      value: this.value
    }
  }

  betFactor = () => (this.star ? 2 : this.coefficients[this.index]) * (this.level + 1)

  increment (won, index, star) {
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
}
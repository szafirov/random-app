const coefficients = [1,1,1,2,2,4,6,10,16,26]

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

  constructor(defense, leader) {
    this.defense = defense
    this.leader = leader
    this.index = 0
    this.level = 0
    this.star = false
    this.won = false
  }

  play (outcome) {
    this.betSlot = this.leader ? 1 - this.leader.betSlot : Math.random() > 0.5
    this.won = this.leader ? !this.leader.won : outcome === this.betSlot
    this.bet = this.betFactor()
    this.gain = (this.won ? 1 : -1) * this.bet
    return {
      index: this.index,
      star: this.star,
      level: this.level,
      betSlot: this.betSlot ? 1 : 0,
      bet: this.bet,
      gain: this.gain,
    }
  }

  evolve () {
    const nextStar = this.won && this.index < 5 && this.index !== 3 && !this.star
    this.index = increment(this.won, this.index, this.star)
    this.star = nextStar
    if (this.index === 10) {
      this.level += 1
      this.index = 0
    }
    return this.level
  }

  reset () {
    this.level = 0
    this.index = 0
    this.star = false
  }

  betFactor = () => {
    const levelIndex = this.star ? 2 : coefficients[this.index]
    return levelIndex * (this.defense ** (this.level + 1))
  }

}
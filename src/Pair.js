export default class Pair {

  constructor(index, leader, follower) {
    this.index = index
    this.leader = leader
    this.follower = follower
  }

  play() {
    this.outcome = Math.random() > 0.5
    const leaderState = this.leader.play(this.outcome)
    const followerState = this.follower.play(this.outcome)
    this.gain = this.leader.gain + this.follower.gain
    const formatGain = gain => (gain >= 0 ? '+' : '-') + Math.abs(gain)
    const formatIndex = state => state.index + (state.star ? '*' : '')
    const format = (a, b) => a + ':' + b
    return {
      index: format(formatIndex(leaderState), formatIndex(followerState)),
      level: format(leaderState.level, followerState.level),
      betSlot: format(leaderState.betSlot ? 1 : 0, followerState.betSlot ? 1 : 0),
      bet: format(leaderState.bet, followerState.bet),
      outcome: this.outcome ? 1 : 0,
      match: this.leader.won ? 'W:L' : 'L:W',
      gain: formatGain(leaderState.gain) + formatGain(followerState.gain) + '=' + this.gain,
    }
  }

  evolve(level) {
    const maxLevel = Math.max(this.leader.evolve(), this.follower.evolve())
    this.leader.level = level || maxLevel
    this.follower.level = level || maxLevel
  }

  resetLevel() {
    this.leader.reset()
    this.follower.reset()
  }
}
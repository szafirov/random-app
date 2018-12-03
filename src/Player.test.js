import Player from './Player.js'

describe("play", () => {
    it("should bet accordingly", () => {
        const p = new Player(1)
        p.placeBet(1)
        p.evolve(1)
        const { bet, defense, gain, index, level, slot, star, won } = p
        expect({ bet, defense, gain, index, level, slot, star, won }).toEqual({
            bet: 1,
            defense: 1,
            gain: 1,
            index: 0,
            level: 0,
            slot: 1,
            star: true,
            won: true
        });
    })
})
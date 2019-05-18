import Random from "random-js";

export function newRandomGenerator() {
    const randomEngine = new Random(Random.engines.mt19937().autoSeed())
    return () => randomEngine.bool() ? 1 : 0
}

const newRepeatingGenerator = (count) => (round) => round % (2 * count) < count ? 1 : 0

const alwaysOne = () => 1

export function slotGeneratorByName(slotGeneratorName) {
    if (slotGeneratorName === 'random') {
        return newRandomGenerator()
    }
    const repeat = parseInt(slotGeneratorName, 10)
    return repeat ? newRepeatingGenerator(repeat) : alwaysOne
}

export function dualSlotGenerator(generator) {
    let slot
    return [
        round => {
            slot = generator(round)
            return slot
        },
        () => 1 - slot
    ]
}

export function slotAlternator(bet1, bet2, slot) {
    return bet1 < bet2 ? 1 - slot : slot
}
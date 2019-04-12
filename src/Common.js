export default class Common {
    static shouldResetLevels (oldTotal, newTotal, oldMax, newMax) {
        return (oldTotal < oldMax && newTotal === newMax) || (newTotal >= 0 && oldTotal < 0)
    }
}
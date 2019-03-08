import React, { Component } from 'react';
import './App.css';

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import ReactTable from 'react-table';
import 'react-table/react-table.css'
import Random from 'random-js';
import VirtualPlayer from './VirtualPlayer';

const outcomeEngine = new Random(Random.engines.mt19937().autoSeed())
const slotEngine = new Random(Random.engines.mt19937().autoSeed())
const randomOutcome = () => outcomeEngine.bool() ? 1 : 0
const randomSlot = () => slotEngine.bool() ? 1 : 0
const genRandom = () => () => randomSlot()
const genRepeat = (count) => {
    let i = 0;
    return () => i++ % (2 * count) < count ? 1 : 0
}
const column = (Header, accessor, width = 50) => ({ Header, accessor, width, sortable: false })

class App extends Component {
    constructor(props) {
        super(props)
        this.chart = {
            margins: {
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
            }
        }
        this.state = {
            rounds: 1000,
            defense: 2,
            pairs: 10,
            chartData: [],
            pageData: [],
            mode: 'simRand',
            currentRound: 0,
            currentPair: 0,
            currentPage: 1,
            pageCount: 0,
        }
        this.slots = []
        const matchCol = {
            ...column('Match', 'match', 60),
            Cell: row => (
                <span style={{
                    color: row.value === 'L' ? '#ff2e00' : '#57d500',
                    transition: 'all .3s ease'
                }}>{row.value}</span>
            )
        }
        this.columnsForMode = (mode) => {
            switch (mode) {
                case 'simulatePairs':
                    return [
                        column('Round', 'round', 60),
                        column('Level', 'level'),
                        column('Index', 'index', 60),
                        column('Slot', 'slot'),
                        column('Bet', 'bet'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('Pair Gain', 'pairGain', 90),
                        column('Gain', 'gain'),
                        column('Total', 'total', 60),
                        column('Max', 'max', 60)
                    ]
                default:
                    return [
                        column('Round', 'round', 60),
                        column('BRP1', 'bet1', 60),
                        column('BRP2', 'bet2', 60),
                        column('Bet', 'bet'),
                        column('Slot', 'slot'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('TRP1', 'total1', 60),
                        column('TRP2', 'total2', 60),
                        column('Total', 'total', 60),
                        column('Max', 'max', 60)
                    ]
                // default:
                //     return [
                //         column('Round', 'round', 60),
                //         column('Bet', 'bet'),
                //         column('Slot', 'slot'),
                //         column('Out', 'outcome'),
                //         matchCol,
                //         column('Gain', 'gain'),
                //         column('Total', 'total', 60),
                //         column('Max', 'max', 60)
                //     ]
            }
        }
        this.pageSize = 20

        this.scroll = (direction) => {
            const { currentRound, currentPair } = this.state
            this.viewPageFor(currentRound + direction * this.pageSize, currentPair)
        }

        this.reloadPage = (round = Math.min(this.state.rounds - 1, this.state.currentRound),
                          pair = Math.min(this.state.pairs - 1, this.state.currentPair)) =>
            this.viewPageFor(round, pair, true)

        this.viewPageFor = (round, pair, forceReset = false) => {
            const { currentPage, currentRound } = this.state
            const computePage = round => Math.floor(round / this.pageSize) + 1
            const page = computePage(round)
            // console.debug(round, page, currentPage, forceReset)
            if (currentPage !== page || this.state.currentPair !== pair || forceReset) {
                const pageData = this.data.filter(row => computePage(row.round) === page && row.pair === pair)
                this.setState({
                    currentRound: round,
                    currentPage: page,
                    currentPair: pair,
                    pageData,
                })
            } else if (round !== currentRound) {
                this.setState({ currentRound: round })
            }
        }
        this.resetData()
    }

    changeMode = (mode) => {
        this.setState({ mode, pageCount: 0 })
        this.resetData()
        this.viewPageFor(0, 0, true)
    }

    resetData = () => {
        this.round = 0
        this.won = 0
        this.bets = undefined
        this.data = []
        this.max = 0
        const { defense, pairs } = this.state
        this.vp1 = new VirtualPlayer(pairs, defense)
        this.vp2 = new VirtualPlayer(pairs, defense)
        this.setState({ chartData: [] });
    }

    start = () => {
        this.resetData()
        this.reloadPage()
        switch (this.state.mode) {
            case 'simulatePairs': this.runPairSimulation(); break
            case 'manual': this.runManualPlayer(); break
            // case 'simRand': this.runRealPlayerSimulation(genRandom()); break
            case 'simRand': this.runTwoRealPlayersSimulation(genRandom()); break
            default: this.runTwoRealPlayersSimulation(genRepeat(parseInt(this.state.mode, 10))); break
            // default: this.runRealPlayerSimulation(genRepeat(parseInt(this.state.mode, 10))); break
        }
    }

    runRealPlayerSimulation = (slotGenerator) => {
        const { rounds, locked } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const bet = this.vp1.placeBets(locked && this.slots[round])
            const slot = slotGenerator()
            const outcome = randomOutcome()
            const won = slot === outcome
            const oldTotal = this.vp1.total
            const rows = this.vp1.computeGain(outcome, won)
            const resetLevels = this.evolve(oldTotal, this.vp1.total)
            this.slots[round] = rows.map(({ slots }) => slots)
            return {
                round,
                pair: 0,
                bet,
                slot,
                outcome,
                match: won ? 'W' : 'L',
                gain: this.vp1.gain,
                total: this.vp1.total,
                max: this.max,
                resetLevels
            }
        })
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runTwoRealPlayersSimulation = (slotGenerator) => {
        const { rounds, locked } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const bet1 = this.vp1.placeBets(locked && this.slots[round])
            const bet2 = this.vp2.placeBets(locked && this.slots[round])
            const bet = Math.abs(bet1 - bet2)
            const slot = slotGenerator()
            const outcome = randomOutcome()
            const won = slot === outcome
            const won1 = won === (bet1 >= bet2)
            const won2 = won === (bet1 < bet2)
            const oldTotal = this.vp1.total + this.vp2.total
            this.vp1.computeGain(outcome, won1)
            this.vp2.computeGain(outcome, won2)
            const newTotal = this.vp1.total + this.vp2.total
            const resetLevels = this.shouldResetLevels(oldTotal, newTotal) && (this.vp1.hasPairsToReset() || this.vp2.hasPairsToReset())
            this.vp1.evolve(resetLevels)
            this.vp2.evolve(resetLevels)
            this.max = Math.max(this.max, newTotal)
            return {
                round,
                pair: 0,
                bet1: bet1,
                bet2: bet2,
                bet: bet,
                slot,
                outcome,
                match: won ? 'W' : 'L',
                total1: this.vp1.total,
                total2: this.vp2.total,
                total: newTotal,
                max: this.max,
                resetLevels
            }
        })
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runManualPlayer = () => {
        this.vp1.placeBets(this.state.locked && this.slots[this.round])
    }

    nextBet = (won) => {
        if (won) this.won = this.won + 1
        const outcome = randomOutcome()
        const slot = won ? outcome : 1 - outcome
        const oldTotal = this.vp1.total
        const rows = this.vp1.computeGain(outcome, won)
        const resetLevels = this.evolve(oldTotal, this.vp1.total)
        this.slots[this.round] = rows.map(({ slots }) => slots)
        // console.debug(this.data)
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.vp1.betAmount(),
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain: this.vp1.gain,
            total: this.vp1.total,
            max: this.max,
            resetLevels
        })
        this.runManualPlayer()
        this.displayChartAndTable()
        this.reloadPage(this.round)
        this.round = this.round + 1
    }

    runPairSimulation = () => {
        const { rounds, locked } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            this.vp1.placeBets(locked && this.slots[round])
            const outcome = randomOutcome()
            const oldTotal = this.vp1.total
            const rows = this.vp1.computeRows(outcome)
            this.evolve(oldTotal, this.vp1.total);
            this.slots[round] = rows.map(({ slots }) => slots)
            return rows.map(row => ({
                ...row,
                round,
                max: this.max,
                resetLevels: this.vp1.pairs[row.pair].resetLevels
            }))
        })
        // console.debug(this.data)
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    evolve(oldTotal, newTotal) {
        const resetLevels = this.shouldResetLevels(oldTotal, newTotal) && this.vp1.hasPairsToReset()
        this.vp1.evolve(resetLevels)
        this.max = Math.max(this.max, newTotal)
        return resetLevels;
    }

    shouldResetLevels = (oldTotal, newTotal) => (newTotal > this.max && this.max > 0) || (oldTotal < 0 && newTotal >= 0)
    displayChartAndTable = (rounds = 1000) => {
        const maxSampleRate = 1000
        const sampleRate = Math.max(1, Math.floor(rounds / maxSampleRate))
        const chartData = this.data.filter(row => row.round % sampleRate === 0)
        // console.debug(JSON.stringify(this.data))
        const pageCount =  Math.ceil(this.data.filter(row => row.pair === this.state.currentPair).length / this.pageSize)
        this.setState({ chartData, pageCount });
        // console.debug(JSON.stringify(this.state))
    }

    render() {
        const {
            defense,
            pairs,
            rounds,
            chartData,
            pageData,
            currentPair,
            currentRound,
            currentPage,
            pageCount,
            mode
        } = this.state
        const up = <button onClick={() => this.scroll(-1)} disabled={currentPage === 1}>▲</button>
        const down = <button onClick={() => this.scroll(1)} disabled={currentPage >= pageCount }>▼</button>
        const controls = {
            simulatePairs:
                <div style={{ width: 700 }}>
                    {up}
                    <label>
                        <select value={currentPair}
                            onChange={e => this.viewPageFor(this.state.currentRound, parseInt(e.target.value, 10))}>
                            {[...Array(this.state.pairs).keys()].map(p => <option key={p} value={p}>Pair {p + 1}</option>)}
                        </select>
                    </label>
                    {down}
                </div>,
            manual:
                <div style={{ width: 700, textAlign: 'left' }}>
                    {up}
                    <label>
                        <strong>Bet:</strong>
                        <input value={this.vp1.betAmount()} style={{ width: 50 }} readOnly />
                    </label>
                    <button onClick={() => this.nextBet(true)}>
                        Won ({ this.won })</button>
                    <button onClick={() => this.nextBet(false)}>
                        Lost ({ this.round - this.won })</button>
                    <label><strong>Total: {this.vp1 ? this.vp1.total : 0}</strong></label>
                    {down}
                </div>,
            simRand: <div style={{ width: 700 }}>{up}<span style={{ width: 500 }}>&nbsp;</span>{down}</div>,
        }
        const rowBackground = rowInfo => {
            if (rowInfo && rowInfo.row.round === currentRound) return '#ccc'
            if (rowInfo && rowInfo.row._original.resetLevels) return '#ff2e00'
            return ''
        }
        const columnBackground = colInfo =>
            (colInfo && colInfo.id === 'slot' && this.state.locked && this.state.mode === 'simulatePairs')
                ? '#ccc'
                : ''
        return (
            <div className="app">
                <div className="container">
                    <div style={{ width: 700 }}>
                        <label>
                            Def: <input type="number" min="2" max="10" value={defense} style={{ width: 30 }}
                                onChange={e => this.setState({ defense: parseInt(e.target.value, 10) })} />
                        </label>
                        <label>
                            Pairs: <input type="number" min="1" max="30" value={pairs} style={{ width: 30 }}
                                onChange={e => this.setState({ pairs: parseInt(e.target.value, 10) })} />
                        </label>
                        <label>
                            Rounds: <input type="number" min="0" max="10000" value={rounds} style={{ width: 60 }}
                                onChange={e => this.setState({ rounds: parseInt(e.target.value, 10) })} />
                        </label>
                        <label>
                            Mode:
                            <select value={mode} onChange={e => this.changeMode(e.target.value)} style={{ width: 130 }}>
                                <option value="simRand">Sim Rand</option>
                                {[...Array(5).keys()].map(p => p + 1)
                                    .map(p => <option key={p} value={p}>Sim 1x{p},0x{p}</option>)}
                                {/*<option value="manual">Manual</option>*/}
                                <option value="simulatePairs">Sim Pairs</option>
                            </select>
                        </label>
                        <label>
                            Lock:
                            <input type="checkbox" onClick={e => this.setState({ locked: e.target.checked })} />
                        </label>
                        <button onClick={this.start}>▶</button>
                    </div>
                    {controls[mode] || controls['simRand']}
                    <div style={{ fontSize: 'x-small', border: '1px solid grey' }}>Mar08 18h00</div>
                </div>
                <div className="container">
                    <AreaChart width={700}
                        height={700}
                        data={chartData}
                        margin={this.chart.margins}>
                        <XAxis dataKey="round" />
                        <YAxis />
                        <CartesianGrid strokeDasharray="3 3" />
                        <Tooltip
                            isAnimationActive={false}
                            content={<CustomTooltip onActive={round => this.viewPageFor(round, currentPair)} />}
                        />
                        <Area type='monotone'
                            dataKey='total'
                            stroke='#8884d8'
                            fill='#8884d8'
                            isAnimationActive={false} />
                        <Area type='monotone'
                            dataKey='total1'
                            fill='#08a408'
                            stroke='#08a408'
                            isAnimationActive={false} />
                        <Area type='monotone'
                            dataKey='total2'
                            fill='#a82408'
                            stroke='#a82408'
                            isAnimationActive={false} />
                    </AreaChart>
                    <ReactTable
                        data={pageData}
                        columns={this.columnsForMode(this.state.mode)}
                        showPagination={false}
                        className="table -highlight"
                        getTrProps={(state, rowInfo) => ({
                            style: {
                                background: rowBackground(rowInfo)
                            }
                        })}
                        getTdProps={(state, rowInfo, column) => ({

                            style: {
                                background: columnBackground(column)
                            }
                        })}
                    />
                </div>
            </div>
        );
    }
}

/**
 * @return {null}
 */
function CustomTooltip(props) {
    const { active, label, onActive } = props
    if (active && label) onActive(label)
    return null
}

export default App;

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
const gen1010 = () => {
    let i = 0;
    return () => i++ % 2 === 0 ? 1 : 0
}
const gen1100 = () => {
    let i = 0;
    return () => i++ % 4 < 2 ? 1 : 0
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
            mode: 'simRPRand',
            currentRound: 0,
            currentPair: 0,
            currentPage: 1,
            pageCount: 0,
        }
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
                case 'sim2RPRand':
                case 'sim2RP1010':
                case 'sim2RP1100':
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
                default:
                    return [
                        column('Round', 'round', 60),
                        column('Bet', 'bet'),
                        column('Slot', 'slot'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('Gain', 'gain'),
                        column('Total', 'total', 60),
                        column('Max', 'max', 60)
                    ]
            }
        }
        this.pageSize = 20
        this.scroll = (direction) => {
            const { currentRound, currentPair } = this.state
            this.viewPageFor(currentRound + direction * this.pageSize, currentPair)
        }
        this.resetPage = (round = 0, pair = 0) => this.viewPageFor(round, pair, true)
        this.viewPageFor = (round, pair, resetPage = false) => {
            const { currentPage, currentRound } = this.state
            const computePage = round => Math.floor(round / this.pageSize) + 1
            const page = computePage(round)
            // console.debug(row, page, currentPage, resetPage)
            if (currentPage !== page || this.state.currentPair !== pair || resetPage) {
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
        this.setState({ mode })
        this.resetData()
        this.resetView()
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
    }

    resetView() {
        this.setState({ chartData: [], pageCount: 0 });
        this.resetPage()
    }

    start = () => {
        this.resetData()
        this.resetView()
        switch (this.state.mode) {
            case 'simulatePairs': this.runPairSimulation(); break
            case 'manual': this.runManualPlayer(); break
            case 'simRPRand': this.runRealPlayerSimulation(genRandom()); break
            case 'simRP1010': this.runRealPlayerSimulation(gen1010()); break
            case 'simRP1100': this.runRealPlayerSimulation(gen1100()); break
            case 'sim2RPRand': this.runTwoRealPlayersSimulation(genRandom()); break
            case 'sim2RP1010': this.runTwoRealPlayersSimulation(gen1010()); break
            case 'sim2RP1100': this.runTwoRealPlayersSimulation(gen1100()); break
            default: console.error(this.state.mode); break
        }
    }

    runRealPlayerSimulation = (slotGenerator) => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const bet = this.vp1.placeBets()
            const slot = slotGenerator()
            const outcome = randomOutcome()
            const won = slot === outcome
            const total = this.vp1.computeGain(outcome, won)
            const resetLevels = this.evolve(total);
            return {
                round,
                pair: 0,
                bet,
                slot,
                outcome,
                match: won ? 'W' : 'L',
                gain: this.vp1.gain,
                total,
                max: this.max,
                resetLevels
            }
        })
        this.displayChartAndTable(rounds)
        this.resetPage()
    }

    runTwoRealPlayersSimulation = (slotGenerator) => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const bet1 = this.vp1.placeBets()
            const bet2 = this.vp2.placeBets()
            const bet = Math.abs(bet1 - bet2)
            const slot = slotGenerator()
            const outcome = randomOutcome()
            const won = slot === outcome
            const won1 = won === (bet1 >= bet2)
            const won2 = won === (bet1 < bet2)
            const total1 = this.vp1.computeGain(outcome, won1)
            const total2 = this.vp2.computeGain(outcome, won2)
            const total = total1 + total2
            const resetLevels = this.shouldResetLevels() && (this.vp1.hasPairsToReset() || this.vp2.hasPairsToReset())
            this.vp1.evolve(resetLevels)
            this.vp2.evolve(resetLevels)
            this.max = Math.max(this.max, total)
            return {
                round,
                pair: 0,
                bet1: bet1,
                bet2: bet2,
                bet: bet,
                slot,
                outcome,
                match: won ? 'W' : 'L',
                total1,
                total2,
                total,
                max: this.max,
                resetLevels
            }
        })
        this.displayChartAndTable(rounds)
        this.resetPage()
    }

    runManualPlayer = () => {
        this.vp1.placeBets()
    }

    nextBet = (won) => {
        if (won) this.won = this.won + 1
        const outcome = randomOutcome()
        const slot = won ? outcome : 1 - outcome
        const total = this.vp1.computeGain(outcome, won)
        const resetLevels = this.evolve(total);
        // console.debug(this.data)
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.vp1.betAmount(),
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain: this.vp1.gain,
            total,
            max: this.max,
            resetLevels
        })
        this.runManualPlayer()
        this.displayChartAndTable()
        this.resetPage(this.round)
        this.round = this.round + 1
    }

    runPairSimulation = () => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            this.vp1.placeBets()
            const outcome = randomOutcome()
            const rows = this.vp1.computeRows(outcome)
            this.evolve(this.vp1.total);
            return rows.map(row => ({
                ...row,
                round,
                max: this.max,
                resetLevels: this.vp1.pairs[row.pair].resetLevels
            }))
        })
        console.debug(this.data)
        this.displayChartAndTable(rounds)
        this.resetPage(0, 0)
    }

    evolve(total) {
        const resetLevels = this.shouldResetLevels(total) && this.vp1.hasPairsToReset()
        this.vp1.evolve(resetLevels)
        this.max = Math.max(this.max, total)
        return resetLevels;
    }

    shouldResetLevels = (total) => this.max > 0 && total > this.max

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
            simRPRand: <div style={{ width: 700 }}>{up}<span style={{ width: 500 }}>&nbsp;</span>{down}</div>,
            simRP1010: <div style={{ width: 700 }}>{up}<span style={{ width: 500 }}>&nbsp;</span>{down}</div>,
            simRP1100: <div style={{ width: 700 }}>{up}<span style={{ width: 500 }}>&nbsp;</span>{down}</div>
        }
        const rowBackground = rowInfo => {
            if (rowInfo && rowInfo.row.round === currentRound) return '#ccc'
            if (rowInfo && rowInfo.row._original.resetLevels) return '#e00'
            return ''
        }
        return (
            <div className="app">
                <div className="container">
                    <div style={{ width: 700 }}>
                        <label>
                            Defense: <input type="number" min="2" max="10" value={defense} style={{ width: 30 }}
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
                                <option value="simRPRand">Sim Rand</option>
                                <option value="simRP1010">Sim 1010&hellip;</option>
                                <option value="simRP1100">Sim 1100&hellip;</option>
                                <option value="manual">Manual</option>
                                <option value="simulatePairs">Sim Pairs</option>
                            </select>
                        </label>
                        <button onClick={this.start}>Start</button>
                    </div>
                    {controls[mode]}
                    <div style={{ fontSize: 'x-small', border: '1px solid red' }}>Updated: Feb 12, 19h19</div>
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

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
const column = (Header, accessor, width = 65) => ({ Header, accessor, width, sortable: false })

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
            tableData: [],
            mode: 'simRPRand',
            currentRow: 0,
            currentPair: 0,
            currentPage: 1
        }
        const matchCol = {
            ...column('Match', 'match'),
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
                        column('Round', 'round'),
                        column('Level', 'level'),
                        column('Index', 'index'),
                        column('Slot', 'slot'),
                        column('Bet', 'bet'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('Gain', 'gain'),
                        column('Total', 'total'),
                        column('Max', 'max')
                    ]
                case 'manual':
                    return [
                        column('Round', 'round'),
                        column('Bet', 'bet'),
                        column('Out', 'outcome'),
                        column('Slot', 'slot'),
                        matchCol,
                        column('Gain', 'gain'),
                        column('Total', 'total'),
                        column('Max', 'max')
                    ]
                default:
                    return [
                        column('Round', 'round'),
                        column('Slot', 'slot'),
                        column('BRP1', 'bet1'),
                        column('BRP2', 'bet2'),
                        column('Bet', 'bet'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('TRP1', 'total1'),
                        column('TRP2', 'total2'),
                        column('Total', 'total'),
                    ]
            }
        }
        this.viewPageFor = (currentRow, currentPair, resetPage) => {
            const computePage = row => Math.floor(row / 20)
            const currentPage = computePage(currentRow)
            if (this.state.currentRow !== currentRow || this.state.currentPair !== currentPair || resetPage) {
                // console.debug(currentRow, currentPair, currentPage)
                const tableData = this.data.filter(row =>
                    computePage(row.round) === currentPage && row.pair === currentPair)
                this.setState({
                    currentRow,
                    currentPage,
                    currentPair,
                    tableData,
                })
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
        const { defense, pairs } = this.state
        this.vp1 = new VirtualPlayer(pairs, defense)
        this.vp2 = new VirtualPlayer(pairs, defense)
    }

    resetView() {
        this.setState({ chartData: [] });
        this.viewPageFor(0, 0, 'resetPage')
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
            default: console.error(this.state.mode); break
        }
    }

    runRealPlayerSimulation = (slotGenerator) => {
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
            this.vp1.evolve(outcome, won1)
            this.vp2.evolve(outcome, won2)
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
                total: this.vp1.total + this.vp2.total
            }

        })
        this.displayChartAndTable(rounds)
        this.viewPageFor(0, 0, 'resetPage')
    }

    runManualPlayer = () => {
        this.vp1.placeBets()
    }

    nextBet = (won) => {
        this.round = this.round + 1
        if (won) this.won = this.won + 1
        const outcome = randomOutcome()
        this.vp1.computeRowsAndEvolve(outcome, won)
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.vp1.betAmount(),
            slot: won ? outcome : 1 - outcome,
            outcome,
            match: won ? 'W' : 'L',
            gain: this.vp1.gain,
            total: this.vp1.total,
            max: this.vp1.max
        })
        // console.debug(JSON.stringify(this.data))
        this.runManualPlayer()
        this.displayChartAndTable()
        this.viewPageFor(this.round, 0)
    }

    runPairSimulation = () => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            this.vp1.placeBets()
            const outcome = randomOutcome()
            const slot = randomSlot()
            const rows = this.vp1.computeRowsAndEvolve(outcome, slot === outcome)
            // console.debug(JSON.stringify(rows))
            return rows.map(row => ({...row, round}))
        })
        this.displayChartAndTable(rounds)
        this.viewPageFor(0, 0, 'resetPage')
    }

    displayChartAndTable = (rounds = 1000) => {
        const maxSampleRate = 1000
        const sampleRate = Math.max(1, Math.floor(rounds / maxSampleRate))
        const chartData = this.data.filter(row => row.round % sampleRate === 0)
        this.setState({ chartData });
    }

    render() {
        const {
            defense,
            pairs,
            rounds,
            chartData,
            tableData,
            currentPair,
            currentRow,
            mode
        } = this.state

        const controls = {
            simulatePairs:
                <div style={{ width: 700 }}>
                    <label>
                        <select value={currentPair}
                            onChange={e => this.viewPageFor(this.state.currentRow, parseInt(e.target.value, 10))}>
                            {[...Array(this.state.pairs).keys()].map(p => <option key={p} value={p}>Pair {p + 1}</option>)}
                        </select>
                    </label>
                </div>,
            manual:
                <div style={{ width: 700, textAlign: 'left' }}>
                    <label>
                        <strong>Bet:</strong>
                        <input value={this.vp1.betAmount()} style={{ width: 50 }} readOnly />
                    </label>
                    <button onClick={() => this.nextBet(true)}>
                        Won ({ this.won })</button>
                    <button onClick={() => this.nextBet(false)}>
                        Lost ({ this.round - this.won })</button>
                    <label><strong>Total: {this.vp1 ? this.vp1.total : 0}</strong></label>
                </div>,
            simRPRand: <div style={{ width: 700 }} />,
            simRP1010: <div style={{ width: 700 }} />,
            simRP1100: <div style={{ width: 700 }} />
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
                            Pairs: <input type="number" min="1" max="10" value={pairs} style={{ width: 30 }}
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
                        data={tableData}
                        columns={this.columnsForMode(this.state.mode)}
                        showPagination={false}
                        className="table -highlight"
                        getTrProps={(state, rowInfo) => ({
                            style: {
                                background: rowInfo && rowInfo.row.round === currentRow ? '#ccc' : ''
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

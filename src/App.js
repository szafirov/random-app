import React, { Component } from 'react';
import './App.css';

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import ReactTable from 'react-table';
import 'react-table/react-table.css'
import VirtualPlayer from './VirtualPlayer';

const randomOutcome = () => Math.random() > 0.5
const altRandom = () => () => randomOutcome()
const altGen1010 = () => {
    let i = 0;
    return () => i++ % 2 === 0
}
const altGen1100 = () => {
    let i = 0;
    return () => i++ % 4 < 2
}
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
            mode: 'simulateRandom',
            currentRow: 0,
            currentPair: 0,
            currentPage: 1
        }

        const columns = [
            {
                Header: 'Round',
                accessor: 'round',
                sortable: false
            }, {
                Header: 'Level',
                accessor: 'level',
                sortable: false
            }, {
                Header: 'Index',
                accessor: 'index',
                sortable: false
            }, {
                Header: 'Slot',
                accessor: 'slot',
                sortable: false
            }, {
                Header: 'Bet ($)',
                accessor: 'bet',
                sortable: false
            }, {
                Header: 'Out',
                accessor: 'outcome',
                sortable: false,
                // Cell: row => row.value ? 'P' : 'B'
            }, {
                Header: 'Match',
                accessor: 'match',
                Cell: row => (
                    <span style={{
                        color: row.value === 'L' ? '#ff2e00' : '#57d500',
                        transition: 'all .3s ease'
                    }}>{row.value}</span>
                ),
                sortable: false
            }, {
                Header: 'Gain',
                accessor: 'gain',
                sortable: false
            }, {
                Header: 'Total1',
                accessor: 'total1',
                sortable: false
            }, {
                Header: 'Total2',
                accessor: 'total2',
                sortable: false
            }, {
                Header: 'Total',
                accessor: 'total',
                sortable: false
            }, {
                Header: 'Max',
                accessor: 'max',
                sortable: false
            }
        ].map(column => {
            column.maxWidth = 65
            return column
        })

        this.columnsForMode = (mode) => {
            switch (mode) {
                case 'simulatePairs':
                    return columns.filter(col => ![
                        'total1',
                        'total2'
                    ].includes(col.accessor))
                case 'manualPlayer':
                    return columns.filter(col =>
                        [
                            'round',
                            'bet',
                            'outcome',
                            'match',
                            'gain',
                            'total',
                            'max'
                        ].includes(col.accessor))
                default:
                    return columns.filter(col =>
                        [
                            'round',
                            'outcome',
                            'total1',
                            'total2',
                            'total'
                        ].includes(col.accessor))
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
    }

    changeMode = (mode) => {
        this.setState({ mode })
        this.resetData()
    }

    resetData = () => {
        this.round = 0
        this.bets = undefined
        this.data = []
        const { defense, pairs } = this.state
        this.vp1 = new VirtualPlayer(pairs, defense)
        this.vp2 = new VirtualPlayer(pairs, defense)
        this.setState({ chartData: [] });
        this.viewPageFor(0, 0, 'resetPage')
    }

    start = () => {
        this.resetData()
        switch (this.state.mode) {
            case 'simulatePairs': this.runPairSimulation(); break
            case 'manualPlayer': this.runManual(); break
            case 'simulateRandom': this.runTwoPlayerSimulation(altRandom()); break
            case 'simulate1010': this.runTwoPlayerSimulation(altGen1010()); break
            case 'simulate1100': this.runTwoPlayerSimulation(altGen1100()); break
            default: console.error(this.state.mode); break
        }
    }

    runTwoPlayerSimulation = (outcomeGenerator) => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const outcome = outcomeGenerator() ? 1 : 0
            this.vp1.placeRandomBets()
            this.vp2.placeRandomBets()
            this.round = this.round + 1
            this.vp1.evolve(outcome, this.round)
            this.vp2.evolve(1 - outcome, this.round)
            return {
                round: this.round,
                pair: 0,
                outcome,
                total1: this.vp1.total,
                total2: this.vp2.total,
                total: this.vp1.total + this.vp2.total
            }
        })
        this.displayChartAndTable(rounds)
        this.viewPageFor(0, 0, 'resetPage')
    }

    runManual = () => {
        this.vp1.placeRandomBets()
        this.bets = this.vp1.bets()
    }

    nextBet = (won) => {
        const outcome = (this.bets[1] > this.bets[0]) === won ? 1 : 0
        this.round = this.round + 1
        this.vp1.evolve(outcome, this.round)
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.betDifference(),
            outcome,
            match: won ? 'W' : 'L',
            gain: this.vp1.gain,
            total: this.vp1.total,
            max: this.vp1.max
        })
        // console.debug(JSON.stringify(this.data))
        this.runManual()
        this.displayChartAndTable()
        this.viewPageFor(this.round, 0)
    }

    betDifference = () => {
        return this.bets && Math.abs(this.bets[0] - this.bets[1])
    }

    runPairSimulation = () => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            this.vp1.placeRandomBets()
            const outcome = randomOutcome() ? 1 : 0
            const rows = this.vp1.evolve(outcome, round)
            // console.debug(JSON.stringify(rows))
            return rows
        })
        // console.debug(JSON.stringify(this.data))
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
            manualPlayer:
                <div style={{ width: 700 }}>
                    <label>
                        <strong>Bet:</strong>
                        <input value={this.betDifference()} style={{ width: 50 }} readOnly />
                    </label>
                    <button onClick={() => this.nextBet(true)} disabled={!this.bets}>Won</button>
                    <button onClick={() => this.nextBet(false)} disabled={!this.bets}>Lost</button>
                    <label><strong>Total: {this.vp1 ? this.vp1.total : 0}</strong></label>
                </div>,
            simulateRandom: <div style={{ width: 700 }}></div>,
            simulate1010: <div style={{ width: 700 }}></div>,
            simulate1100: <div style={{ width: 700 }}></div>
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
                                <option value="simulateRandom">Sim Rand</option>
                                <option value="simulate1010">Sim 1010&hellip;</option>
                                <option value="simulate1100">Sim 1100&hellip;</option>
                                <option value="manualPlayer">Manual</option>
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

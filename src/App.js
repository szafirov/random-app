import React, {Component} from 'react';
import './App.css';
import Pair from './Pair.js';

import {Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis} from 'recharts';

import ReactTable from 'react-table';
import 'react-table/react-table.css'

class App extends Component {

    constructor(props) {
        super(props)
        this.chart = {
            margins: {
                top: 10,
                right: 30,
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
            simulate: false,
            currentRow: 0,
            currentPair: 0,
            currentPage: 1,
            betSumAt0: 0,
            betSumAt1: 0,
        }

        this.manualColumns = [
            {
                Header: 'Round',
                accessor: 'round',
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
                Header: 'Total',
                accessor: 'total',
                sortable: false
            }, {
                Header: 'Max',
                accessor: 'max',
                sortable: false
            }
        ]
        this.columns = [
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
                Header: 'Total',
                accessor: 'total',
                sortable: false
            }, {
                Header: 'Max',
                accessor: 'max',
                sortable: false
            }
        ].map(column => {
            column.maxWidth = 75
            return column
        })

        this.manualColumns = this.columns.filter(col =>
            [
                'round',
                'bet',
                'outcome',
                'match',
                'gain',
                'total',
                'max'
            ].includes(col.accessor))

        this.viewPageFor = (currentRow, currentPair) => {
            const computePage = row => Math.floor(row / 20)
            const currentPage = computePage(currentRow)
            if (this.state.currentRow !== currentRow || this.state.currentPair !== currentPair || this.resetPage) {
                // console.debug(currentRow, currentPair, currentPage)
                this.setState({
                    currentRow,
                    currentPage,
                    currentPair,
                    tableData: this.data.filter(row => computePage(row.round) === currentPage && row.pair === currentPair)
                })
                this.resetPage = false
            }
        }
    }

    start = () => {
        this.max = 0
        this.total = 0
        this.data = []
        const { defense, pairs, simulate } = this.state
        this.pairs = [...Array(pairs).keys()].map(index => new Pair(index, defense))
        if (simulate) {
            this.runSimulation()
        } else {
            this.round = 0
            this.runManual()
        }
    }

    runManual = () => {
        this.pairs.forEach(pair => {
            const randomSlot = Math.random() > 0.5 ? 1 : 0
            pair.placeBets(randomSlot)
        })
        const betSum = slot => this.pairs
            .map(pair => pair.playerBySlot(slot))
            .map(player => player.bet)
            .reduce((a, b) => a + b)
        const [betSumAt0, betSumAt1] = [betSum(0), betSum(1)]
        this.setState({ betSumAt0, betSumAt1 })
    }

    betDifference = () => {
        const { betSumAt0, betSumAt1 } = this.state
        return Math.abs(betSumAt0 - betSumAt1)
    }

    nextBet = (won) => {
        const { betSumAt0, betSumAt1 } = this.state
        const outcome = betSumAt1 > betSumAt0 === won ? 1 : 0
        this.pairs.forEach(pair => pair.evolve(outcome))
        const gain = this.pairs.map(pair => pair.gain).reduce((a, b) => a + b)
        this.total += gain
        if (this.total >= this.max) {
            this.pairs
                .filter(pair => pair.players[0].level > 0)
                .forEach(pair => pair.resetLevel())
        }
        this.max = Math.max(this.max, this.total)
        this.round = this.round + 1
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.betDifference(),
            outcome,
            match: won ? 'W' : 'L',
            gain,
            total: this.total,
            max: this.max
        })
        console.debug(JSON.stringify(this.data))
        this.runManual()
        this.displayChartAndTable()
        this.viewPageFor(this.round, 0)
    }

    runSimulation = () => {
        const { rounds } = this.state
        this.data = [...Array(rounds).keys()].flatMap(round => {
            const rows = this.pairs.map(pair => this.computeRow(round, pair))
            // console.debug(JSON.stringify(rows))
            this.total += this.pairs.map(pair => pair.gain).reduce((a, b) => a + b)
            if (this.total >= this.max) {
                this.pairs.filter(pair => pair.players[0].level > 0).forEach(pair => pair.resetLevel())
            }
            this.max = Math.max(this.max, this.total)
            return rows.map(row => ({
                ...row,
                total: this.total,
                max: this.max
            }))
        })
        console.debug(JSON.stringify(this.data))
        this.displayChartAndTable(rounds)
        this.viewPageFor(0, 0)
    }

    displayChartAndTable = (rounds = 1000) => {
        const maxSampleRate = 1000
        const sampleRate = Math.max(1, Math.floor(rounds / maxSampleRate))
        const chartData = this.data.filter(row => row.round % sampleRate === 0)
        this.setState({ chartData });
        this.resetPage = true
    }

    computeRow = (round, pair) => {
        const randomSlot = Math.random() > 0.5 ? 1 : 0
        pair.placeBets(randomSlot)
        const outcome = Math.random() > 0.5 ? 1 : 0
        const row = pair.evolve(outcome)
        row.round = round
        row.pair = pair.index
        return row
    }

    render() {
        const {defense, pairs, rounds, chartData, tableData, currentPair, currentRow, simulate} = this.state
        return (
            <div className="app">
                <div className="container">
                    <div style={{width: 700}}>
                        <label>
                            Defense: <input type="number" min="2" max="10" value={defense} style={{ width: 30 }}
                                            onChange={e => this.setState({defense: parseInt(e.target.value, 10)})}/>
                        </label>
                        <label>
                            Pairs: <input type="number" min="1" max="10" value={pairs} style={{ width: 30 }}
                                          onChange={e => this.setState({pairs: parseInt(e.target.value, 10)})}/>
                        </label>
                        <label>
                            Rounds: <input type="number" min="0" max="10000" value={rounds} style={{ width: 60 }} disabled={!simulate}
                                           onChange={e => this.setState({rounds: parseInt(e.target.value, 10)})}/>
                        </label>
                        <label>
                            Mode:
                            <select onChange={e => this.setState({ simulate: e.target.value === 'simulation' })}>
                                <option value="manual">Manual</option>
                                <option value="simulation">Simulate</option>
                            </select>
                        </label>
                        <button onClick={this.start}>Start</button>
                    </div>
                    {simulate ?
                        <div style={{width: 600}}>
                            <label>
                                <select value={currentPair}
                                        onChange={e => this.viewPageFor(this.state.currentRow, parseInt(e.target.value, 10))}>
                                    {[...Array(this.state.pairs).keys()].map(p => <option key={p} value={p}>Pair {p + 1}</option>)}
                                </select>
                            </label>
                        </div>
                        :
                        <div style={{width: 600}}>
                            <label>
                                <strong>Bet:</strong>
                                <input value={this.betDifference()} style={{width: 50}} readOnly/>
                            </label>
                            <button onClick={() => this.nextBet(true)} disabled={!this.pairs}>Won</button>
                            <button onClick={() => this.nextBet(false)} disabled={!this.pairs}>Lost</button>
                            <label><strong>Total: {this.total}</strong></label>
                        </div>
                    }
                </div>
                <div className="container">
                    <AreaChart width={700}
                               height={700}
                               data={chartData}
                               margin={this.chart.margins}>
                        <XAxis dataKey="round"/>
                        <YAxis/>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <Tooltip
                            isAnimationActive={false}
                            content={<CustomTooltip onActive={round => this.viewPageFor(round, currentPair)}/>}
                        />
                        <Area type='monotone'
                              dataKey='total'
                              stroke='#8884d8'
                              fill='#8884d8'
                              isAnimationActive={false}/>
                    </AreaChart>
                    <ReactTable
                        data={tableData}
                        columns={simulate ? this.columns : this.manualColumns   }
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
    const {active, label, onActive} = props
    if (active && label) onActive(label)
    return null
}

export default App;

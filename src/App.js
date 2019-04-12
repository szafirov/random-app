import React, { Component } from 'react'
import './App.css'

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import ReactTable from 'react-table'
import 'react-table/react-table.css'
import Random from 'random-js'
import VirtualPlayer from './VirtualPlayer'
import VirtualPair from './VirtualPair'

const outcomeEngine = new Random(Random.engines.mt19937().autoSeed())
const randomOutcome = () => outcomeEngine.bool() ? 1 : 0

const newRandomGenerator = () => {
    const randomEngine = new Random(Random.engines.mt19937().autoSeed())
    return () => randomEngine.bool() ? 1 : 0
}

const newRepeatingGenerator = (count) => (round) => round % (2 * count) < count ? 1 : 0

const alwaysOne = () => 1

const slotGeneratorByName = (slotGeneratorName) => {
    if (slotGeneratorName === 'random') {
        return newRandomGenerator()
    }
    const repeat = parseInt(slotGeneratorName, 10)
    return repeat ? newRepeatingGenerator(repeat) : alwaysOne
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
            mode: 'realPlayer',
            slotGen: 'random',
            pairSlotGen: 'random',
            currentRound: 0,
            currentPair: 0,
            currentPage: 1,
            pageCount: 0,
        }
        const matchCol = {
            ...column('Match', 'match', 60),
            Cell: row => (
                <span style={{
                    color: {'L': '#ff2e00', 'W': '#57d500', '0': '#aaa'}[row.value],
                    transition: 'all .3s ease'
                }}>{row.value}</span>
            )
        }
        this.columnsForMode = (mode) => {
            switch (mode) {
                case 'pairs':
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
                case 'manualVirtualPlayer':
                case 'virtualPlayer':
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
                default:
                    return [
                        column('Round', 'round', 60),
                        column('Bet1', 'bet1', 60),
                        column('Bet2', 'bet2', 60),
                        column('Bet', 'bet'),
                        column('Slot', 'slot'),
                        column('Out', 'outcome'),
                        matchCol,
                        column('Total1', 'total1', 60),
                        column('Total2', 'total2', 60),
                        column('Total', 'total', 60),
                        column('Max', 'max', 60)
                    ]
            }
        }
        this.pageSize = 20
        this.slotGenerator = newRandomGenerator()
        this.pairSlotGenerator = newRandomGenerator()

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

    changeSlotsGenerator = (slotGen) => {
        this.setState({ slotGen },
            () => this.slotGenerator = slotGeneratorByName(slotGen))
    }

    changePairSlotsGenerator = (pairSlotGen) => {
        this.setState({ pairSlotGen },
            () => this.pairSlotGenerator = slotGeneratorByName(pairSlotGen))
    }


    resetData = () => {
        this.round = 0
        this.won = 0
        this.bets = undefined
        this.data = []
        this.oldTotal = 0
        this.max = 0
        this.setState({ chartData: [] })
    }

    start = () => {
        this.resetData()
        this.reloadPage()
        switch (this.state.mode) {
            case 'pairs': this.runPairSimulation(); break
            case 'manualVirtualPlayer': this.startManualVirtualPlayer(); break
            case 'virtualPlayer': this.runVirtualPlayerSimulation(); break
            case 'virtualPair': this.runVirtualPairSimulation(); break
            case 'realPlayer': this.runRealPlayerSimulation(); break
            default: break;
        }
    }

    runVirtualPlayerSimulation = () => {
        const { rounds } = this.state
        this.virtualPlayer = this.newVirtualPlayer()
        this.data = [...Array(rounds).keys()].map(round =>
            this.virtualPlayer.placeBetsAndComputeRow(round, randomOutcome(), this.slotGenerator(round)))
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runVirtualPairSimulation = () => {
        const { defense, pairs, locked, rounds } = this.state
        this.vp1 = new VirtualPair(pairs, defense, this.pairSlotGenerator, locked ? this.virtualPlayer : undefined)
        this.data = [...Array(rounds).keys()].map(round =>
            this.vp1.placeBetsAndComputeRow(round, randomOutcome(), this.slotGenerator(round)))
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runRealPlayerSimulation = () => {
        const { rounds } = this.state
        this.vp1 = this.newVirtualPlayer()
        this.vp2 = this.newVirtualPlayer()
        this.data = [...Array(rounds).keys()].map(round => {
            const slot = this.slotGenerator(round)
            const outcome = randomOutcome()
            const row1 = this.vp1.placeBetsAndComputeRow(round, outcome, slot)
            const total1 = row1.total
            const bet1 = row1.bet
            const row2 = this.vp2.placeBetsAndComputeRow(round, outcome, 1 - slot)
            const total2 = row2.total
            const bet2 = row2.bet
            const bet = Math.abs(bet1 - bet2)
            const total = total1 + total2
            const won = this.oldTotal < total
            const lost = this.oldTotal > total
            this.oldTotal = total
            this.max = Math.max(this.max, total)
            return {
                round,
                pair: 0,
                bet1,
                bet2,
                bet,
                slot,
                outcome,
                match: won ? 'W' : lost ? 'L' : '0',
                total1,
                total2,
                total,
                max: this.max,
            }

        })
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    startManualVirtualPlayer = () => {
        this.virtualPlayer = this.newVirtualPlayer()
        this.virtualPlayer.placeBets(this.round)
    }

    nextManualBet = (won) => {
        if (won) this.won = this.won + 1
        const outcome = randomOutcome()
        const slot = won ? outcome : 1 - outcome
        const oldTotal = this.virtualPlayer.total
        this.virtualPlayer.computeGain(outcome, won)
        const resetLevels = this.virtualPlayer.resetOrEvolve(oldTotal)
        // console.debug(this.data)
        this.data = this.data.concat({
            round: this.round,
            pair: 0,
            bet: this.virtualPlayer.betAmount(),
            slot,
            outcome,
            match: won ? 'W' : 'L',
            gain: this.virtualPlayer.gain,
            total: this.virtualPlayer.total,
            max:  this.virtualPlayer.max,
            resetLevels
        })
        this.virtualPlayer.placeBets(this.round)
        this.displayChartAndTable()
        this.reloadPage(this.round)
        this.round = this.round + 1
    }

    runPairSimulation = () => {
        const { rounds } = this.state
        this.virtualPlayer = this.newVirtualPlayer()
        this.data = [...Array(rounds).keys()].flatMap(round => {
            this.virtualPlayer.placeBets(round)
            const outcome = randomOutcome()
            const oldTotal = this.virtualPlayer.total
            const rows = this.virtualPlayer.computeRows(outcome)
            this.virtualPlayer.resetOrEvolve(oldTotal)
            return rows.map(row => ({
                ...row,
                round,
                max:  this.virtualPlayer.max,
                resetLevels: this.virtualPlayer.pairs[row.pair].resetLevels
            }))
        })
        // console.debug(this.data)
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    newVirtualPlayer() {
        const { defense, pairs, locked } = this.state
        return new VirtualPlayer(pairs, defense, this.pairSlotGenerator, locked ? this.virtualPlayer : undefined)
    }

    displayChartAndTable = (rounds = 1000) => {
        const maxSampleRate = 1000
        const sampleRate = Math.max(1, Math.floor(rounds / maxSampleRate))
        const chartData = this.data.filter(row => row.round % sampleRate === 0)
        // console.debug(JSON.stringify(this.data))
        const pageCount =  Math.ceil(this.data.filter(row => row.pair === this.state.currentPair).length / this.pageSize)
        this.setState({ chartData, pageCount })
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
            pairs:
                <div>
                    {up}
                    <label>
                        <select value={currentPair}
                            onChange={e => this.viewPageFor(this.state.currentRound, parseInt(e.target.value, 10))}>
                            {[...Array(this.state.pairs).keys()].map(p => <option key={p} value={p}>Pair {p + 1}</option>)}
                        </select>
                    </label>
                    {down}
                </div>,
            manualVirtualPlayer:
                <div>
                    {up}
                    <label>
                        <strong>Bet:</strong>
                        <input value={this.virtualPlayer ? this.virtualPlayer.betAmount() : 0} style={{ width: 50 }} readOnly />
                    </label>
                    <button onClick={() => this.nextManualBet(true)} disabled={!this.virtualPlayer}>
                        Won ({ this.won })</button>
                    <button onClick={() => this.nextManualBet(false)} disabled={!this.virtualPlayer}>
                        Lost ({ this.round - this.won })</button>
                    <label><strong>Total: {this.virtualPlayer ? this.virtualPlayer.total : 0}</strong></label>
                    {down}
                </div>,
            defaultControls: <div>{up} &nbsp; {down}</div>,
        }
        const rowBackground = rowInfo => {
            if (rowInfo && rowInfo.row.round === currentRound) return '#ccc'
            if (rowInfo && rowInfo.row._original.resetLevels) return '#ff2e00'
            return ''
        }
        const columnBackground = colInfo =>
            (colInfo && colInfo.id === 'slot' && this.state.locked && this.state.mode === 'pairs')
                ? '#ccc'
                : ''
        const chartColor = mode === 'realPlayer'
            ? ['#ccc300', '#cc00c3']
            : ['#08a408', '#a82408']
        return (
            <div className="app">
                <div className="controls">
                    <label>
                        Defense: <input type="number" min="1" max="20" value={defense} style={{ width: 30 }}
                            onChange={e => this.setState({ defense: parseInt(e.target.value, 10) })} />
                    </label>
                    <label>
                        Pairs: <input type="number" min="1" max="100" value={pairs} style={{ width: 30 }}
                            onChange={e => this.setState({ pairs: parseInt(e.target.value, 10) })} />
                    </label>
                    <label>
                        Rounds: <input type="number" min="0" max="10000" value={rounds} style={{ width: 50 }}
                            onChange={e => this.setState({ rounds: parseInt(e.target.value, 10) })} />
                    </label>
                    <label>
                        Mode:
                        <select value={mode} onChange={e => this.changeMode(e.target.value)} style={{ width: 110 }}>
                            <option value="realPlayer">Real Player (=2V Pairs)</option>
                            <option value="virtualPair">Virtual Pair (=2V Players)</option>
                            <option value="virtualPlayer">Virtual Player</option>
                            <option value="manualVirtualPlayer">Manual Virtual Player</option>
                            <option value="pairs">Simple Pairs</option>
                        </select>
                    </label>
                    <label>
                        Current Slots:
                        <select onChange={e => this.changeSlotsGenerator(e.target.value)} style={{ width: 100 }}
                                disabled={mode === 'manualVirtualPlayer' || mode === 'pairs'}>
                            <option key="random" value="random">Random</option>
                            <option key={0} value={0}>1,1,1,1,1,...</option>
                            {[...Array(5).keys()].map(p => p + 1)
                                .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                        </select>
                    </label>
                    <label>
                        Pair Slots:
                        <select onChange={e => this.changePairSlotsGenerator(e.target.value)} style={{ width: 100 }}>
                            <option key="random" value="random">Random</option>
                            <option key={0} value={0}>1,1,1,1,1,...</option>
                            {[...Array(5).keys()].map(p => p + 1)
                                .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                        </select>
                    </label>
                    <label>
                        <span role="img" aria-label="lock">🔒</span>:
                        <input type="checkbox" onClick={e => this.setState({ locked: e.target.checked })} />
                    </label>
                    <button onClick={this.start}>▶</button>
                </div>
                <div className="chart-controls">&nbsp;</div>
                <div className="chart">
                    <AreaChart width={window.innerWidth / 2- 50}
                        height={window.innerHeight - 100}
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
                            fill={chartColor[0]}
                            stroke={chartColor[0]}
                            isAnimationActive={false} />
                        <Area type='monotone'
                            dataKey='total2'
                            fill={chartColor[1]}
                            stroke={chartColor[1]}
                            isAnimationActive={false} />
                    </AreaChart>
                </div>
                <div className="grid-controls">
                    {controls[mode] || controls['defaultControls']}
                </div>
                <ReactTable
                    data={pageData}
                    columns={this.columnsForMode(this.state.mode)}
                    showPagination={false}
                    className="table -highlight grid"
                    style={{ width: window.innerWidth / 2 - 50 }}
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
                <div className="footer">Apr 11, 22h54</div>
            </div>
        )
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

export default App

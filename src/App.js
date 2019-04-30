import React, {Component} from 'react'
import './App.css'

import {Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis} from 'recharts'

import ReactTable from 'react-table'
import 'react-table/react-table.css'
import Random from 'random-js'
import RealPlayer from './RealPlayer.js'
import VirtualPlayer from './VirtualPlayer.js'
import VirtualPair from './VirtualPair.js'
import {newRandomGenerator, slotGeneratorByName} from './slots.js'

const outcomeEngine = new Random(Random.engines.mt19937().autoSeed())
const randomOutcome = () => outcomeEngine.bool() ? 1 : 0


const column = (Header, accessor, width = 50) => ({Header, accessor, width, sortable: false})

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
            realPlayerSlotGen: 'random',
            virtualPairSlotGen: 'random',
            virtualPlayerSlotGen: 'random',
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
                        column('Gain', 'gain'),
                        column('Total1', 'total1', 60),
                        column('Total2', 'total2', 60),
                        column('Total', 'total', 60),
                        column('Max', 'max', 60)
                    ]
            }
        }
        this.pageSize = 20
        this.realPlayerSlotGenerator = newRandomGenerator()
        this.virtualPairSlotGenerator = newRandomGenerator()
        this.virtualPlayerSlotGenerator = newRandomGenerator()
        this.pairSlotGenerator = newRandomGenerator()

        this.scroll = (direction) => {
            const {currentRound, currentPair} = this.state
            this.viewPageFor(currentRound + direction * this.pageSize, currentPair)
        }

        this.reloadPage = (round = Math.min(this.state.rounds - 1, this.state.currentRound),
                           pair = Math.min(this.state.pairs - 1, this.state.currentPair)) =>
            this.viewPageFor(round, pair, true)

        this.viewPageFor = (round, pair, forceReset = false) => {
            const {currentPage, currentRound} = this.state
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
                this.setState({currentRound: round})
            }
        }
        this.resetData()
    }

    changeMode = (mode) => {
        this.setState({mode, pageCount: 0})
        this.resetData()
        this.viewPageFor(0, 0, true)
    }

    changeRealPlayerSlotsGenerator = (realPlayerSlotGen) => {
        this.setState({realPlayerSlotGen},
            () => this.realPlayerSlotGenerator = slotGeneratorByName(realPlayerSlotGen))
    }


    changeVirtualPairSlotsGenerator = (virtualPairSlotGen) => {
        this.setState({virtualPairSlotGen},
            () => this.virtualPairSlotGenerator = slotGeneratorByName(virtualPairSlotGen))
    }

    changeVirtualPlayerSlotsGenerator = (virtualPlayerSlotGen) => {
        this.setState({virtualPlayerSlotGen},
            () => this.virtualPlayerSlotGenerator = slotGeneratorByName(virtualPlayerSlotGen))
    }

    changePairSlotsGenerator = (pairSlotGen) => {
        this.setState({pairSlotGen},
            () => this.pairSlotGenerator = slotGeneratorByName(pairSlotGen))
    }


    resetData = () => {
        this.round = 0
        this.won = 0
        this.data = []
        this.oldTotal = 0
        this.max = 0
        this.setState({chartData: []})
    }

    start = () => {
        this.resetData()
        this.reloadPage()
        switch (this.state.mode) {
            case 'pairs':
                this.runPairSimulation();
                break
            case 'manualVirtualPlayer':
                this.startManualVirtualPlayer();
                break
            case 'virtualPlayer':
                this.runVirtualPlayerSimulation();
                break
            case 'virtualPair':
                this.runVirtualPairSimulation();
                break
            case 'realPlayer':
                this.runRealPlayerSimulation();
                break
            default:
                break;
        }
    }

    runRealPlayerSimulation = () => {
        const {rounds} = this.state
        this.realPlayer = this.newRealPlayer()
        this.data = [...Array(rounds).keys()].map(round =>
            this.realPlayer.placeBetsAndComputeRow(round, randomOutcome(), this.realPlayerSlotGenerator(round)))
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runVirtualPairSimulation = () => {
        const {rounds} = this.state
        this.vp1 = this.newVirtualPair()
        this.data = [...Array(rounds).keys()].map(round =>
            this.vp1.placeBetsAndComputeRow(round, randomOutcome(), this.virtualPairSlotGenerator(round)))
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    runVirtualPlayerSimulation = () => {
        const {rounds} = this.state
        this.virtualPlayer = this.newVirtualPlayer()
        this.data = [...Array(rounds).keys()].map(round =>
            this.virtualPlayer.placeBetsAndComputeRow(round, randomOutcome(), this.virtualPlayerSlotGenerator(round)))
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
            max: this.virtualPlayer.max,
            resetLevels
        })
        this.virtualPlayer.placeBets(this.round)
        this.displayChartAndTable()
        this.reloadPage(this.round)
        this.round = this.round + 1
    }

    runPairSimulation = () => {
        const {rounds} = this.state
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
                max: this.virtualPlayer.max,
                resetLevels: this.virtualPlayer.pairs[row.pair].resetLevels
            }))
        })
        // console.debug(this.data)
        this.displayChartAndTable(rounds)
        this.reloadPage()
    }

    newVirtualPlayer() {
        const {defense, pairs, locked} = this.state
        return new VirtualPlayer(
            pairs,
            defense,
            this.virtualPlayerSlotGenerator,
            this.pairSlotGenerator,
            locked && this.virtualPlayer)
    }

    newVirtualPair() {
        const {defense, pairs, locked} = this.state
        return new VirtualPair(
            pairs,
            defense,
            this.virtualPairSlotGenerator,
            this.virtualPlayerSlotGenerator,
            this.pairSlotGenerator,
            locked && this.virtualPlayer)
    }

    newRealPlayer() {
        const {defense, pairs, locked} = this.state
        return new RealPlayer(
            pairs,
            defense,
            this.realPlayerSlotGenerator,
            this.virtualPairSlotGenerator,
            this.virtualPlayerSlotGenerator,
            this.pairSlotGenerator,
            locked && this.virtualPlayer)
    }

    displayChartAndTable = (rounds = 1000) => {
        const maxSampleRate = 1000
        const sampleRate = Math.max(1, Math.floor(rounds / maxSampleRate))
        const chartData = this.data.filter(row => row.round % sampleRate === 0)
        // console.debug(JSON.stringify(this.data))
        const pageCount = Math.ceil(this.data.filter(row => row.pair === this.state.currentPair).length / this.pageSize)
        this.setState({chartData, pageCount})
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
            mode,
            locked
        } = this.state
        const {
            round,
            virtualPlayer,
            won
        } = this;
        const up = <button onClick={() => this.scroll(-1)} disabled={currentPage === 1}>▲</button>
        const down = <button onClick={() => this.scroll(1)} disabled={currentPage >= pageCount}>▼</button>
        const controls = {
            pairs:
                <div>
                    {up}
                    <label>
                        <select value={currentPair}
                                onChange={e => this.viewPageFor(currentRound, parseInt(e.target.value, 10))}>
                            {[...Array(pairs).keys()].map(p => <option key={p} value={p}>Pair {p + 1}</option>)}
                        </select>
                    </label>
                    {down}
                </div>,
            manualVirtualPlayer:
                <div>
                    {up}
                    <label>
                        <strong>Bet:</strong>
                        <input value={virtualPlayer ? virtualPlayer.betAmount() : 0} style={{width: 50}} readOnly/>
                    </label>
                    <button onClick={() => this.nextManualBet(true)} disabled={!virtualPlayer}>
                        Won ({won})
                    </button>
                    <button onClick={() => this.nextManualBet(false)} disabled={!virtualPlayer}>
                        Lost ({round - won})
                    </button>
                    <label><strong>Total: {virtualPlayer ? virtualPlayer.total : 0}</strong></label>
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
            (colInfo && colInfo.id === 'slot' && locked && mode === 'pairs') && '#ccc'
        const chartColor = mode === 'realPlayer'
            ? ['#ccc300', '#cc00c3']
            : ['#08a408', '#a82408']
        return (
            <div className="app">
                <div className="controls">
                    <label>
                        Defense: <input type="number" min="1" max="20" value={defense} style={{width: 30}}
                                        onChange={e => this.setState({defense: parseInt(e.target.value, 10)})}/>
                    </label>
                    <label>
                        Pairs: <input type="number" min="1" max="100" value={pairs} style={{width: 30}}
                                      onChange={e => this.setState({pairs: parseInt(e.target.value, 10)})}/>
                    </label>
                    <label>
                        Rounds: <input type="number" min="0" max="10000" value={rounds} style={{width: 50}}
                                       onChange={e => this.setState({rounds: parseInt(e.target.value, 10)})}/>
                    </label>
                    <label>
                        Mode:
                        <select value={mode} onChange={e => this.changeMode(e.target.value)} style={{width: 110}}>
                            <option value="realPlayer">Real Player (=2V Pairs)</option>
                            <option value="virtualPair">Virtual Pair (=2V Players)</option>
                            <option value="virtualPlayer">Virtual Player</option>
                            <option value="manualVirtualPlayer">Manual Virtual Player</option>
                            <option value="pairs">Simple Pairs</option>
                        </select>
                    </label>
                    {
                        mode === 'realPlayer' &&
                        <label>
                            R. Player Slots:
                            <select onChange={e => this.changeRealPlayerSlotsGenerator(e.target.value)}
                                    style={{width: 100}}>
                                <option key="random" value="random">Random</option>
                                <option key={0} value={0}>1,1,1,1,1,...</option>
                                {[...Array(5).keys()].map(p => p + 1)
                                    .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                            </select>
                        </label>
                    }
                    {
                        (mode === 'realPlayer' || mode === 'virtualPair') &&
                        <label>
                            V. Pair Slots:
                            <select onChange={e => this.changeVirtualPairSlotsGenerator(e.target.value)}
                                    style={{width: 100}}>
                                <option key="random" value="random">Random</option>
                                <option key={0} value={0}>1,1,1,1,1,...</option>
                                {[...Array(5).keys()].map(p => p + 1)
                                    .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                            </select>
                        </label>
                    }
                    {
                        (mode !== 'pairs' && mode !== 'manualVirtualPlayer') &&
                        <label>
                            V. Player Slots:
                            <select onChange={e => this.changeVirtualPlayerSlotsGenerator(e.target.value)}
                                    style={{width: 100}}>
                                <option key="random" value="random">Random</option>
                                <option key={0} value={0}>1,1,1,1,1,...</option>
                                {[...Array(5).keys()].map(p => p + 1)
                                    .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                            </select>
                        </label>
                    }
                    <label>
                        Pair Slots:
                        <select onChange={e => this.changePairSlotsGenerator(e.target.value)} style={{width: 100}}>
                            <option key="random" value="random">Random</option>
                            <option key={0} value={0}>1,1,1,1,1,...</option>
                            {[...Array(5).keys()].map(p => p + 1)
                                .map(p => <option key={p} value={p}>1x{p},0x{p}</option>)}
                        </select>
                    </label>
                    <label>
                        <span role="img" aria-label="lock">🔒</span>:
                        <input type="checkbox" onClick={e => this.setState({locked: e.target.checked})}/>
                    </label>
                    <button onClick={this.start}>▶</button>
                </div>
                <div className="chart-controls">&nbsp;</div>
                <div className="chart">
                    <AreaChart width={window.innerWidth / 2 - 50}
                               height={window.innerHeight - 100}
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
                        <Area type='monotone'
                              dataKey='total1'
                              fill={chartColor[0]}
                              stroke={chartColor[0]}
                              isAnimationActive={false}/>
                        <Area type='monotone'
                              dataKey='total2'
                              fill={chartColor[1]}
                              stroke={chartColor[1]}
                              isAnimationActive={false}/>
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
                    style={{width: window.innerWidth / 2 - 50}}
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
                <div className="footer">Apr 16, 21h47</div>
            </div>
        )
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

export default App

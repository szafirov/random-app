import React, {Component} from 'react';
import './App.css';
import Pair from './Pair.js';
import Player from './Player.js';

import {Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis} from 'recharts';

import ReactTable from 'react-table';
import 'react-table/react-table.css'

const MaxSampleRate = 1000

class App extends Component {

  constructor(props) {
    super(props)
    this.data = []
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
      currentRow: 0,
      currentPair: 0,
      currentPage: 1,
    }
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
        Header: 'Bet Slot',
        accessor: 'betSlot',
        sortable: false
      }, {
        Header: 'Bet ($)',
        accessor: 'bet',
        sortable: false
      }, {
        Header: 'Out',
        accessor: 'outcome',
        sortable: false
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

    this.viewPageFor = (currentRow, currentPair) => {
      const computePage = row => Math.floor((row - 1) / 20)
      const currentPage = computePage(currentRow)
      if (this.state.currentRow !== currentRow || this.state.currentPair !== currentPair) {
        // console.debug(currentRow, currentPair, currentPage)
        this.setState({
          currentRow,
          currentPage,
          currentPair,
          tableData: this.data.filter(row => computePage(row.round) === currentPage && row.pair === currentPair)
        })
      }
    }
  }

  start() {
    const { defense, pairs } = this.state
    this.pairs = [...Array(pairs).keys()].map(index => {
      const leader = new Player(defense)
      const follower = new Player(defense, leader)
      return new Pair(index, leader, follower)
    })
    this.run()
  }

  run = () => {
    const { rounds } = this.state
    let max = 0
    let total = 0
    const computeRow = (round, pair) => {
      const row = pair.play()
      row.round = round
      row.pair = pair.index
      total += pair.gain
      if (pair.leader.level > 0 && total >= max) {
        pair.resetLevel()
      } else {
        pair.evolve()
      }
      row.total = total
      row.max = max = Math.max(max, total)
      return row
    }
    this.data = [...Array(rounds).keys()].flatMap(round => this.pairs.map(pair => computeRow(round, pair)))
    const sampleRate = Math.max(1, Math.floor(rounds / MaxSampleRate))
    const chartData = this.data.filter(row => row.round % sampleRate === 0)
    this.setState({ chartData });
    this.viewPageFor(1, 0)
  }

  render() {
    const { defense, pairs, rounds, chartData, tableData, currentPair, currentRow } = this.state
    console.debug(pairs)
    return (
      <div className="app">
        <div className="container">
          <div style={{ width: 600 }}>
            <label>
              Rounds: <input type="number" min="0" max="10000" value={rounds} style={{ width: 100 }}
                             onChange={e => this.setState({ rounds: parseInt(e.target.value, 10) })} />
            </label>
            <label>
              Defense: <input type="number" min="2" max="10" value={defense} style={{ width: 50 }}
                              onChange={e => this.setState({ defense: parseInt(e.target.value, 10) })} />
            </label>
            <label>
              Pairs: <input type="number" min="1" max="10" value={pairs} style={{ width: 50 }}
                            onChange={e => this.setState({ pairs: parseInt(e.target.value, 10) })} />
            </label>
            <button className="app-btn" onClick={() => this.start()}>Start</button>
          </div>
          <div style={{ width: 600 }}>
            <label>
              View Pair: <select onChange={e => this.viewPageFor(this.state.currentRow, parseInt(e.target.value, 10))}>
                {[...Array(this.state.pairs).keys()].map(p => <option key={p} value={p}>P{p + 1}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="container">
          <AreaChart width={600} height={700} data={chartData} margin={this.chart.margins}>
            <XAxis dataKey="round"/>
            <YAxis/>
            <CartesianGrid strokeDasharray="3 3"/>
            <Tooltip
              isAnimationActive={false}
              content={<CustomTooltip
              onActive={round => this.viewPageFor(round, currentPair)}
            />} />
            <Area type='monotone' dataKey='total' stroke='#8884d8' fill='#8884d8' isAnimationActive={false} />
          </AreaChart>
          <ReactTable
            data={tableData}
            columns={this.columns}
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

import React, {Component} from 'react';
import './App.css';
import Pair from './Pair.js';
import Player from './Player.js';

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
      rounds: 100,
      defense: 2,
      data: [],
      chartData: [],
      tableData: [],
      currentRow: 1,
      currentPage: undefined,
    }
    this.columns = [{
      Header: 'Round',
      accessor: 'round',
    }, {
      Header: 'Level',
      accessor: 'level',
    }, {
      Header: 'Index',
      accessor: 'index',
    }, {
      Header: 'Bet Slot',
      accessor: 'betSlot',
    }, {
      Header: 'Bet ($)',
      accessor: 'bet',
    }, {
      Header: 'Outcome',
      accessor: 'outcome',
    }, {
      Header: 'Match',
      accessor: 'match',
      Cell: row => (
        <span style={{
          color: row.value === 'L' ? '#ff2e00' : '#57d500',
          transition: 'all .3s ease'
        }}>{row.value}</span>
      )
    }, {
      Header: 'Gain',
      accessor: 'gain',
    }, {
      Header: 'Total',
      accessor: 'total',
    }].map(column => {
      column.maxWidth = 90
      return column
    })

    this.viewPageFor = currentRow => {
      const computePage = row => Math.floor((row - 1) / 20)
      const currentPage = computePage(currentRow)
      if (this.state.currentRow !== currentRow) {
        // console.debug(currentRow, this.state.currentPage, currentPage)
        this.setState({
          currentRow,
          currentPage,
          tableData: this.data.filter(row => computePage(row.round) === currentPage)
        })
      }
    }
  }

  start() {
    const { defense } = this.state
    const leader = new Player(defense)
    const follower = new Player(defense, leader)
    this.pair = new Pair(leader, follower)
    this.data = []
    this.run()
  }

  run = () => {
    const { rounds } = this.state
    const maxSampleSize = 1000
    const sampleRate = Math.max(1, Math.floor(rounds / maxSampleSize))
    this.data = []
    const chartData = []
    let maxTotal = 0
    while (this.pair.round < rounds) {
      const row = this.pair.play()
      if (maxTotal > 0 && this.pair.total >= maxTotal) {
        maxTotal = this.pair.total
        this.pair.resetLevel()
      } else {
        this.pair.evolve()
      }
      this.data.push(row)
      if (this.pair.round % sampleRate === 0) chartData.push(row)
    }
    this.setState({ chartData });
    this.viewPageFor(1)
  }

  render() {
    const { defense, rounds, chartData, tableData, currentRow } = this.state
    return (
      <div className="app">
        <p>
          <label>
            Rounds: <input type="number" min="0" max="10000" value={rounds} style={{ width: 100 }}
                           onChange={e => this.setState({ rounds: parseInt(e.target.value, 10) })} />
          </label>
          <label>
            Defense: <input type="number" min="2" max="10" value={defense} style={{ width: 50 }}
                            onChange={e => this.setState({ defense: parseInt(e.target.value, 10) })} />
          </label>
          <button className="app-btn" onClick={() => this.start()}>Start</button>
        </p>
        <div className="container">
          <AreaChart width={800} height={800} data={chartData} margin={this.chart.margins}>
            <XAxis dataKey="round"/>
            <YAxis/>
            <CartesianGrid strokeDasharray="3 3"/>
            <Tooltip
              isAnimationActive={false}
              content={<CustomTooltip
              onActive={this.viewPageFor}
            />} />
            <Area type='monotone' dataKey='total' stroke='#8884d8' fill='#8884d8'
                  isAnimationActive={false}/>
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

function CustomTooltip(props) {
  const { active, label, onActive } = props
  if (active && label) onActive(label)
  return null
}

export default App;

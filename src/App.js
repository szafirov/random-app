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
        bottom: 0
      }
    }
    this.state = {
      rounds: 100,
      data: [],
      sampleData: []
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

    this.handleInputChange = this.handleInputChange.bind(this)
  }

  handleInputChange(e) {
    this.setState({rounds: parseInt(e.target.value, 10)})
  }

  start() {
    const leader = new Player()
    const follower = new Player(leader)
    this.pair = new Pair(leader, follower)
    this.data = []
    this.run()
  }

  run = () => {
    const maxSampleSize = 1000
    const sampleRate = Math.max(1, Math.floor(this.state.rounds / maxSampleSize))
    const data = []
    const sampleData = []
    console.debug(`Sample rate: ${sampleRate}`)
    while (this.pair.round < this.state.rounds) {
      const row = this.pair.play()
      data.push(row)
      if (this.pair.round % sampleRate === 0) sampleData.push(row)
    }
    this.setState({
      data,
      sampleData
    });
  }

  render() {
    return (
      <div className="App">
        <p className="App-intro">
          <label>
            Rounds: <input type="number" min="0" value={this.state.rounds} onChange={this.handleInputChange}/>
          </label>
          <button onClick={() => this.start()}>Start</button>
        </p>
        <div className="container">
          <AreaChart width={800} height={800} data={this.state.sampleData} margin={this.chart.margins}>
            <XAxis dataKey="round"/>
            <YAxis/>
            <CartesianGrid strokeDasharray="3 3"/>
            <Tooltip active={true}/>
            <Area type='monotone' dataKey='total' stroke='#8884d8' fill='#8884d8' isAnimationActive={true}/>
          </AreaChart>
          <ReactTable data={this.state.data} columns={this.columns} className="table"/>
        </div>
      </div>
    );
  }
}

export default App;

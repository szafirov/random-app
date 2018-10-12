import React, {Component} from 'react';
import './App.css';
import Player from './Player.js';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import ReactTable from 'react-table';
import 'react-table/react-table.css'

class App extends Component {

  constructor(props) {
    super(props)
    this.run = true
    this.data = []
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
      data: []
    }
    this.columns = [{
      Header: 'Round',
      accessor: 'round'
    }, {
      Header: 'Level',
      accessor: 'level'
    }, {
      Header: 'Index',
      accessor: 'index'
    }, {
      Header: 'Bet Slot',
      accessor: 'betSlot'
    }, {
      Header: 'Bet ($)',
      accessor: 'bet'
    }, {
      Header: 'Outcome',
      accessor: 'outcome'
    }, {
      Header: 'Match',
      accessor: 'match'
    }, {
      Header: 'Bank',
      accessor: 'bank'
    }]
    this.handleInputChange = this.handleInputChange.bind(this)
  }

  handleInputChange(e) {
    this.setState({rounds: parseInt(e.target.value, 10)})
  }

  tick = () => {
    const row = this.player.play()
    // console.debug(row)
    this.data.push(row)
    if (this.player.round < this.state.rounds && this.run) {
      setTimeout(() => this.tick(), 1)
    } else {
      this.setState({data: this.data});
    }
  }

  start() {
    this.run = true
    this.player = new Player()
    this.data = []
    this.tick()
  }

  stop() {
    this.run = false
  }

  render() {
    return (
      <div className="App">
        <p className="App-intro">
          <label>
            Rounds: <input type="number" min="0" value={this.state.rounds} onChange={this.handleInputChange}/>
          </label>
          <button onClick={() => this.start()}>Start</button>
          <button onClick={() => this.stop()}>Stop</button>
        </p>
        <div className="container">
          <AreaChart width={800} height={800} data={this.state.data} margin={this.chart.margins}>
            <XAxis dataKey="round" />
            <YAxis />
            <CartesianGrid strokeDasharray = "3 3" />
            <Tooltip active={true} />
            <Area type='monotone' dataKey='bank' stroke='#8884d8' fill='#8884d8' isAnimationActive={true} />
          </AreaChart>
          <ReactTable data={this.state.data} columns={this.columns} />
        </div>
      </div>
    );
  }
}

export default App;

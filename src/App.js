import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import IndexView from './components/IndexView';

import './App.css';

import GameView from './components/GameView';

class App extends Component {
  render() {
    return (
      <Router>
      <div className="App">
        <Route exact path="/" component={IndexView} />
        <Route exact path="/game/:hash" component={GameView} />
      </div>
      </Router>
    );
  }
}

export default App;

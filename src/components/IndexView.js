import React, { Component } from 'react';
// import fetch from 'isomorphic-fetch';

export default class IndexView extends Component {

  state = {
  }

  componentWillMount() {
    fetch('http://localhost:3001/new/', { mode: 'cors' })
      .then(response => response.json(),
            error => console.log(error))
      .then(json => (
        this.props.history.push(`/game/${json.hash}/`)
      ));
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {

    return (
      <div className='index'>
        <h1>Tic-tac-toe Game</h1>
      </div>
    );
  }
}

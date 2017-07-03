import React, { Component } from 'react';
import {Layer, Rect, Stage, Group, Line, Ring} from 'react-konva';
import Konva from 'konva';
import NotificationSystem from 'react-notification-system';
import Websocket from 'react-websocket';

const COLOR = Konva.Util.getRandomColor();
const WINNING_COLOR = Konva.Util.getRandomColor();

const getProperSideSize = () => {
  if (window.innerWidth > window.innerHeight) {
    return window.innerHeight;
  } else {
    return window.innerWidth;
  }
}

const Cross = props => (
  <Group>
    <Line points={[props.x + 50, props.y + 50, props.x + props.width - 50, props.y + props.width - 50]} stroke={props.color} strokeWidth={30} />
    <Line points={[props.x + 50, props.y + props.width - 50, props.x + props.width - 50, props.y + 50]} stroke={props.color} strokeWidth={30} />
  </Group>
)

const Circle = props => (
  // TODO: Update compensators dynamically to prevent negative radius value?
  <Ring x={props.x + props.width / 2} y={props.y + props.width / 2} outerRadius={props.width / 2 - 40} innerRadius={props.width / 2 - 40 - 15} fill={props.color} stroke={props.color} strokeWidth={10} />
)

class Tile extends Component {

  shapeComponentMap = {
    'cross': Cross,
    'circle': Circle
  }

  constructor(props) {
    super(props);
    this.state = {
      shape: props.game.state.game.tiles[props.id] || null,
      color: COLOR
    }
  }

  handleClick = () => {
    if (this.props.game.isGameOver()) {
      this.props.game.refs.notificationSystem.addNotification({
        message: 'Game over',
        level: 'error'
      });
      return null;
    }

    // Do nothing if it's not my turn
    if (!this.props.game.isMyTurn()) {
      this.props.game.refs.notificationSystem.addNotification({
        message: 'It is not your turn now',
        level: 'info'
      });
      return null;
    }
    let shape = this.props.game.state.game.playerShape;
    this.props.game.sendSocketMessage(JSON.stringify({
      action: 'setTile',
      payload: {
        key: this.props.id,
        shape: shape
      }
    }));
    this.setState({ shape: shape });

    this.props.game.updateLastTurn(shape);

    this.props.game.refs.notificationSystem.addNotification({
      message: 'It is your opponent turn now',
      level: 'info'
    });

  }

  render() {
    let shape;
    if (this.state.shape === null) {
      shape = <Rect {...this.props} onClick={this.handleClick} />
    } else {
      let ShapeComponent = this.shapeComponentMap[this.state.shape];
      let shapeProps = {
        x: this.props.x,
        y: this.props.y,
        width: this.props.width,
        color: this.state.color
      }
      shape = <ShapeComponent {...shapeProps} />
    }
    return shape;
  }
}

export default class GameView extends Component {

  state = {
    size: getProperSideSize(),
    game: null
  }

  updateDimensions = () => {
    this.setState({ size: getProperSideSize() });
  }

  updateLastTurn = (shape) => {
    this.setState({ game: Object.assign({}, this.state.game, { lastTurn: shape }) });
  }

  componentWillMount() {
    this.updateDimensions();
    fetch(`http://localhost:3001/game/${this.props.match.params.hash}/`, { mode: 'cors' })
      .then(response => response.json(),
            error => console.log(error))
      .then(json => (
        this.setState({ game: json })
      ));

  }

  componentDidMount() {
    window.addEventListener('resize', this.updateDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
  }

  componentDidUpdate() {
    if (this.state.game.lastTurn === null && this.isMyTurn()) {
      this.refs.notificationSystem.addNotification({
        message: 'Share current address with your opponent',
        level: 'info',
        onRemove: () => (
          this.refs.notificationSystem.addNotification({
            message: 'Your turn!',
            level: 'info'
          })
        )
      });
    }
  }

  handleSocketMessage = (msg) => {
    let data = JSON.parse(msg);
    if (data.action === 'setTile') {
      this.refs[`tile${data.payload.key}`].setState({
        shape: data.payload.shape
      });
      this.updateLastTurn(data.payload.shape);
      this.refs.notificationSystem.addNotification({
        message: 'Your turn!',
        level: 'info'
      });
    }

    if (data.action === 'setWinner') {
      this.setState({ game: Object.assign({}, this.state.game, { winner: data.payload.shape }) });
      if (data.payload.shape === this.state.game.playerShape) {
        this.refs.notificationSystem.addNotification({
          message: 'You won!',
          level: 'success'
        });
      } else {
        this.refs.notificationSystem.addNotification({
          message: 'You lost!',
          level: 'error'
        });
      }
      // Highlight winning combintation
      for (let key of data.payload.combination) {
        this.refs[`tile${key}`].setState({ color: WINNING_COLOR });
      }
    }
  }

  sendSocketMessage = (message) => {
    this.refs.ws.state.ws.send(message);
  }

  isGameOver = () => {
    return this.state.game.winner !== null;
  }

  isMyTurn = () => {
    // When the game is new cross makes the first turn
    if (this.state.game.lastTurn === null) {
      return this.state.game.playerShape === 'cross';
    }

    return this.state.game.lastTurn !== this.state.game.playerShape;
  }

  render() {

    let tilesConfig = [
        {
          key: '00',
          x: 0,
          y: 0
        },
        {
          key: '01',
          x: 0,
          y: this.state.size / 3
        },
        {
          key: '02',
          x: 0,
          y: (this.state.size / 3) * 2
        },
        {
          key: '10',
          x: this.state.size / 3,
          y: 0
        },
        {
          key: '11',
          x: this.state.size / 3,
          y: this.state.size / 3
        },
        {
          key: '12',
          x: this.state.size / 3,
          y: (this.state.size / 3) * 2
        },
        {
          key: '20',
          x: (this.state.size / 3) * 2,
          y: 0
        },
        {
          key: '21',
          x: (this.state.size / 3) * 2,
          y: this.state.size / 3
        },
        {
          key: '22',
          x: (this.state.size / 3) * 2,
          y: (this.state.size / 3) * 2
        },
      ]

    if (this.state.game !== null) {
      let tiles = tilesConfig.map(tile => (
        <Tile game={this} ref={`tile${tile.key}`} key={tile.key} id={tile.key} x={tile.x} y={tile.y} width={this.state.size / 3} height={this.state.size / 3} />
      ));
      return (
        <div className='game'>
        <Stage width={this.state.size} height={this.state.size}>
        <Layer>
        <Line points={[this.state.size / 3, 0, this.state.size / 3, this.state.size]} stroke={COLOR} strokeWidth={30} />
        <Line points={[this.state.size / 3 * 2, 0, this.state.size / 3 * 2, this.state.size]} stroke={COLOR} strokeWidth={30} />
        <Line points={[0, this.state.size / 3, this.state.size, this.state.size / 3]} stroke={COLOR} strokeWidth={30} />
        <Line points={[0, this.state.size / 3 * 2, this.state.size, this.state.size / 3 * 2]} stroke={COLOR} strokeWidth={30} />
        {tiles}
        </Layer>
        </Stage>
        <NotificationSystem ref='notificationSystem' />
        <Websocket debug={false} ref={'ws'} url={`ws://localhost:3001/game/${this.props.match.params.hash}/`} onMessage={this.handleSocketMessage} />
        </div>
      );
    } else {
      return null;
    }
  }
}

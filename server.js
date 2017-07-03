const app = require('express')();
const crypto = require('crypto');
require('express-ws')(app);

app.use(require('cors')());

const WINNING_COMBINATIONS = [
  // Verticals
  ['00', '01', '02'],
  ['10', '11', '12'],
  ['20', '21', '22'],
  // Horizontals
  ['00', '10', '20'],
  ['01', '11', '21'],
  ['02', '12', '22'],
  // Diagonals
  ['00', '11', '22'],
  ['02', '11', '20']
]

const connections = {};
const games = {};

app.get('/', (req, res) => {
  res.send('Hello World!');
});


getUserHash = (req) => (
  crypto.createHash('sha256').update(req.ip + req.get('User-Agent')).digest('hex')
)

isPlayer = (game, userHash) => ( ~game.players.indexOf(userHash) )

getWinningCombination = (tiles) => {
  let allIn = false;
  let winningCombination = [];
  for (let combinationTiles of WINNING_COMBINATIONS) {
    for (let tile of combinationTiles) {
      if (!~tiles.indexOf(tile)) {
        allIn = false;
        break;
      } else {
        allIn = true;
      }
    }
    if (allIn) {
      winningCombination = combinationTiles;
      break;
    }
  }
  return winningCombination;
}

getTiles = (gameTiles, shape) => {
  let tilesOut = [];
  for (let tileKey of Object.keys(gameTiles)) {
    if (gameTiles[tileKey] === shape) {
      tilesOut.push(tileKey);
    }
  }
  return tilesOut;
}

app.get('/game/:hash/', (req, res) => {
  let game = games[req.params.hash];
  if (game !== undefined) {
    let userHash = getUserHash(req);
    // Create new game object with proper shape attribute
    game = Object.assign({}, game, { playerShape: game.creator === userHash ? 'cross' : 'circle' });

    if (!isPlayer(game, userHash)) {
      if (game.players.length < 2) {
        // Joining as a player
        game.players.push(userHash);
      } else {
        // TODO: Joining as a watcher?
        return res.status(403).json({ error: 'Game already taken' });
      }
    }

    return res.json(game);
  } else {
    return res.status(404).json({error: 'Game not found'});
  }
});

app.ws('/game/:hash/', (ws, req) => {

  let userHash = getUserHash(req)
  if (req.params.hash in connections) {
    connections[req.params.hash].push(ws);
  } else {
    connections[req.params.hash] = [ws];
  }

  ws.on('message', (msg) => {
    let data = JSON.parse(msg);
    if (data.action === 'setTile') {
      games[req.params.hash].lastTurn = data.payload.shape;
      games[req.params.hash].tiles[data.payload.key] = data.payload.shape;

      // Checking whether it was a winning turn
      let winningCombination = getWinningCombination(getTiles(games[req.params.hash].tiles, data.payload.shape));
      if (winningCombination.length > 0) {
        games[req.params.hash].winner = data.payload.shape;
      }

      for (let connection of connections[req.params.hash]) {
        if (connection !== ws) {
          connection.send(msg);
        }

        if (winningCombination.length > 0) {
          connection.send(JSON.stringify({
            action: 'setWinner',
            payload: {
              shape: data.payload.shape,
              combination: winningCombination
            }
          }));
        }
      }
    }
  });

  ws.on('close', (c) => {
    // Removing connection from array
    connections[req.params.hash].splice(connections[req.params.hash].indexOf(ws), 1);
  });

});


app.get('/new/', (req, res) => {
  let hash = crypto.createHash('sha1')
                   .update(Math.random().toString())
                   .digest('hex');
  let gameInitialState = {
    creator: null,
    lastTurn: null,
    winner: null,
    players: [],
    tiles: {},
  };

  games[hash] = Object.assign({}, gameInitialState, { creator: getUserHash(req) });
  res.json({ hash: hash });
});

app.listen(3001, () => {
  console.log('Backend listening on port 3001!');
});

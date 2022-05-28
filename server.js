const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist/'));
    app.get('*', function (req, res) {
        res.sendFile('index.html', { root: 'dist/' });
    });
}
const server = app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})


const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server });

const games = {
    'someId': {
        players: {}
    }
};
wss.on('connection', function (connection) {
    const playerId = Math.round(Date.now());
    connection.playerId = playerId;
    //when server gets a message from a connected user 
    connection.on('message',
        (message) => {
            try {
                const { type, payload } = JSON.parse(message.toString());
                switch (type) {
                    case 'init':
                        {
                            const gameId = Math.random().toString().slice(14);
                            games[gameId] = {
                                players: [
                                    connection
                                ]
                            };
                            connection.send(JSON.stringify({
                                type: 'game-created',
                                payload: {
                                    gameId
                                }
                            }));
                        }
                        break;
                    case 'join':
                        {
                            const { gameId } = payload;
                            games[gameId].players.push(connection);
                            games[gameId].players.forEach((playerConnection) => {
                                playerConnection.send(JSON.stringify({
                                    type: 'game-started',
                                    payload: { gameId }
                                }));
                            });
                        }
                        break;
                    case 'player-update':
                        {
                            const { gameId, update } = payload;
                            games[gameId].players.forEach(playerConnection => {
                                if (playerConnection.playerId !== playerId) {
                                    playerConnection.send(JSON.stringify({
                                        type: 'player-update',
                                        payload: update
                                    }));
                                }
                            });
                        }
                        break;
                    default:
                        {
                            const { gameId } = payload;
                            games[gameId].players.forEach(playerConnection => {
                                if (playerConnection.playerId !== playerId) {
                                    playerConnection.send(JSON.stringify({
                                        type,
                                        payload
                                    }));
                                }
                            });
                        }
                        break;
                }
            } catch (error) {

            }
        });
    connection.on('close', () => {

    });
});

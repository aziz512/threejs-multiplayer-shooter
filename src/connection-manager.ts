export enum Event {
    GameCreated = 'game-created',
    GameStarted = 'game-started',
    Join = 'join',
    PlayerUpdate = 'player-update',
    ShotFired = 'shot-fired',
    ShotLanded = 'shot-landed'
}

interface Listener {
    event: Event;
    handler: (p: any) => void;
}

export interface ConnectionManager extends WebSocket {
    on: (event: Listener['event'], handler: Listener['handler']) => void;
    sendMessage: (event: Event, payload: any) => void;
}

export const connect = () => {
    return new Promise<ConnectionManager>(res => {
        const conn = new WebSocket('ws://localhost:8080');
        conn.onopen = function () {
            const listeners: Listener[] = [];
            conn.onmessage = (msg) => {
                const { type, payload } = JSON.parse(msg.data);
                listeners.forEach((listener) => {
                    if (listener.event === type) {
                        listener.handler(payload);
                    }
                });
            };
            const additionalProperties = {
                on: (event: Listener['event'], handler: Listener['handler']) => {
                    listeners.push({ event, handler });
                },
                sendMessage: (event: Event, payload: any) => {
                    conn.send(JSON.stringify({
                        type: event,
                        payload
                    }));
                }
            };
            res(Object.assign(conn, additionalProperties));
        };
    });
};

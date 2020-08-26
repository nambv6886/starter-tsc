const WebSocket = require('ws');
import * as jwt from 'jsonwebtoken';
import * as config from 'config';
import logger from './src/utils/logger';

const basicInfo = config.get('basic_info');

const port = basicInfo.ws_port || 8080;
const WSS = new WebSocket.Server({ port });
logger.info(`WS Server is running at ws://localhost:${port}`);

WSS.on('connection', (ws: any) => {
    console.log('new Connection');
    ws.groups = [];

    ws.on('message', async (data: string) => {
        let message: any;
        // try {
        //     message = JSON.parse(data);
        // } catch (error) {
        //     logger.error(`[WebSocket]: ${JSON.stringify(error.message)}`);
        //     ws.send(JSON.stringify({
        //         result: 'not ok'
        //     }))
        // }

        // send data to all connected clients
        WSS.clients.forEach(client => {
            if(client.readyState == WebSocket.OPEN) {
                client.send(data);
            }
        })

    })

})
import * as express from 'express';
import * as bodyParser from 'body-parser';
import fetch from 'node-fetch';
import {Request, Response} from "express";


// Config options
const config = {
    containerServiceUrl: 'http://localhost:4200'
};

// Server setup
const port = 4000;
const app = express();
app.use(bodyParser.json());

// Create client-container mapping;
type mapObject = {
    endpoint: string,
    containerId: string
}
const clientMap: {[sessionId: string]: mapObject} = {};
let connectionCount = 0;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, world!');
});

// Create a session
app.post('/', (req: Request, res: Response) => {
    const newSessionId = `${connectionCount++}`;
    const options = {method: 'POST'};

    fetch(`http://localhost:${config.containerServiceUrl}`, options)
        .then(res => res.json())
        .then(({id, port}) => {
            clientMap[newSessionId] = {
                containerId: id,
                endpoint: `http://localhost:${port}`
            };
            res.send({sessionId: newSessionId});
        })
        .catch(err => {
            res.status(500);
            res.send(err);
        });
});

// Do an action on a session
app.post('/:sessionId', (req: Request, res: Response) => {
    const {sessionId}: {sessionId: string} = req.params;
    const {endpoint} = clientMap[sessionId];

    const requestData = req.body;
    const options = {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {'Content-Type': 'application/json'}
    };

    if (endpoint) {
        fetch(endpoint, options)
            .then(res => res.json())
            .then(data => {
                res.send(data);
            })
            .catch(err => {
                res.status(500);
                res.send(err);
            });
    } else {
        res.status(404);
        res.send(`Error: sessionId ${sessionId} not found`);
    }
});

// Delete a session and associated container
app.delete('/:sessionId', (req: Request, res: Response) => {
    const {sessionId}: {sessionId: string} = req.params;
    const options = {method: 'DELETE'};

    if (clientMap[sessionId]) {
        fetch(`http://localhost:${config.containerServiceUrl}`, options)
            .then(res => res.json())
            .then(() => {
                delete clientMap[sessionId];
                res.send({sessionId});
            })
            .catch(err => {
                res.status(500);
                res.send(err);
            });
    } else {
        res.status(404);
        res.send(`Error: sessionId ${sessionId} not found`);
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});

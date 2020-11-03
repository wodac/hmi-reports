//@ts-check
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// index.js is used to setup and configure your bot

// Import required pckages
const path = require('path');
const express = require('express');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, CardFactory } = require('botbuilder');
const { MicrosoftAppCredentials } = require('botframework-connector')

// Import bot definitions
const { BotActivityHandler } = require('./botActivityHandler');

// Read botFilePath and botFileSecret from .env file.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
const { getDB } = require('./commons');
const { renewSubscription } = require('./watch');
const watchTask = require('node-cron')
    .schedule('0 2 * * *', () => renewSubscription())

const credencials = new MicrosoftAppCredentials(process.env.BotId, process.env.BotPassword);
// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter(credencials);

adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${error}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${error}`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create bot handlers
const botActivityHandler = new BotActivityHandler();

// Create HTTP server.
const server = express();
const port = process.env.port || process.env.PORT || 3978;
server.listen(port, () =>
    console.log(`\Bot/ME service listening at http://localhost:${port}`)
);

server.use(express.urlencoded())
server.use(express.json())
// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Process bot activity
        await botActivityHandler.run(context);
    });
});

server.get('/notification', async (req, res) => {
    try {
        const id = req.query.id;
        const db = await getDB()
        const { value: report } = await db.collection('failure-reports').findOneAndUpdate(
            { id }, { $set: { seen: true } }
        )
        res.json(report)
    } catch (error) {
        console.log(error)
        res.json({
            error: true,
            message: "Error occured"
        })
    }
})


const notificationApi = require('./notifications');
const api = require('./api');
server.use('/api', api, notificationApi(adapter))

server.use('/', express.static('public'))
server.use('/tab', express.static('../tabs/build'))
server.use('/static', express.static('../tabs/build/static'))
server.use('/tab/tab', express.static('../tabs/build'))
server.use('/config', express.static('../tabs/build'))
server.use('/tab/config', express.static('../tabs/build'))
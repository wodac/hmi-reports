//@ts-check
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    TurnContext,
    MessageFactory,
    TeamsActivityHandler,
    CardFactory,
    ActionTypes
} = require('botbuilder');
const { conversationAdded, getConversations } = require('./commons')

class BotActivityHandler extends TeamsActivityHandler {
    constructor() {
        super();
        console.log('bot started')
        /* Conversation Bot */
        /*  Teams bots are Microsoft Bot Framework bots.
            If a bot receives a message activity, the turn handler sees that incoming activity
            and sends it to the onMessage activity handler.
            Learn more: https://aka.ms/teams-bot-basics.

            NOTE:   Ensure the bot endpoint that services incoming conversational bot queries is
                    registered with Bot Framework.
                    Learn more: https://aka.ms/teams-register-bot. 
        */
        // Registers an activity event handler for the message event, emitted for every incoming message activity.
        this.onMessage(async (context, next) => {
            console.log(context, 'message');
            TurnContext.removeRecipientMention(context.activity);
            switch (context.activity.text.trim()) {
                case 'Hello':
                    await this.mentionActivityAsync(context);
                    break;
                default:
                    // By default for unknown activity sent by user show
                    // a card with the available actions.
                    const value = { count: 0 };
                    const card = CardFactory.heroCard(
                        'Lets talk...',
                        null,
                        [{
                            type: ActionTypes.MessageBack,
                            title: 'Say Hello',
                            value: value,
                            text: 'Hello'
                        }]);
                    await context.sendActivity({ attachments: [card] });
                    break;
            }
            await next();
        });

        this.onConversationUpdate(async (context, next) => {
            console.log(context, 'conversation update');
            const ref = TurnContext.getConversationReference(context.activity);
            await conversationAdded(ref);
            await next();
        })

        this.onMembersAdded(async (context, next) => {
            console.log(context, 'members added');
            await next();
        });
        /* Conversation Bot */
    }

    /* Conversation Bot */
    /**
     * Say hello and @ mention the current user.
     */
    async mentionActivityAsync(context) {
        const TextEncoder = require('html-entities').XmlEntities;

        const mention = {
            mentioned: context.activity.from,
            text: `<at>${new TextEncoder().encode(context.activity.from.name)}</at>`,
            type: 'mention'
        };

        const replyActivity = MessageFactory.text(`Hi ${mention.text}`);
        replyActivity.entities = [mention];

        await context.sendActivity(replyActivity);
    }
    /* Conversation Bot */
}

module.exports.BotActivityHandler = BotActivityHandler;


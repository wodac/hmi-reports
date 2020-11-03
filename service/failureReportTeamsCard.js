// @ts-check
const { CardFactory } = require('botbuilder');
/**
 * @param {import('./notifications').Report} data
 */
module.exports = function makeCard(data) {
    const cardData = {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "items": [
                            {
                                "type": "Image",
                                "style": "default",
                                "url": `${process.env.HostName}/img/danger.png`,
                                "size": "Small"
                            }
                        ],
                        "width": "auto"
                    },
                    {
                        "type": "Column",
                        "items": [
                            {
                                "type": "TextBlock",
                                "weight": "Bolder",
                                "text": "Powiadomienie o awarii",
                                "wrap": true
                            },
                            {
                                "type": "TextBlock",
                                "spacing": "None",
                                "text": data.date.toLocaleString('pl'),
                                "isSubtle": true,
                                "wrap": true
                            }
                        ],
                        "width": "stretch"
                    }
                ]
            },
            {
                "type": "FactSet",
                "facts": [
                    {
                        "title": "Opis błędu:",
                        "value": data.errorDesc
                    },
                    {
                        "title": "Tagi:",
                        "value": data.tags.join(', ')
                    },
                    {
                        "title": "Komentarz:",
                        "value": data.comment
                    }
                ]
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "Otwórz i oznacz jako przeczytane",
                "url": data.url
            }
        ],
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.2"
    }
    return CardFactory.adaptiveCard(cardData)
}
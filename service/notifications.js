// @ts-check

const { Router } = require('express')
const { MicrosoftAppCredentials } = require('botframework-connector');
const { getDB, getConversations, gmailFactory } = require('./commons');
const makeCard = require('./failureReportTeamsCard')
const hostname = process.env.HostName
const { simpleParser } = require('mailparser')
const SmsApi = require('smsapi');
const config = require('./config');
const smsapi = new SmsApi({
    oauth: {
        // @ts-ignore
        accessToken: process.env.SmsApiToken
    }
})

/**
 * 
 * @param { Report } report 
 */
async function sendSMS(report) {
    const intro = await config.getSetting("smsIntroduction", "Alarm na linii produkcyjnej: ")
    const from = await config.getSetting('smsFrom', 'amsort.com')
    const db = await getDB()
    const contacts = await db.collection('sms-numbers').find().toArray()
    const numbers = contacts.map(contact => contact.phone)
    const smsBody = `${intro}${report.errorDesc}. Otwórz link ${hostname}/notification?id=${report.id}, aby dowiedzieć się więcej`
    return smsapi.message
        .sms()
        .from(from)
        .to(numbers.join(','))
        .message(smsBody)
        .execute()
}

function atob(b64Encoded) {
    return Buffer.from(b64Encoded, 'base64').toString()
}

/**
 * @typedef Report
 * @prop { string } errorDesc
 * @prop { string } [comment]
 * @prop { string } id
 * @prop { Date } date
 * @prop { string[] } [tags] 
 * @prop { boolean } [saved]
 * @prop { boolean } [seen]
 * @prop { string } [url]
 */

/**
 * 
 * @param { import('mailparser').ParsedMail } mail 
 * @returns { Promise<boolean> }
 */
async function isMailRelevant(mail) {
    const shouldBeFrom = await config.getSetting('onlyMailFrom')
    if (shouldBeFrom && mail.from !== shouldBeFrom) return false
    return true
}

/**
 * 
 * @param { string } encMessage 
 * @param { string } id 
 * @returns { Promise<Report> }
 */
async function processRawMessage(encMessage, id) {
    const message = atob(encMessage)
    const mail = await simpleParser(message)
    if (!await isMailRelevant(mail)) throw Error('Irrelevant mail')
    const { content, tags } = processTags(mail.subject)
    return {
        date: mail.date,
        errorDesc: content,
        id, tags
    }
}

/**
 * 
 * @param { string } subject 
 */
function processTags(subject) {    
    const tagMatcher = /\[([^\]]+)\]/y;
    let matching, tags = [], index, content
    while (matching = tagMatcher.exec(subject)) {
        tags.push(matching[1])
        index = matching.index
    }
    if (tags.length) {
        const contentStart = index + tags[tags.length - 1].length + 2;
        content = subject.slice(contentStart).trim();
    }
    return { content, tags }
}

/**
 * 
 * @param { object } notification 
 * @returns { Promise<Report[]> }
 */
async function getNewMail(notification) {
    const { historyId: newHistoryId } = JSON.parse(atob(notification.message.data))
    let historyId = await config.getSetting('lastHistoryId')
    if (!historyId) {
        historyId = newHistoryId
    }
    if (newHistoryId) {
        await config.setSetting('lastHistoryId', newHistoryId)
    }
    const gmail = await gmailFactory()
    const listing = await gmail.users.history.list({
        userId: "me",
        startHistoryId: String(historyId),
        // historyTypes: [ "messageAdded" ]
    })
    const history = listing.data.history;
    if (!history) throw Error('History not provided')
    const messageIDs = history.reduce((array, history) => {
        if (history.messagesAdded) {
            array = array.concat(
                history.messagesAdded.map(
                    message => message.message.id
                )
            )
        }
        return array
    }, [])
    const reports = Promise.all(messageIDs.map(async id => {
        try {
            const rawMessage = await gmail.users.messages.get({
                id, userId: "me", format: "raw"
            })
            const report = await processRawMessage(rawMessage.data.raw, id)
            return report
        } catch (err) {
            console.error(err)
            return null
        }
    }))
    return reports
}

module.exports =
    /**
     * @param {import('botbuilder').BotFrameworkAdapter} adapter
     */
    function NotificationRouter(adapter) {
        const router = Router()
        /**
         * @param {Report} report
         */
        async function notify(report) {
            if (!report || !report.id) throw Error('Invalid report')
            const shouldSendSMS = await config.getSetting("notifySMS", true)
            const shouldNotifyTeams = await config.getSetting("notifyTeams", true)
            const db = await getDB()
            const reportCollection = db.collection('failure-reports')
            const reportInDB = await reportCollection.findOne({ id: report.id })
            if (!report.saved) { // new report
                if (reportInDB) throw Error('Report already exists')
                report.saved = true;
                report.seen = false;
                report.url = `${hostname}/notification?id=${report.id}`
                await reportCollection.insertOne(report)
                if (shouldSendSMS) sendSMS(report)
            } else { // update marked as seen status
                report = reportInDB
            }
            if (shouldNotifyTeams && !report.seen) {
                const card = makeCard(report);
                await sendNotificationToTeams(card);
                const timeout = (await config.getSetting("notificationTimeout", 5)) * 60 * 1000;
                setTimeout(() => {
                    notify(report);
                }, timeout);
            }
        }

        /**
          * @param {import("botframework-schema").Attachment} card
          */
        async function sendNotificationToTeams(card) {
            // const expirationDate = new Date(new Date().valueOf() + 60000 * 60 * 24 * 90)
            return Promise.all(
                (await getConversations()).map(conversation =>
                    adapter.continueConversation(conversation, async (context) => {
                        MicrosoftAppCredentials.trustServiceUrl(context.activity.serviceUrl);
                        try {
                            await context.sendActivity({ attachments: [card] });
                        } catch (e) {
                            console.log(e);
                        }
                    })
                )
            )
        }

        async function notificationPosted(req, res) {
            try {
                const reports = await getNewMail(req.body)
                await Promise.all(
                    reports.map(report => notify(report).catch(console.error))
                )
                res.json({
                    status: 'sent'
                })
            } catch (error) {
                console.error(error)
                res.json({
                    error: true
                })
            }
        }
        router.post('/notify', notificationPosted);

        return router;
    }
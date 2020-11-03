//@ts-check
const mongodb = require('mongodb');

/**
 * @type { import('googleapis').gmail_v1.Gmail }
 */
let gmail
/**
 * @type { import("mongodb").Db }
 */
let db

/**
 * @returns { Promise<import('googleapis').gmail_v1.Gmail> }
 */
async function gmailFactory() {
    if (gmail) return gmail
    const config = require('./config');
    const { google, oauth2_v2 } = require('googleapis');
    const auth = new google.auth.OAuth2({
        clientId: process.env.GmailClientID,
        clientSecret: process.env.GmailClientSecret
    })
    const tokens = await config.getSetting("tokens")
    if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
        await refreshTokens(auth, tokens);
    } else {
        auth.setCredentials(tokens)
    }
    auth.on("tokens", async (newTokens) => {
        if (newTokens.refresh_token) {
            await config.setSetting('newTokens', newTokens)
            console.log('refresh tokens received')
        }
    })
    gmail = google.gmail({ auth, version: 'v1' })
    return gmail
}

/**
 * 
 * @param { import('googleapis').Auth.OAuth2Client } auth 
 * @param { import('googleapis').Auth.Credentials } oldTokens
 */
async function refreshTokens(auth, oldTokens) {
    const config = require('./config');
    const { google } = require('googleapis');
    // just call the API 
    const isAuthorized = () => google.gmail({ version: 'v1', auth })
        .users.getProfile({ userId: 'me' }).then(() => true).catch(() => false)
    console.log("using new tokens");
    const newTokens = await config.getSetting('newTokens');
    auth.setCredentials(newTokens);
    let recentTokens
    if (await isAuthorized()) recentTokens = auth.credentials;
    else {
        console.log('using new tokens failed - fall back to refresh_token');
        auth.setCredentials({
            refresh_token: oldTokens.refresh_token
        })
        if (!await isAuthorized()) throw Error('Unable to authorize using refresh_token')
    }
    await config.setSetting('tokens', recentTokens);
}

/**
 * @param {Partial<import('botbuilder').ConversationReference>} ref
 */
async function conversationAdded(ref) {
    const db = await getDB();
    return db.collection('teams-conversations').updateOne(
        { "conversation.id": ref.conversation.id },
        { $set: ref },
        { upsert: true }
    )
}
/**
 * @returns {Promise<Partial<import('botbuilder').ConversationReference>[]>}
 */
async function getConversations() {
    const db = await getDB();
    return db.collection('teams-conversations').find().toArray();
}

async function registerReport(report) {
    console.log({ report })
    const db = await getDB();
    if (!report.id) {
        const id = require('uniqid')();
        report.id = id;
        report.registered = true;
        await db.collection('reports').insertOne(report)
        return;
    } else {
        report = { ...report, _id: undefined }
        await db.collection('reports').updateOne(
            { $where: (curr) => curr.id === report.id },
            { $set: report }
        )
    }
}

async function getReport(id) {
    const db = await getDB();
    const result = await db.collection('reports').findOne({ id })
    return result
}

async function getDB() {
    const client = await mongodb.connect("mongodb://localhost/");
    db = client.db('failure-report-app');
    return db;
}

module.exports = { gmailFactory, conversationAdded, getConversations, registerReport, getReport, getDB }


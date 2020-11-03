// @ts-check
const { google } = require('googleapis')
const path = require('path');
const { getDB, gmailFactory } = require('./commons');

async function authorize() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GmailClientID,
        process.env.GmailClientSecret,
        "http://localhost:3000/oauth"
      );
      const scopes = [
        'https://mail.google.com/'
      ];
      
      const url = oauth2Client.generateAuthUrl({
        // 'offline' - gets refresh_token
        access_type: 'offline',
        scope: scopes
      });

      const server = require('express')()
      server.listen(3000, () => {
          console.log('server started')
          console.log(`Open ${url} to authorize`);
      })
      server.get('/oauth', async (req, res) => {
        const code = req.query.code
        // @ts-ignore
        const {tokens} = await oauth2Client.getToken(code)
        oauth2Client.setCredentials(tokens);
        const db = await getDB()
        await db.collection('configuration').updateOne(
            { name: 'tokens' },
            { $set: { name: 'tokens', value: tokens } },
            { upsert: true }
        )
        res.json({ status: "success" })
        process.exit(0)
      })
}

async function renewSubscription() {
    const gmail = await gmailFactory()
    console.log('renewing subscription...');
    const resp = await gmail.users.watch({
        userId: "amsort.hmi.reports@gmail.com",
        requestBody: {
            topicName: "projects/amsort-hmi-reports/topics/new-mail"
        }
    })
    if (resp.status !== 200) {
        throw Error(`Subscription failed [${resp.status}]`)
    }
    console.log('done!');
}

async function cancelSubscription() {
    const gmail = await gmailFactory()
    console.log('cancelling subscription...');
    const resp = await gmail.users.stop({
        userId: "me"
    })
    if (resp.status !== 200) {
        throw Error(`Cancelling subscription failed [${resp.status}]`)
    }
    console.log('done!');
}

// @ts-ignore
if (require.main === module) {
    const ENV_FILE = path.join(__dirname, '.env');
    require('dotenv').config({ path: ENV_FILE });
    if (process.argv && process.argv.length >= 3) {
        switch (process.argv[2]) {
            case 'cancel':
                cancelSubscription()
                break

            case 'authorize':
                authorize()
                break

            default:
                renewSubscription()
                break
        }
    } else renewSubscription()
} else module.exports = { renewSubscription, cancelSubscription }
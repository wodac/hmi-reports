//@ts-check
const { Router } = require('express')
const { getDB } = require('./commons')
const config = require('./config')

const api = Router()

api.put('/sms-numbers', async (req, res) => {
    try {
        const numberData = req.body.data
        const id = numberData._id
        delete numberData._id
        const db = await getDB()
        const numbersCollection = db.collection('sms-numbers')
        await numbersCollection.updateOne(
            { $where: d => id === d._id },
            { $set: numberData }
        )
        res.json({ success: true })
    } catch (err) {
        console.error(err)
        res.status(400).json({ error: true })
    }
})

api.post('/sms-numbers', async (req, res) => {
    try {
        const numberData = req.body.data
        const id = numberData._id
        delete numberData._id
        const db = await getDB()
        const numbersCollection = db.collection('sms-numbers')
        const result = await numbersCollection.insertOne(numberData)
        res.json({ success: true, id: result.insertedId })
    } catch (err) {
        console.error(err)
        res.status(400).json({ error: true })
    }
})

api.delete('/sms-numbers', async (req, res) => {
    try {
        const ids = req.body.data.ids
        const db = await getDB()
        const numbersCollection = db.collection('sms-numbers')
        await numbersCollection.deleteMany({
            id: { $in: ids }
        })
        res.json({ success: true })
    } catch (err) {
        console.error(err)
        res.status(400).json({ error: true })
    }
})

api.get('/sms-numbers', async (req, res) => {
    const query = req.query
    const db = await getDB()
    const numbersCollection = db.collection('sms-numbers')
    try {
        const data = await numbersCollection.find().toArray()
        res.json({ success: true, data })
    } catch (err) {
        console.error(err)
        res.json({ error: true })
    }
})

api.get('/config', async (req, res) => {
    const settings = await config.getSettings(true)
    res.json(settings)
})

api.post('/config', async (req, res) => {
    try {
        const settings = req.body.data
        const result = await config.setSettings(settings, true)
        res.json(result)
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: true })
    }
})

api.get('/reports', async (req, res) => {
    const { page: pageStr, limit: limitStr, tags } = req.query
    // @ts-ignore
    const page = pageStr ? parseInt(pageStr) : 0,
        // @ts-ignore
        limit = limitStr ? parseInt(limitStr) : 25
    const filter = tags ? { tags: { $in: tags } } : {}
    const db = await getDB()
    const cursor = db.collection('failure-reports').find(filter)
    try {
        const count = await cursor.count()
        const reports = await cursor.limit(limit).skip(page * limit).toArray()
        res.json({ reports, count, page, limit })
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: true })
    }
})

api.get('/report', async (req, res) => {
    const id = req.query.id
    const db = await getDB()
    try {
        const result = await db.collection('failure-reports').findOne({ id })
        res.json(result)
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: true })
    }
})

api.post('/report', async (req, res) => {
    const { id, seen, seenBy } = req.body
    const updateSeenBy = seenBy ? { $addToSet: { seenBy } } : null
    try {
        const db = await getDB()
        const result = await db.collection('failure-reports').updateOne(
            { id },
            { $set: { seen }, ...updateSeenBy }
        )
        res.json(result)
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: true })
    }
})

module.exports = api
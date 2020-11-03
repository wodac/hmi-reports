// @ts-check
const { getDB } = require("./commons")

/**
 * @template T
 * @typedef {*} ConfigInterfaceSetting
 */

/**
 * @typedef ConfigInterface
 * @prop { string } lastHistoryId
 * @prop { object } tokens
 * @prop { object } newTokens
 * @prop { number } notificationTimeout
 * @prop { string } smsIntroduction
 * @prop { string } smsFrom
 * @prop { boolean } notifySMS
 * @prop { boolean } notifyTeams
 * @prop { string } onlyMailFrom
 */

/**
 * 
 */
class Config {
    async _init() {
        if (!this._active) {
            this.db = await getDB()
            this.collection = this.db.collection('configuration')
            this._active = true
        }
    }

    /**
     * @param {boolean} [onlyPublic]
     * @returns { Promise<Partial<ConfigInterface>> }
     */
    async getSettings(onlyPublic) {
        if (!this._active) await this._init()
        const filter = onlyPublic ? { private: { $ne: true } } : null
        const array = await this.collection.find(filter).toArray()
        return array.reduce((obj, setting) => {
            obj[setting.name] = setting
            return obj
        }, {})
    }

    /**
     * 
     * @param { Partial<ConfigInterface> } settings 
     * @param { boolean } [onlyPublic]
     */
    async setSettings(settings, onlyPublic) {
        if (!this._active) await this._init()
        const filter = onlyPublic ? { private: { $ne: true } } : null
        const res = await this.collection.bulkWrite(
            Object.entries(settings).map(entry => {
                return {
                    updateOne: { 
                        filter: { name: entry[0], ...filter },
                        update: { $set: { name: entry[0], value: entry[1] } }
                    }
                }
            })
        )
        return res
    }

    /**
     * @template T
     * @param { T extends keyof ConfigInterface ? keyof ConfigInterface : keyof ConfigInterface } name 
     * @param { ConfigInterfaceSetting<T> } [defaultValue]
     * @returns { Promise<ConfigInterface[T]> }
     */
    async getSetting(name, defaultValue) {
        if (!this._active) await this._init()
        const result = await this.collection.findOne({ name })
        if (!result) return defaultValue
        return result.value
    }

    /**
     * @template T
     * @param { T extends keyof ConfigInterface ? keyof ConfigInterface : keyof ConfigInterface } name 
     * @param { ConfigInterfaceSetting<T> } value 
     */
    async setSetting(name, value) {
        if (!this._active) await this._init()
        await this.collection.updateOne(
            { name },
            { $set: { name, value } },
            { upsert: true }
        )
        return
    }
}

const config = new Config()
// config.init()
module.exports = config
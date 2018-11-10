const outdent = require('outdent')

class GasTracker {

    constructor() {
        this.calls = []
    }

    async track(description, tx) {
        this.calls.push({
            description,
            gasUsed: tx.receipt.gasUsed
        })
    }

    gasUsed(description) {
        if (description) {
            const call = this.calls.find(call => call.description === description)
            if (call)
                return call.gasUsed
        }

        return `${this.calls.map(call => `${call.description}: ${call.gasUsed} gas\n`)}`
    }

    summary() {
        return outdent`

            Gas Usage Summary
            ${this.calls.map(call => 
                `   ${call.description}: ${call.gasUsed} gas\n`
            )}
        `
    }
}

module.exports = { GasTracker }
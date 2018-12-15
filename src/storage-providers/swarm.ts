const swarm = require('swarmgw')()
const {promisify} = require('es6-promisify')
const abBase64 = require('base64-arraybuffer')
import { StorageProvider } from './storage-provider'

const put = promisify(swarm.put)
const get = promisify(swarm.get)

export class Swarm implements StorageProvider {
    async getFile(fileId: string): Promise<ArrayBuffer> {
        let file = await get('bzz-raw://' + fileId)
        return abBase64.decode(file)
    }

    async addFile(file: ArrayBuffer): Promise<string> { 
        const fileAsString = abBase64.encode(file)
        return await put(fileAsString)
    }
}
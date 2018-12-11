const swarm = require('swarmgw')()
const {promisify} = require("es6-promisify")
import { StorageProvider } from './storage-provider'

const put = promisify(swarm.put)
const get = promisify(swarm.get)

export class Swarm implements StorageProvider {
    async getFile(fileId: string): Promise<ArrayBuffer> {
        let file = await get('bzz-raw://' + fileId)
        console.log('SWARM RETURN TYPE: ', typeof file)
        return this.str2ab(file)
    }

    async addFile(file: ArrayBuffer): Promise<string> { 
        const fileAsString = this.ab2str(file)
        return await put(fileAsString)
    }

    str2ab(str) {
        var buf = new ArrayBuffer(str.length * 2)
        var bufView = new Uint16Array(buf)
        for (var i = 0, strLen = str.length; i < strLen; i++)
          bufView[i] = str.charCodeAt(i)
        return buf
    }

    ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }
}
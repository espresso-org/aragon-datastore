import * as ipfsAPI from 'ipfs-api' 
import { StorageProvider } from './storage-provider'


export class IpfsOptions {
    host: string
    port: string
    protocol = 'http'
}

export class Ipfs implements StorageProvider {
    private _ipfs

    constructor(opts?: IpfsOptions) {
        opts = Object.assign(new IpfsOptions, opts)
        this._ipfs = new ipfsAPI(opts)
    }

    async getFile(fileId: string): Promise<Uint8Array> {
        let result = await this._ipfs.get(fileId)

        return result.length && result[0].content
    }

    async addFile(file: ArrayBuffer) {
        const addResult = await this._ipfs.add(this._ipfs.Buffer.from(file))

        if (addResult.length > 0) {
            await this._ipfs.pin.add(addResult[0].hash)
            return addResult[0].hash
        }
        else 
            throw 'Unable to add file to IPFS'
    }

}




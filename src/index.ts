import * as async from 'async'
import * as encryption from './encryption-providers'
import * as rpc from './rpc-providers'
import * as storage from './storage-providers'

import { createFileFromTuple } from './utils'
import * as getWeb3 from './utils/getWeb3'



export const providers = { storage, encryption, rpc }

export class DatastoreOptions {
    storageProvider = new providers.storage.Ipfs(null as any)
    encryptionProvider = new providers.encryption.Aes()
    rpcProvider: any
}


export class Datastore {

    private _storage
    private _encryption
    private _rpc
    private _contract
    private _isInit

    constructor(opts?: DatastoreOptions) {
        opts = Object.assign(new DatastoreOptions(), opts || {})

        this._storage = opts.storageProvider
        this._encryption = opts.encryptionProvider
        this._rpc = opts.rpcProvider
        this._isInit = this.initialize()
    }

    async initialize() {
        // Initialize only once
        if (!this._isInit) {
            this._contract = await this._rpc.getContract()
        }
        else {
            return this._isInit
        }
    }

    async addFile(file: ArrayBuffer) {
        await this.initialize()

        const storageId = await this._storage.addFile(file)
        const fileId = await this._contract.addFile(storageId, file.byteLength, true)
        return fileId
    }

    async getFile(fileId: number) {
        const fileInfo = await this.getFileInfo(fileId)
        const fileContent = await this._storage.getFile(fileInfo.storageRef)

        return { ...fileInfo, content: fileContent }
    }

    async getFileInfo(fileId: number) {
        const fileTuple = await this._contract.getFile(fileId)
        return { id: fileId, ...createFileFromTuple(fileTuple) }
    }

    async listFiles() {
        //const lastFileId = await this._contract.call('lastFileId', { from: this._contract.accounts[0] }
    }

}

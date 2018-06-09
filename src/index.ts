import * as async from 'async'
import * as encryption from './encryption-providers'
import * as rpc from './rpc-providers'
import * as storage from './storage-providers'

import { createFileFromTuple } from './utils'



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

    async addFile(name: string, file: ArrayBuffer) {
        await this.initialize()

        const storageId = await this._storage.addFile(file)
        const fileId = await this._contract.addFile(storageId, name, file.byteLength, true)
        return fileId
    }

    async getFile(fileId: number) {
        await this.initialize()

        const fileInfo = await this.getFileInfo(fileId)
        const fileContent = await this._storage.getFile(fileInfo.storageRef)

        return { ...fileInfo, content: fileContent }
    }

    async getFileInfo(fileId: number) {
        await this.initialize()

        const fileTuple = await this._contract.getFile(fileId)
        return { id: fileId, ...createFileFromTuple(fileTuple) }
    }

    async listFiles() {
        await this.initialize()

        const lastFileId = (await this._contract.lastFileId()).toNumber()
        let files = []
        
        // TODO: Optimize this code
        for (let i = 1; i <= lastFileId; i++) {
            files[i] = await this.getFileInfo(i)
        }

        return files
    }

 
    async setFileContent(fileId: number, file: ArrayBuffer) {
        await this.initialize()
        const storageId = await this._storage.addFile(file)
        await this._contract.setFileContent(fileId, storageId, file.byteLength)

    }

    async setFilename(fileId, newName) {
        await this.initialize()

        await this._contract.setFilename(fileId, newName)

    }

}

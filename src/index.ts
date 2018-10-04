import * as async from 'async'
import * as encryption from './encryption-providers'
import * as rpc from './rpc-providers'
import * as storage from './storage-providers'

import {
    createFileFromTuple, 
    createPermissionFromTuple, 
    createSettingsFromTuple } from './utils'
import { DatastoreSettings } from './datastore-settings';
import { RpcProvider } from './rpc-providers/rpc-provider';

export const providers = { storage, encryption, rpc }

export class DatastoreOptions {
    rpcProvider: any
}

export class Datastore {
    private _storage: storage.StorageProvider
    private _encryption: encryption.EncryptionProvider
    private _rpc: RpcProvider
    private _contract: rpc.RpcProviderContract
    private _settings: DatastoreSettings
    private _isInit

    /**
     * Creates a new Datastore instance
     * @param {Object} opts.rpcProvider - RPC provider (Web3, Aragon)
     */
    constructor(opts?: DatastoreOptions) {
        opts = Object.assign(new DatastoreOptions(), opts || {})

        this._rpc = opts.rpcProvider
        this._isInit = this._initialize()
    }

    private async _initialize() {
        // Initialize only once
        if (!this._isInit) {
            this._contract = await this._rpc.getContract()
            await this._refreshSettings()
        }
        else 
            return this._isInit
    }

    private async _refreshSettings() {
        this._settings = createSettingsFromTuple(await this._contract.settings())
        this._storage = storage.getStorageProviderFromSettings(this._settings)
        this._encryption = encryption.getEncryptionProviderFromSettings(this._settings)
    }

    /**
     * Add a new file to the Datastore
     * @param {string} name - File name
     * @param {ArrayBuffer} file - File content
     */
    async addFile(name: string, file: ArrayBuffer) {
        await this._initialize()

        const storageId = await this._storage.addFile(file)
        const fileId = await this._contract.addFile(storageId, name, file.byteLength, true)
        return fileId
    }

    /**
     * Returns a file and its content from its Id
     * @param {number} fileId 
     * @returns {Promise<File>}
     */
    async getFile(fileId: number) {
        await this._initialize()

        const fileInfo = await this.getFileInfo(fileId)
        let fileContent = await this._storage.getFile(fileInfo.storageRef)

        const encryptionKeyAsString = await this._contract.getFileEncryptionKey(fileId)

        if (encryptionKeyAsString) {
            const encryptionKeyAsJSON = JSON.parse(encryptionKeyAsString)
            const fileEncryptionKey = await crypto.subtle.importKey('jwk', encryptionKeyAsJSON, <any>this.encryptionAlgo, true, ['encrypt', 'decrypt'])

            if (!fileInfo.isPublic)
                fileContent = await this._encryption.decryptFile(fileContent, fileEncryptionKey)
        }

        return { ...fileInfo, content: fileContent }
    }

    /**
     * Returns the file information without the content
     * @param {number} fileId 
     */
    async getFileInfo(fileId: number) {
        await this._initialize() 

        const fileTuple = await this._contract.getFile(fileId)
        return { id: fileId, ...createFileFromTuple(fileTuple) }
    }

    /**
     * Delete the specified file
     * @param {number} fileId 
     */
    async deleteFile(fileId: number) {
        await this._initialize() 

        await this._contract.deleteFile(fileId)
    }

    /**
     * Returns the permissions on file with `fileId`
     * @param {number} fileId File Id
     */
    async getFilePermissions(fileId: number) {
        await this._initialize()

        const entitiesAddress = await this._contract.getEntitiesWithPermissionsOnFile(fileId)
        return Promise.all(
            entitiesAddress
            .filter(entity => entity !== '0x0000000000000000000000000000000000000000')
            .map(async entity => ({
                entity,
                ...createPermissionFromTuple(await this._contract.getEntityPermissionsOnFile(fileId, entity))
            })) 
        )
    }

    /**
     * Fetch the datastore settings
     */
    async getSettings(): Promise<DatastoreSettings> {
        await this._initialize()

        return this._settings
    }

    /**
     * Sets the settings for IPFS storage
     * @param {string} host Host
     * @param {number} port Port
     * @param {string} protocol HTTP protocol
     */
    async setIpfsStorageSettings(host: string, port: number, protocol: string) {
        await this._initialize()

        await this._contract.setIpfsStorageSettings(host, port, protocol)
        await this._refreshSettings()
    }

    /**
     * Sets the settings for Aes encryption
     * @param {string} name Name of the algorithm
     * @param {number} length Length of the encryption key
     */
    async setAesEncryptionSettings(name: string, length: number) {
        await this._initialize()

        await this._contract.setAesEncryptionSettings(name, length)
        await this._refreshSettings()
    }

    /**
     * Returns files information
     */
    async listFiles() {
        await this._initialize()

        const lastFileId = (await this._contract.lastFileId()).toNumber()
        let files = []
        
        // TODO: Optimize this code
        for (let i = 1; i <= lastFileId; i++) {
            files[i] = await this.getFileInfo(i)
        }
        return files
    }

    /**
     * Replace content for a specific file
     * @param {number} fileId File Id
     * @param {ArrayBuffer} file File content
     */
    async setFileContent(fileId: number, file: ArrayBuffer) {
        await this._initialize()

        const storageId = await this._storage.addFile(file)
        await this._contract.setFileContent(fileId, storageId, file.byteLength)
    }

    /**
     * Add/Remove read permission to an entity for a specific file
     * @param {number} fileId File Id
     * @param {string} entity Entity address
     * @param {boolean} hasPermission Write permission
     */
    async setReadPermission(fileId: number, entity: string, hasPermission: boolean) {
        await this._initialize()

        await this._contract.setReadPermission(fileId, entity, hasPermission)
    }

    /**
     * Add/Remove write permission to an entity for a specific file
     * @param {number} fileId File Id
     * @param {string} entity Entity address
     * @param {boolean} hasPermission Write permission
     */
    async setWritePermission(fileId: number, entity: string, hasPermission: boolean) {
        await this._initialize()

        await this._contract.setWritePermission(fileId, entity, hasPermission)
    }

    /**
     * Add/Remove permissions to an entity for a specific file
     * @param {number} fileId File Id
     * @param {string} entity Entity address
     * @param {boolean} read read permission
     * @param {boolean} write write permission
     */
    async setEntityPermissions(fileId: number, entity: string, read: boolean, write: boolean) {
        await this._initialize()

        await this._contract.setEntityPermissions(fileId, entity, read, write)
    }

    /**
     * Sets multiple permissions on a file
     * @param {number} fileId 
     * @param {Object[]} entityPermissions 
     * @param {Object[]} groupPermissions 
     */
    async setPermissions(fileId: number, entityPermissions: any[], groupPermissions: any[], isPublic: boolean) { 
        await this._initialize()

        let storageId
        let fileByteLength
        let encryptionFileData
        if (!isPublic) {
            let file = await this.getFile(fileId)
            fileByteLength = file.content.byteLength
            encryptionFileData = await this._encryption.encryptFile(file.content)
            storageId = await this._storage.addFile(encryptionFileData.encryptedFile)
        }

        await this._contract.setMultiplePermissions(
            fileId,
            groupPermissions.map(perm => perm.groupId),
            groupPermissions.map(perm => perm.read),
            groupPermissions.map(perm => perm.write),
            entityPermissions.map(perm => perm.entity),
            entityPermissions.map(perm => perm.read),
            entityPermissions.map(perm => perm.write),
            isPublic,
            storageId,
            fileByteLength,
            encryptionFileData.encryptionKey
        )
    }

    /**
     * Removes an entity's permissions from a file
     * @param {number} fileId File id
     * @param {string} entity 
     */
    async removeEntityFromFile(fileId: number, entity: string) {
        await this._initialize()

        await this._contract.removeEntityFromFile(fileId, entity)
    }

    /**
     * Changes name of a file for `newName`
     * @param {number} fileId File Id
     * @param {string} newName New file name
     */
    async setFileName(fileId: number, newName: string) {
        await this._initialize()

        await this._contract.setFileName(fileId, newName)
    }

    /**
     * Creates a new group of entities
     * @param {string} groupName Name of the group
     */
    async createGroup(groupName: string) {
        await this._initialize()

        await this._contract.createGroup(groupName)
    }

    /**
     * Deletes a group
     * @param {number} groupId Id of the group
     */
    async deleteGroup(groupId: number) {
        await this._initialize()

        await this._contract.deleteGroup(groupId)
    }

    /**
     * Rename an existing group
     * @param {number} groupId Id of the group to rename
     * @param {string} newGroupName New group name
     */
    async renameGroup(groupId: number, newGroupName: string) {
        await this._initialize()

        await this._contract.renameGroup(groupId, newGroupName)
    }

    /**
     * Returns an array of all the groups infos
     */
    async getGroups() {
        await this._initialize()

        let groups = []
        let groupsIds = await this._contract.getGroupIds()
        for (var i = 0; i < groupsIds.length; i++) {
            let groupInfos = await this._contract.getGroup(groupsIds[i])
            if (groupInfos && groupInfos[1] !== 0) {
                let group = {
                    id: groupsIds[i],
                    name: groupInfos[1],
                    entities: groupInfos[0].filter(entity => entity !== '0x0000000000000000000000000000000000000000')
                }
                groups.push(group)
            }
        }
        return groups
    }

    /**
     * Returns the groups permissions for file with `fileId`
     * @param {number} fileId 
     */
    async getFileGroupPermissions(fileId: number) {
        await this._initialize()

        const groupIds = await this._contract.getGroupsWithPermissionsOnFile(fileId)
        return Promise.all(
            groupIds
            .map(groupId => parseInt(groupId))
            .filter(groupId => groupId > 0)
            .map(async groupId => ({
                groupId: groupId,
                groupName: (await this._contract.getGroup(groupId))[1],
                ...createPermissionFromTuple(await this._contract.getGroupPermissionsOnFile(fileId, groupId))
            }))
        )
    }

    /**
     * Returns the entities from a group
     * @param {number} groupId Id of the group to get entities from
     */
    async getGroup(groupId: number) {
        await this._initialize()

        return (await this._contract.getGroup(groupId))
            .filter(entity => entity !== '0x0000000000000000000000000000000000000000')
    }

    /**
     * Add an entity to a group
     * @param {number} groupId Id of the group to insert the entity in
     * @param {string} entity Entity to add in group
     */
    async addEntityToGroup(groupId: number, entity: string) {
        await this._initialize()

        await this._contract.addEntityToGroup(groupId, entity)
    }

    /**
     * Removes an entity from a group
     * @param {number} groupId Id of the group to remove the entity from
     * @param {string} entity Entity to remove from group
     */
    async removeEntityFromGroup(groupId: number, entity: string) {
        await this._initialize()

        await this._contract.removeEntityFromGroup(groupId, entity)
    }

    /**
     * Sets read and write permissions on a file for a group
     * @param {number} fileId Id of the file
     * @param {number} groupId Id of the group
     * @param {boolean} read Read permission
     * @param {boolean} write Write permission
     */
    async setGroupPermissions(fileId: number, groupId: number, read: boolean, write: boolean) {
        await this._initialize()

        await this._contract.setGroupPermissions(fileId, groupId, read, write)
    }

    /**
     * Removes a group from a file's permissions
     * @param {number} fileId Id of the file
     * @param {number} groupId Id of the group
     */
    async removeGroupFromFile(fileId: number, groupId: number) {
        await this._initialize()

        await this._contract.removeGroupFromFile(fileId, groupId)
    }

    /**
     * Datastore events
     */
    async events(...args) {
        // TODO: Return an Observable without async
        await this._initialize()
        
        return this._contract.events(...args)
    }
}

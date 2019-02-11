import * as JSZip from 'jszip'
import * as rpc from './rpc-providers'
import * as storage from './storage-providers'
import * as Color from 'color'
import * as _ from 'lodash'
import { FileCache } from './utils/file-cache'
import { throttleTime, delay, filter } from 'rxjs/operators'
export { FileCache } from './utils/file-cache'
import * as abBase64 from 'base64-arraybuffer'
import { createFileFromTuple, createPermissionFromTuple, createSettingsFromTuple } from './utils'
import { DatastoreSettings, StorageProvider } from './datastore-settings'
import { RpcProvider } from './rpc-providers/rpc-provider'
import { EventEmitter } from './utils/event-emitter'
import * as Web3 from 'web3'

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

const web3 = new Web3()

export const providers = { storage, rpc }

export class DatastoreOptions {
    rpcProvider: any
}

export class Datastore {
    private _storage: storage.StorageProvider
    private _rpc: RpcProvider
    private _contract: rpc.RpcProviderContract
    private _settings: DatastoreSettings
    private _isInit
    private _internalEvents: EventEmitter
    private _foldersCache: FileCache
    private _latestBlockNumber = 0

    /**
     * Creates a new Datastore instance
     * @param {Object} opts.rpcProvider - RPC provider (Web3, Aragon)
     */
    constructor(opts?: DatastoreOptions) {
        opts = Object.assign(new DatastoreOptions(), opts || {})

        this._rpc = opts.rpcProvider
        this._internalEvents = new EventEmitter()
        this._isInit = this._initialize()
    }

    private async _initialize() {
        // Initialize only once
        if (!this._isInit) {
            this._contract = await this._rpc.getContract()
            await this._refreshSettings()

            if (this._storage) {
                try {
                    await this._storage.validateServer()
                } catch {
                    return
                }
            }

            await this._refreshCache()
            this._latestBlockNumber = await this._contract.getBlockNumber()

            this._contract
                .events()
                .pipe(filter<any>(e => e.blockNumber > this._latestBlockNumber))
                .merge(this._internalEvents.events)
                .pipe(throttleTime(100))
                .subscribe(this._handleEvents.bind(this))
        }
        else 
            return this._isInit
    }

    private async _handleEvents(event) {
        switch (event.event) {
            case 'FileChange':
            case 'PermissionChange':
                const returnedValues = event.returnValues || event.returnedValues
                const fileId = parseInt(returnedValues.fileId)
                this._foldersCache.lockAndUpdateFile(fileId, this._getFileInfo(fileId))
                break;
        }
    }

    private async _refreshCache() {
        try {
            this._foldersCache = new FileCache(await this._getAllFiles())
        } catch(e) {
            this._foldersCache = new FileCache([])
        }
    }

    private async _refreshSettings() {
        this._settings = { 
            ...createSettingsFromTuple(await this._contract.settings()),
            ...(await this._getCachedSettings())
        }

        this._storage = storage.getStorageProviderFromSettings(this._settings)
    }

    private async _getCachedSettings() {
        return new Promise((res, rej) => {
            (this._contract as any)
            ._aragonApp
            .rpc
            .sendAndObserveResponses('cache', ['get', 'datastoreSettings'])
            .pluck('result')
            .subscribe(settings => res(settings || {
                ipfs: {
                    host: 'localhost',
                    port: 5001,
                    protocol: 'HTTP'
                } 
            }))
        })
    }

    /**
     * Sends an event to the `events()` Observable
     * @param eventName 
     */
    private async _sendEvent(eventName: string, params) {
        this._internalEvents.emit(eventName, params)
    }

    /**
     * Add a new file to the Datastore
     * @param {string} name - File name
     * @param {ArrayBuffer} file - File content
     * @param {number} parentFolderId - Parent folder id
     */
    async addFile(name: string, file: ArrayBuffer, parentFolderId = 0) {
        await this._initialize()

        let byteLengthPreCompression = file.byteLength
        if (!JSZip.support.arraybuffer)
            throw new Error('Your browser does not support JSZip. Please install a compatible browser.')
 
        let zip = JSZip()
        await zip.file("content", file)
        file = await zip.generateAsync({type : "arraybuffer"})

        let contentStorageRef = await this._storage.addFile(file)
        let jsonFileData = {
            "name": name,
            "contentStorageRef": contentStorageRef,
            "fileSize": byteLengthPreCompression,
            "lastModification": new Date(),
            "labels": []
        }
        let fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.addFile(fileDataStorageRef, parentFolderId)
    }

    /**
     * Add a new folder to the Datastore
     * @param name Folder name
     * @param parentFolderId Parent folder id
     */
    async addFolder(name: string, parentFolderId = 0) {
        await this._initialize()

        const jsonFileData = {
            "name": name,
            "contentStorageRef": '',
            "fileSize": 0,
            "lastModification": new Date(),
            "labels": []
        }        
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        this._contract.addFolder(fileDataStorageRef, parentFolderId)
    }

    /**
     * Returns a folder
     * @param folderId 
     */
    async getFolder(folderId: number = 0) {
        await this._initialize()

        return this._foldersCache.getFolder(folderId)
    }

    /**
     * Returns an array parent folders for a specific file
     * @param fileId 
     */
    async getFilePath(fileId: number) {
        await this._initialize()

        return Promise.all(
            (await this._foldersCache.getFilePath(fileId))
                .map(id => this._foldersCache.getFile(id))
        )
    }

    /**
     * Returns a folder
     * @param folderId 
     */
    async listFiles(folderId: number = 0) {
        await this._initialize()

        return (await this._foldersCache.getFolder(folderId)).files
    }    
    
    /**
     * Returns all files from all folders
     */
    async getAllFiles() {
        await this._initialize()

        return (await this._foldersCache.getAllFiles()).filter(file => file)
    }

    /**
     * Returns a file and its content from its Id
     * @param {number} fileId 
     * @returns {Promise<File>}
     */
    async getFile(fileId: number) {
        await this._initialize()

        const fileInfo = await this.getFileInfo(fileId)
        let fileContent = await this._storage.getFile(fileInfo.contentStorageRef)
        if (!JSZip.support.arraybuffer)
            throw new Error('Your browser does not support JSZip. Please install a compatible browser.')

        let zip = JSZip()
        let newZip = await zip.loadAsync(fileContent)
        fileContent = await newZip.file('content').async("arraybuffer")
        return { ...fileInfo, content: fileContent }
    }

    /**
     * Returns the file information without the content
     * @param {number} fileId 
     */
    async getFileInfo(fileId: number) {
        await this._initialize()

        const fileTuple = await this._contract.getFile(fileId)

        if (this._isFilePermanantlyDeleted({ id: fileId, ...fileTuple }))
            return undefined

        const jsonFileData = await this._getFileInfoFromStorageProvider(fileId, fileTuple[0])
        return {
            id: fileId, 
            name: jsonFileData.name,
            contentStorageRef: jsonFileData.contentStorageRef,
            fileSize: jsonFileData.fileSize,
            lastModification: new Date(jsonFileData.lastModification),
            labels: jsonFileData.labels,
            ...createFileFromTuple(fileTuple)
        }
    }

    /**
     * Delete the specified file. File can be restored
     * @param {number} fileId 
     */
    async deleteFile(fileId: number) {
        await this._initialize() 

        await this._contract.deleteFile(fileId, true, false)
    }

    /**
     * Delete the specified file. File cannot be restored
     * @param fileId 
     */
    async deleteFilePermanently(fileId: number) {
        await this._initialize() 

        await this._contract.deleteFile(fileId, true, true)        
    }

    /**
     * Delete the specified files. Files cannot be restored.
     * @param fileIds 
     */
    async deleteFilesPermanently(fileIds: number[]) {
        await this._initialize() 

        await this._contract.deleteFilesPermanently(fileIds)        
    }

    /**
     * Undelete the specified file
     * @param {number} fileId 
     */
    async restoreFile(fileId: number) {
        await this._initialize() 

        await this._contract.deleteFile(fileId, false, false)
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
            .filter(entity => entity !== EMPTY_ADDRESS)
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
     * Sets the storage settings for the Datastore
     * @param storageProvider Storage provider
     * @param host Host
     * @param port Port 
     * @param protocol HTTP protocol
     */
    async setSettings(storageProvider: StorageProvider, host: string, port: number, protocol: string) {

        const hasNewStorageProvider = storageProvider !== this._settings.storageProvider

        if (hasNewStorageProvider)
            await this._contract.setSettings(storageProvider, '', 0, 'http')

        ;(this._contract as any)._aragonApp.cache('datastoreSettings', {
            ipfs: {
                host,
                port,
                protocol
            }
        })
        await this._refreshSettings()

        if (!hasNewStorageProvider) {
            await this._refreshCache()
            this._sendEvent('SettingsChange', {})
        }
    }

    /**
     * Returns files information
     * @param folderId
     */
    private async _listFiles() {
        await this._initialize()

        const lastFileId = (await this._contract.lastFileId()).toNumber()
        let files = []
        
        // TODO: Optimize this code
        for (let i = 1; i <= lastFileId; i++) {
            const file = await this.getFileInfo(i)
            if (file)
                files.push(file)
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

        let byteLengthPreCompression = file.byteLength
        if (!JSZip.support.arraybuffer)
            throw new Error('Your browser does not support JSZip. Please install a compatible browser.')

        let zip = JSZip()
        zip.file('content', file)
        file = await zip.generateAsync({type : 'arraybuffer'})
        const contentStorageRef = await this._storage.addFile(file)
        let fileInfos = await this.getFileInfo(fileId)
        let jsonFileData = JSON.parse(Buffer.from(abBase64.encode(await this._storage.getFile(fileInfos.storageRef)), 'base64').toString('ascii'))
        jsonFileData.contentStorageRef = contentStorageRef
        jsonFileData.lastModification = new Date()
        jsonFileData.fileSize = byteLengthPreCompression
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.setStorageRef(fileId, fileDataStorageRef)
        this._sendEvent('FileChange', { fileId });
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
     * Removes an entity's permissions from a file
     * @param {number} fileId File id
     * @param {string} entity 
     */
    async removeEntityFromFile(fileId: number, entity: string) {
        await this._initialize()

        await this._contract.removeEntityFromFile(fileId, entity)
    }

    /**
     * Changes name of file with Id `fileId` for `newName`
     * @param {number} fileId File Id
     * @param {string} newName New file name
     */
    async setFileName(fileId: number, newName: string) {
        await this._initialize()

        let file = await this.getFileInfo(fileId)
        let jsonFileData = JSON.parse(Buffer.from(abBase64.encode(await this._storage.getFile(file.storageRef)), 'base64').toString('ascii'))
        jsonFileData.name = newName
        jsonFileData.lastModification = new Date()
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.setStorageRef(fileId, fileDataStorageRef)
        this._sendEvent('FileChange', { fileId });
    }

    /**
     * Changes name of file with Id `fileId` for `newName` and changes the content to `newFile`
     * @param {number} fileId File Id
     * @param {string} newName New file name
     * @param {ArrayBuffer} newFile New file content
     */
    async setFileNameAndContent(fileId: number, newName: string, file: ArrayBuffer) {
        await this._initialize()

        let byteLengthPreCompression = file.byteLength
        if (!JSZip.support.arraybuffer)
            throw new Error('Your browser does not support JSZip. Please install a compatible browser.')

        let zip = JSZip()
        zip.file('content', file)
        file = await zip.generateAsync({type : 'arraybuffer'})
        const contentStorageRef = await this._storage.addFile(file)
        let fileInfos = await this.getFileInfo(fileId)
        let jsonFileData = JSON.parse(Buffer.from(abBase64.encode(await this._storage.getFile(fileInfos.storageRef)), 'base64').toString('ascii'))
        jsonFileData.contentStorageRef = contentStorageRef
        jsonFileData.fileSize = byteLengthPreCompression
        jsonFileData.name = newName
        jsonFileData.lastModification = new Date()
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.setStorageRef(fileId, fileDataStorageRef)
        this._sendEvent('FileChange', { fileId });
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
                    entities: groupInfos[0].filter(entity => entity !== EMPTY_ADDRESS)
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
        let groupIdsNotDeleted = []
        for (let i = 0; i < groupIds.length; i++) {
            let group = await this._contract.getGroup(groupIds[i])
            if (group)
                groupIdsNotDeleted.push(groupIds[i])
        }

        return Promise.all(
            groupIdsNotDeleted
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
            .filter(entity => entity !== EMPTY_ADDRESS)
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
     * Sets write permissions on a file for a group
     * @param {number} fileId Id of the file
     * @param {number} groupId Id of the group
     * @param {boolean} write Write permission
     */
    async setGroupPermissions(fileId: number, groupId: number, write: boolean) {
        await this._initialize()

        await this._contract.setGroupPermissions(fileId, groupId, write)
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
     * Add a new label to the Datastore
     * @param {string} name Label name
     * @param {string} color Label color
     */
    async createLabel(name: string, color: string) {
        await this._initialize()

        if (name.length > 28)
            throw 'Label name must not exceed 28 characters.'
               
        let bytesName = web3.fromAscii(name)
        let hexColor = Color(color).hex().replace('#', '0x')
        await this._contract.createLabel(bytesName, hexColor)
    }

    /**
     * Delete a label from the Datastore
     * @param {number} labelId Label Id
     */
    async deleteLabel(labelId: number) {
        await this._initialize()

        await this._contract.deleteLabel(labelId)
    }

    /**
     * Assign a label to a file
     * @param {number} fileId File Id
     * @param {number} labelId Label Id
     */
    async assignLabel(fileId: number, labelId: number) {
        await this._initialize()

        let file = await this.getFileInfo(fileId)
        let jsonFileData = JSON.parse(Buffer.from(abBase64.encode(await this._storage.getFile(file.storageRef)), 'base64').toString('ascii'))
        jsonFileData.labels.push(labelId)
        jsonFileData.lastModification = new Date()
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.setStorageRef(fileId, fileDataStorageRef)
    }

    /**
     * Unassign a label from a file
     * @param {number} fileId File Id
     * @param {number} labelId Label Id
     */
    async unassignLabel(fileId: number, labelId: number) {
        await this._initialize()

        let file = await this.getFileInfo(fileId)
        let jsonFileData = JSON.parse(Buffer.from(abBase64.encode(await this._storage.getFile(file.storageRef)), 'base64').toString('ascii'))
        jsonFileData.labels = jsonFileData.labels.filter(id => id !== labelId)
        jsonFileData.lastModification = new Date()
        const fileDataStorageRef = await this._storage.addFile(abBase64.decode(Buffer.from(JSON.stringify(jsonFileData)).toString('base64')))
        await this._contract.setStorageRef(fileId, fileDataStorageRef)
        this._sendEvent('FileChange', { fileId });
    }

    /**
     * Returns the wanted label
     * @param labelId Label Id
     */
    async getLabel(labelId: number) {
        await this._initialize()

        let label = await this._contract.getLabel(labelId)
        let name = web3.toUtf8(label[0]);
        let color = label[1].substring(2,8)
        if (name !== '' && color !== 0) {
            return {
                id: labelId,
                name,
                color
            }
        }
    }

    /**
     * Returns every label created in the Datastore
     */
    async getLabels() {
        await this._initialize()

        let labelIds = await this._contract.getLabels()
        let labels = []
        for (let i = 0; i < labelIds.length; i++) {
            let label = await this.getLabel(labelIds[i])
            if (label)
                labels.push(label)
        }
        return labels
    }

    /**
     * Returns the array of label's Ids on the requested file
     * @param fileId File Id
     */
    async getFileLabelList(fileId: number) {
        await this._initialize()

        const file = await this.getFileInfo(fileId)
        return file.labels
    }

    /**
     * Returns the files tagged with the specified label
     * @param labelId Label Id
     */
    async sortFilesByLabel(labelId: number) {
        await this._initialize()

        let sortedFiles = []
        let files = await this._listFiles()
        for (let i = 0; i < files.length; i++) {
            let fileLabels = await this.getFileLabelList(files[i].id)
            for (let j = 0; j < fileLabels.length; j++) {
                if (fileLabels[j] === String(labelId))
                    sortedFiles.push(files[i])
            }
        }
        return sortedFiles
    }

    /**
     * Returns true if user 
     */
    async hasDeleteRole() {
        await this._initialize()

        return this._contract.hasDeleteRole()
    }

    /**
     * Datastore events
     */
    async events(...args) {
        await this._initialize()

        // Add a 1ms delay to make sure _handleEvents() is called before
        return this._contract
            .events(...args)
            .pipe(filter<any>(e => e.blockNumber > this._latestBlockNumber))
            .merge(this._internalEvents.events)
            .pipe(delay(1))
    }

    /**
     * Refresh the files cache for a specific folder
     */
    private async _getAllFiles() {
        const lastFileId = (await this._contract.lastFileId()).toNumber()
        return Promise.all(_.range(0, lastFileId + 1).map(fileId => this._getFileInfo(fileId))) 
    }

    private async _getFileInfoFromStorageProvider(fileId: number, storageRef: string) {
        if (fileId !== 0) {
            const fileContent = await this._storage.getFile(storageRef)
            return JSON.parse(Buffer.from(abBase64.encode(fileContent), 'base64').toString('ascii'))
        }
        else {
            return {
                name: '',
                contentStorageRef: '',
                fileSize: 0,
                lastModification: JSON.stringify(new Date(0)),
                labels: []
            }
        }
    }

    private _isFilePermanantlyDeleted(file) {
        return file.storageRef === '' && file.id > 0
    }

    /**
     * Returns the file information without the content
     * @param {number} fileId 
     */
    private async _getFileInfo(fileId: number) {

        const fileTuple = await this._contract.getFile(fileId)

        if (this._isFilePermanantlyDeleted({ id: fileId, ...fileTuple }))
            return undefined

        const jsonFileData = await this._getFileInfoFromStorageProvider(fileId, fileTuple[0])
        return {
            id: fileId, 
            name: jsonFileData.name,
            contentStorageRef: jsonFileData.contentStorageRef,
            fileSize: jsonFileData.fileSize,
            lastModification: new Date(jsonFileData.lastModification),
            labels: jsonFileData.labels,
            ...createFileFromTuple(fileTuple)
        }
    }
}

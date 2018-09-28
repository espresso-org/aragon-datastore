import { BigNumber } from 'bignumber.js'
import { RpcProvider } from './rpc-provider'
import { RpcProviderContract } from './rpc-provider-contract'

export class Aragon implements RpcProvider {
  private _aragonApp

  constructor(aragonApp) {
    this._aragonApp = aragonApp
  }

  getContract(): Promise<RpcProviderContract> {
    return new Promise((res, rej) => {
      setTimeout(() => {
        this._aragonApp.accounts()
        .subscribe((accounts) => res(new AragonContract(this._aragonApp, accounts)))
      }, 1000)
    })
  }
}

export class AragonContract implements RpcProviderContract {
  private _aragonApp
  private _ethAccounts

  constructor(aragonApp, accounts) {
    this._aragonApp = aragonApp
    this._ethAccounts = accounts
  }

  async lastFileId() {
    const lastFileIdStr = await convertCallToPromise(this._aragonApp, 'lastFileId')
    return new BigNumber(lastFileIdStr)
  }

  async addFile(storageRef, name, fileSize, isPublic) {
    return convertTransactionToPromise(this._aragonApp, 'addFile', storageRef, name, fileSize, isPublic)
  }

  async getFile(fileId) {
    const fileTuple = await convertCallToPromise(this._aragonApp, 'getFileAsCaller', fileId, this._ethAccounts[0])
    fileTuple[2] = new BigNumber(fileTuple[2])
    fileTuple[7] = new BigNumber(fileTuple[7])
    return fileTuple
  }

  async getFileEncryptionKey(fileId) {
    return convertCallToPromise(this._aragonApp, 'getFileEncryptionKey', fileId)
  }

  async deleteFile(fileId) {
    return convertTransactionToPromise(this._aragonApp, 'deleteFile', fileId)
  }

  async setFileName(fileId, newName) {
    return convertTransactionToPromise(this._aragonApp, 'setFileName', fileId, newName)
  }

  async setEncryptionKey(fileId, encryptionKey) {
    return convertTransactionToPromise(this._aragonApp, 'setEncryptionKey', fileId, encryptionKey)
  }

  async setFileContent(fileId, storageRef, fileSize) {
    return convertTransactionToPromise(this._aragonApp, 'setFileContent', fileId, storageRef, fileSize)
  }

  async getEntitiesWithPermissionsOnFile(fileId) {
    return convertCallToPromise(this._aragonApp, 'getEntitiesWithPermissionsOnFile', fileId)
  }

  async getEntityPermissionsOnFile(fileId, entity) {
    return convertCallToPromise(this._aragonApp, 'getEntityPermissionsOnFile', fileId, entity)
  }

  async setWritePermission(fileId, entity, hasWritePermission) {
    return convertTransactionToPromise(this._aragonApp, 'setWritePermission', fileId, entity, hasWritePermission)
  }
  
  async setReadPermission(fileId, entity, hasReadPermission) {
    return convertTransactionToPromise(this._aragonApp, 'setReadPermission', fileId, entity, hasReadPermission)
  }

  async setMultiplePermissions(fileId, groupIds, groupRead, groupWrite, entities, entityRead, entityWrite, isPublic) {
    return convertTransactionToPromise(this._aragonApp, 'setMultiplePermissions', fileId, groupIds, groupRead, groupWrite, entities, entityRead, entityWrite, isPublic)
  }  

  events(...args) {
    return this._aragonApp.events(...args)
  }

  async settings() {
    const settingsTuple = await convertCallToPromise(this._aragonApp, 'settings')
    
    return {
      ...settingsTuple,
      3: new BigNumber(settingsTuple[3])
    }
  }

  async setIpfsStorageSettings(host: string, port: number, protocol: string) {
    return convertTransactionToPromise(this._aragonApp, 'setIpfsStorageSettings', host, port, protocol)
  }  

  async createGroup(groupName: string) {
    return convertTransactionToPromise(this._aragonApp, 'createGroup', groupName)
  }

  async deleteGroup(groupId: number) {
    return convertTransactionToPromise(this._aragonApp, 'deleteGroup', groupId)
  }

  async renameGroup(groupId: number, newGroupName: string) {
    return convertTransactionToPromise(this._aragonApp, 'renameGroup', groupId, newGroupName)
  }

  async getGroup(groupId: number) {
    return convertCallToPromise(this._aragonApp, 'getGroup', groupId)
  }

  async getGroupIds() {
    return convertCallToPromise(this._aragonApp, 'getGroupIds')
  }

  async getEntityInGroup(groupId: number, entityIndex: number) {
    return convertCallToPromise(this._aragonApp, 'getEntityInGroup', groupId, entityIndex)
  }

  async getGroupEntityCount(groupId: number) {
    return convertCallToPromise(this._aragonApp, 'getGroupCount', groupId)
  }

  async getGroupsWithPermissionsOnFile(fileId: number) {
    return convertCallToPromise(this._aragonApp, 'getGroupsWithPermissionsOnFile', fileId)
  }

  async getGroupPermissionsOnFile(fileId: number, groupId: number): Promise<any> {
    return convertCallToPromise(this._aragonApp, 'getGroupPermissionsOnFile', fileId, groupId)
  }

  async setEntityPermissions(fileId: number, entity: string, read: boolean, write: boolean): Promise<{}> {
    return convertTransactionToPromise(this._aragonApp, 'setEntityPermissions', fileId, entity, read, write)
  }

  async removeEntityFromFile(fileId: number, entity: string): Promise<{}> {
    return convertTransactionToPromise(this._aragonApp, 'removeEntityFromFile', fileId, entity)
  }

  async addEntityToGroup(groupId: number, entity: string) {
    return convertTransactionToPromise(this._aragonApp, 'addEntityToGroup', groupId, entity)
  }

  async removeEntityFromGroup(groupId: number, entity: string) {
    return convertTransactionToPromise(this._aragonApp, 'removeEntityFromGroup', groupId, entity)
  }

  async setGroupPermissions(fileId: number, groupId: number, read: boolean, write: boolean) {
    return convertTransactionToPromise(this._aragonApp, 'setGroupPermissions', fileId, groupId, read, write)
  }

  async removeGroupFromFile(fileId: number, groupId: number) {
    return convertTransactionToPromise(this._aragonApp, 'removeGroupFromFile', fileId, groupId)
  }
}

function convertCallToPromise(aragonApp, methodName, ...args): Promise<any> {
  return new Promise((resolve, rej) => {
    aragonApp.call(methodName, ...args)
      .subscribe(resolve)
  })
}

function convertTransactionToPromise(aragonApp, methodName, ...args): Promise<any> {
  return new Promise((resolve, rej) => {
    aragonApp[methodName](...args)
      .subscribe(resolve)
  })
}
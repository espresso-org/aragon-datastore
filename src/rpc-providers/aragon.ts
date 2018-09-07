import { BigNumber } from 'bignumber.js'
import { RpcProviderContract } from './rpc-provider-contract'
import { RpcProvider } from './rpc-provider'


export class Aragon implements RpcProvider {

  private _aragonApp

  constructor(aragonApp) {
    this._aragonApp = aragonApp
  }

  getContract(): Promise<RpcProviderContract> {
    return new Promise((res, rej) => {
      setTimeout(() => {
        this._aragonApp.accounts()
        .subscribe(accounts => res(new AragonContract(this._aragonApp, accounts)))
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
    let fileTuple = await convertCallToPromise(this._aragonApp, 'getFileAsCaller', fileId, this._ethAccounts[0])
    fileTuple[2] = new BigNumber(fileTuple[2])
    fileTuple[7] = new BigNumber(fileTuple[7])
    return fileTuple
  }

  async deleteFile(fileId) {
    return convertTransactionToPromise(this._aragonApp, 'deleteFile', fileId)
  }

  async setFilename(fileId, newName) {
    return convertTransactionToPromise(this._aragonApp, 'setFilename', fileId, newName)
  } 

  async setFileContent(fileId, storageRef, fileSize) {
    return convertTransactionToPromise(this._aragonApp, 'setFileContent', fileId, storageRef, fileSize)
  }   

  async getPermissionAddresses(fileId) {
    return convertCallToPromise(this._aragonApp, 'getPermissionAddresses', fileId)
  }

  async getPermission(fileId, entity) {
    return convertCallToPromise(this._aragonApp, 'getPermission', fileId, entity)
  }

  async setWritePermission(fileId, entity, hasWritePermission) {
    return convertTransactionToPromise(this._aragonApp, 'setWritePermission', fileId, entity, hasWritePermission)
  }
  
  async setReadPermission(fileId, entity, hasReadPermission) {
    return convertTransactionToPromise(this._aragonApp, 'setReadPermission', fileId, entity, hasReadPermission)
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

  async getGroups() {
    return convertTransactionToPromise(this._aragonApp, 'getGroups')
  }

  async getGroupsInfos() {
    return convertTransactionToPromise(this._aragonApp, 'getAllGroups')
  }

  async getGroup(groupId: number) {
    return convertTransactionToPromise(this._aragonApp, 'getGroup', groupId)
  }

  async getGroupCount(groupId: number) {
    return convertTransactionToPromise(this._aragonApp, 'getGroupCount', groupId)
  }

  async getGroupEntity(groupId: number, entityIndex: number) {
    return convertTransactionToPromise(this._aragonApp, 'getGroupEntity', groupId, entityIndex)
  }

  async addEntityToGroup(groupId: number, entity: string) {
    return convertTransactionToPromise(this._aragonApp, 'addEntityToGroup', groupId, entity)
  }

  async removeEntityFromGroup(groupId: number, entity: string) {
    return convertTransactionToPromise(this._aragonApp, 'removeEntityFromGroup', groupId, entity)
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
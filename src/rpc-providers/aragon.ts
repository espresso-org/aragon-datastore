import { BigNumber } from 'bignumber.js'

export class Aragon {

  private _aragonApp

  constructor(aragonApp) {
    this._aragonApp = aragonApp
  }

  async getContract() {
    return new AragonContract(this._aragonApp)
  }
}


export class AragonContract {

  private _aragonApp

  constructor(aragonApp) {
    this._aragonApp = aragonApp
  }

  async lastFileId() {
    const lastFileIdStr = await convertCallToPromise(this._aragonApp, 'lastFileId')
    return new BigNumber(lastFileIdStr)
  }

  async addFile(storageRef, name, fileSize, isPublic) {
    return convertTransactionToPromise(this._aragonApp, 'addFile', storageRef, name, fileSize, isPublic)
  }

  async getFile(fileId) {
    return convertCallToPromise(this._aragonApp, 'getFile', fileId)
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

  async setWritePermission(fileId, entity, hasWritePermission) {
    return convertTransactionToPromise(this._aragonApp, 'setWritePermission', fileId, entity, hasWritePermission)
  }  

  allEvents() {
    throw 'Now implemented'
  }

}


function convertCallToPromise(aragonApp, methodName, ...args): Promise<any> {
  return new Promise((resolve, rej) => {
    aragonApp.call(methodName, ...args)
      .subscribe(resolve)
  })
}

function convertTransactionToPromise(aragonApp, methodName, ...args) {
  return new Promise((resolve, rej) => {
    aragonApp[methodName](...args)
      .subscribe(resolve)
  })
}
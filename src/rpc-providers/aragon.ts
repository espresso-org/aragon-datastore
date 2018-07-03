import { BigNumber } from 'bignumber.js'

export class Aragon {

  private _aragonApp

  constructor(aragonApp) {
    this._aragonApp = aragonApp
  }

  async getContract() {
    return new Promise((res, rej) => {
      this._aragonApp.accounts()
      .subscribe(accounts => res(new AragonContract(this._aragonApp, accounts)))
    })
  }
}


export class AragonContract {

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
    console.log('Calling convertCallToPromise ', this._ethAccounts[0])
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

  events(...args) {
    return this._aragonApp.events(...args)
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
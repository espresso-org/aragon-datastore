import {BigNumber} from 'bignumber.js'

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

    async addFile(storageRef, name, fileSize, isPublic) {
        return new Promise((res, rej) => {
            this._aragonApp.addFile(storageRef, name, fileSize, isPublic)
                .subscribe(result => res(result))
        })
    }

    async getFile(fileId) {
        return new Promise((res, rej) => {
            this._aragonApp.call('getFile', fileId)
                .subscribe(result => res(result))
        })
    }   
    
    async lastFileId() {
        return new Promise((res, rej) => {
            this._aragonApp.call('lastFileId')
                .subscribe(result => res(new BigNumber(result)))
        })
    }
}
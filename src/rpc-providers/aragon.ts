export class Aragon {

    private _aragonApp

    constructor(aragonApp) { 
        this._aragonApp = aragonApp
    }

    async addFile(storageRef, fileSize, isPublic) {
        return new Promise((res, rej) => {
            this._aragonApp.addFile(storageRef, fileSize, isPublic)
                .subscribe(result => res(result))
        })
    }
}
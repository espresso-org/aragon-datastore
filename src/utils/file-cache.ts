export class FileCache {

    private _files: Promise<any>

    constructor(files = []) {
        this._files = this._initialize(files)
    }

    private async _initialize(files = []) {
        
        this._files = new Promise(res => res(this._generateTree(0, files)))
    }

    private _generateTree(index: number, files: any[]) {

        const folder = { 
            ...files[index],
            fileIds: []
        }
        

        for (const file of files) {
            if (file) {

                if (!file.isFolder && file.parentFolder === index) {
                    folder.fileIds.push(file.id)
                }

                // If file is a folder and not already handled  
                if (file.isFolder && file.id > index) {
                    this._generateTree(file.id, files)
                }
            }
        }

        files[index] = folder

        return files

    }

    public async getFolder(id = 0) {
        const folder = await this.getFile(id)

        if (!folder.isFolder)
            throw `File ${id} not a folder`

        return {
            ...folder,
            files: await Promise.all(folder.fileIds.map(file => this.getFile(file.id)))
        }
    }

    public async getFile(id = 0) {
        return (await this._files)[id]
    }

    public async updateFile(file: any) {
        const files = await this._files
        
        this._files = new Promise(res => {
            
            files[file.id] = {
                ...files[file.id],
                file
            }


            if (file.parentFolder !== undefined) {
                const parentFolder = files[file.parentFolder]

                if (!parentFolder.files.includes(file.id)) 
                    parentFolder.files.push(file.id)
                
            }

            res(files)
        })
    }
}

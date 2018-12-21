export class FileCache {

    private _files: Promise<any>

    constructor(files = []) {
        this._initialize(files)
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

    public async addFile(file: any) {
        this.updateFile(file.id, file)
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

    /**
     * Updates the cache with the new file info
     * If the file is not already in cache, it is added
     * If `file` is nullish, it is removed from the cache
     * 
     * @param fileId
     * @param file 
     */
    public async updateFile(fileId: number, file: any) {
        const files = await this._files
        const isFileDeleted = !file
        
        this._files = new Promise(res => {

            const parentFolderId = isFileDeleted 
                ? files[fileId].parentFolder 
                : file.parentFolder
            
            if (parentFolderId !== undefined) {
                const parentFolder = files[file.parentFolder]

                if (isFileDeleted)
                    parentFolder.fileIds = parentFolder.fileIds.filter(id => id !== fileId)

                else if (!parentFolder.fileIds.includes(fileId)) 
                    parentFolder.fileIds.push(fileId)                
            }

            files[fileId] = {
                ...files[fileId],
                ...(file.isFolder ? { fileIds: [] } : null),
                file
            }            

            res(files)
        })

        return this._files.then(() => null)
    }


}

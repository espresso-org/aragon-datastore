export interface StorageProvider {
    addFile(file: ArrayBuffer): Promise<string>
    getFile(fileId: string): Promise<ArrayBuffer>
}




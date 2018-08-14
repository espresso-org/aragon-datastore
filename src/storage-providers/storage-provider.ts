export interface StorageProvider {

}


export interface IFileProvider {
    
    add(file: ArrayBuffer): Promise<string>,
    get(fileId: string): Promise<Uint8Array>
    
}


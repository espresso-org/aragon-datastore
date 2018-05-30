export interface IStorageProvider {
    files: IFileProvider,
    data: IObjectProvider
}


export interface IFileProvider {
    
    add(file: ArrayBuffer): Promise<string>,
    get(fileId: string): Promise<Uint8Array>
    
}

export interface IObjectProvider {

    

}
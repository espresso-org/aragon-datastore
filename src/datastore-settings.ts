export class DatastoreSettings {
    storageProvider: StorageProvider
    encryptionType: EncryptionType

    ipfs: IpfsSettings
}

export enum StorageProvider { None, Ipfs, Filecoin, Swarm }
export enum EncryptionType { None, Aes }


export class IpfsSettings {
    host: string
    port: number
    protocol: string       
}
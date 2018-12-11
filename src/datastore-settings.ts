export class DatastoreSettings {
    storageProvider: StorageProvider
    encryptionProvider: EncryptionProvider

    ipfs: IpfsSettings
    aes: AesSettings
}

export enum StorageProvider { None, Ipfs, Swarm, Filecoin }
export enum EncryptionProvider { None, Aes }

export class IpfsSettings {
    host: string
    port: number
    protocol: string       
}

export class AesSettings {
    name: string
    length: number
}
export class DatastoreSettings {
    storageProvider: StorageProvider

    ipfs: IpfsSettings
}

export enum StorageProvider { None, Ipfs, Swarm, Filecoin }

export class IpfsSettings {
    host: string
    port: number
    protocol: string       
}
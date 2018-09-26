import { DatastoreSettings, StorageProvider } from '../datastore-settings'
import { Ipfs } from './ipfs'

export { StorageProvider } from './storage-provider'
export { Ipfs } from './ipfs'

export function getStorageProviderFromSettings(settings: DatastoreSettings) {
    switch (settings.storageProvider) {
        case StorageProvider.Ipfs: 
            return new Ipfs({
                host: settings.ipfs.host,
                port: settings.ipfs.port.toString(),
                protocol: settings.ipfs.protocol
            })

        case StorageProvider.Filecoin: 
            throw new Error('Not implemented yet')

        case StorageProvider.Swarm:
            throw new Error('Not implemented yet')

        case StorageProvider.None:
            return undefined
    }
}
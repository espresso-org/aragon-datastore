import { DatastoreSettings, StorageProvider } from './datastore-settings'

export const createFileFromTuple = (tuple: any[]) => ({
    storageRef: tuple[0],
    isDeleted: tuple[1],
    owner: tuple[2],
    isOwner: tuple[3],
    permissionAddresses: tuple[4],
    permissions: {
        write: tuple[5]
    },
    isFolder: tuple[6],
    parentFolder: parseInt(tuple[7])
})

export const createPermissionFromTuple = (tuple: boolean[]) => ({    
    write: tuple[0]
})

export const createSettingsFromTuple = (tuple: any[]): DatastoreSettings => {
    return { 
        storageProvider: convertStringToEnum<StorageProvider>(tuple[0]),
        ipfs: {
            host: tuple[1],
            port: tuple[2].toNumber(),
            protocol: tuple[3]
        }
    }
}

export function convertStringToEnum<T>(s: string): T {
    return (parseInt(s) as any) as T
}
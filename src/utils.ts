import { DatastoreSettings, EncryptionProvider, StorageProvider } from './datastore-settings'

export const createFileFromTuple = (tuple: any[]) => ({
    storageRef: tuple[0],
    isPublic: tuple[1],
    isDeleted: tuple[2],
    owner: tuple[3],
    isOwner: tuple[4],
    permissionAddresses: tuple[5],
    permissions: {
        write: tuple[6],
        read: true // TODO
    },
    isFolder: tuple[9],
    parentFolder: parseInt(tuple[10])
})

export const createPermissionFromTuple = (tuple: boolean[]) => ({    
    write: tuple[0],
    read: tuple[1]    
})

export const createSettingsFromTuple = (tuple: any[]): DatastoreSettings => {
    return { 
        storageProvider: convertStringToEnum<StorageProvider>(tuple[0]),
        encryptionProvider: convertStringToEnum<EncryptionProvider>(tuple[1]),

        ipfs: {
            host: tuple[2],
            port: tuple[3].toNumber(),
            protocol: tuple[4]
        },
        aes: {
            name: tuple[5],
            length: tuple[6]
        }
    }
}

export function convertStringToEnum<T>(s: string): T {
    return (parseInt(s) as any) as T
}
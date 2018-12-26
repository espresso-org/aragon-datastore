import { DatastoreSettings, EncryptionProvider, StorageProvider } from './datastore-settings'

export const createFileFromTuple = (tuple: any[]) => ({
    storageRef: tuple[0],
    name: tuple[1],
    fileSize: tuple[2],
    isPublic: tuple[3],
    isDeleted: tuple[4],
    owner: tuple[5],
    lastModification: tuple[6],
    permissionAddresses: tuple[7],
    permissions: {
        write: tuple[8],
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
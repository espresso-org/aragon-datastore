import { DatastoreSettings, EncryptionProvider, StorageProvider } from './datastore-settings'

export const createFileFromTuple = (tuple: any[]) => ({
    storageRef: tuple[0],
    name: tuple[1],
    fileSize: tuple[2],
    isPublic: tuple[3],
    isDeleted: tuple[4],
    owner: tuple[5],
    isOwner: tuple[6],
    lastModification: tuple[7],
    permissionAddresses: tuple[8],
    permissions: {
        write: tuple[9],
        read: true // TODO
    }
})

export const createPermissionFromTuple = (tuple: boolean[]) => ({    
    write: tuple[0],
    read: tuple[1]    
})

export const createSettingsFromTuple = (tuple: any[]): DatastoreSettings => ({
    storageProvider: convertStringToEnum<StorageProvider>(tuple[0]),
    encryptionProvider: convertStringToEnum<EncryptionProvider>(tuple[1]),

    ipfs: {
        host: tuple[2],
        port: tuple[3].toNumber(),
        protocol: tuple[4]
    },
    aes: {
        name: tuple[5],
        length: tuple[6],
    }
})

export function convertStringToEnum<T>(s: string): T {
    return (parseInt(s) as any) as T
}
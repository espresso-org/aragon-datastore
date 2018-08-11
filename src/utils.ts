import { DatastoreSettings, EncryptionType, StorageProvider } from './datastore-settings'

export function createFileFromTuple(tuple: any[]) {
    return {
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
    }
}

export function createPermissionFromTuple(tuple: boolean[]) {
    return {
        write: tuple[0],
        read: tuple[1]
    }
}


export function createSettingsFromTuple(tuple: any[]): DatastoreSettings {
    return {
        storageProvider: tuple[0],
        encryptionType: tuple[1],

        ipfs: {
            host: tuple[2],
            port: tuple[3],
            protocol: tuple[4]
        }
    }
}
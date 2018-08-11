import { BigNumber } from 'bignumber.js'
import { settings } from 'cluster';


export interface RpcProviderContract {
    
    lastFileId(): Promise<BigNumber>
    addFile(storageRef: string, name: string, fileSize: number, isPublic: boolean): Promise<{}>
    getFile(fileId: number): Promise<any[]>
    deleteFile(fileId: number): Promise<{}>
    setFilename(fileId: number, newName: string): Promise<{}>
    setFileContent(fileId: number, storageRef: string, fileSize: number): Promise<{}>
    getPermissionAddresses(fileId: number): Promise<string[]>
    getPermission(fileId: number, entity: string): Promise<any>
    setWritePermission(fileId: number, entity: string, hasWritePermission: boolean): Promise<{}>
    setReadPermission(fileId: number, entity: string, hasReadPermission: boolean): Promise<{}>
    settings(): Promise<any[]>
    setIpfsStorageSettings(host: string, port: number, protocol: string): Promise<{}>
    events(...args): any
}
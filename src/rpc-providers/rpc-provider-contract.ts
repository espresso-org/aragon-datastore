import { getDiffieHellman } from "crypto";

export interface RpcProviderContract {
    
    lastFileId(): Promise<any>
    addFile(storageRef: string, name: string, fileSize: number, isPublic: boolean): Promise<any>
    getFile(fileId: number): Promise<any>
    deleteFile(fileId: number): Promise<any>
    setFilename(fileId: number, newName: string): Promise<any>
    setFileContent(fileId: number, storageRef: string, fileSize: number): Promise<any>
    getPermissionAddresses(fileId: number): Promise<any>
    getPermission(fileId: number, entity: string): Promise<any>
    setWritePermission(fileId: number, entity: string, hasWritePermission: boolean): Promise<any>
    events(...args): Promise<any>
}
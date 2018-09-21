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
    getPermissionGroups(fileId: number): Promise<{}[]>
    getPermission(fileId: number, entity: string): Promise<any>
    setWritePermission(fileId: number, entity: string, hasWritePermission: boolean): Promise<{}>
    setReadPermission(fileId: number, entity: string, hasReadPermission: boolean): Promise<{}>
    setEntityPermissions(fileId: number, entity: string, read: boolean, write: boolean): Promise<{}>
    settings(): Promise<any[]>
    setIpfsStorageSettings(host: string, port: number, protocol: string): Promise<{}>
    createGroup(groupName: string) : Promise<{}>
    deleteGroup(groupId: number) : Promise<{}>
    renameGroup(groupId: number, newGroupName: string) : Promise<{}>
    getGroups() : Promise<any[]>
    getGroup(groupId: number) : Promise<{}>
    getGroupEntity(groupId: number, entityIndex: number) : Promise<{}>
    getGroupEntityCount(groupId: number) : Promise<{}>
    addEntityToGroup(groupId: number, entity: string) : Promise<{}>
    removeEntityFromGroup(groupId: number, entity: string) : Promise<{}>
    removeEntityFromFile(fileId: number, entity: string): Promise<{}>
    setGroupPermissions(fileId: number, groupId: number, read: boolean, write: boolean) : Promise<{}>
    removeGroupFromFile(fileId: number, groupId: number) : Promise<{}>
    events(...args): any
}
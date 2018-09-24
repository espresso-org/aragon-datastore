import { BigNumber } from 'bignumber.js'
import { settings } from 'cluster';

export interface RpcProviderContract {
    lastFileId(): Promise<BigNumber>
    addFile(storageRef: string, name: string, fileSize: number, isPublic: boolean): Promise<{}>
    getFile(fileId: number): Promise<any[]>
    deleteFile(fileId: number): Promise<{}>
    setFileName(fileId: number, newName: string): Promise<{}>
    setFileContent(fileId: number, storageRef: string, fileSize: number): Promise<{}>
    getEntitiesWithPermissionsOnFile(fileId: number): Promise<string[]>
    getGroupsWithPermissionsOnFile(fileId: number): Promise<any[]>
    getEntityPermissionsOnFile(fileId: number, entity: string): Promise<any>
    getGroupPermissionsOnFile(fileId: number, groupId: number): Promise<any>
    setWritePermission(fileId: number, entity: string, hasWritePermission: boolean): Promise<{}>
    setReadPermission(fileId: number, entity: string, hasReadPermission: boolean): Promise<{}>
    setEntityPermissions(fileId: number, entity: string, read: boolean, write: boolean): Promise<{}>
    setMultiplePermissions(fileId: number, groupIds: number[], groupRead: boolean[], groupWrite: boolean[], entities: string[], entityRead: boolean[], entityWrite: boolean[], isPublic: boolean): Promise<{}>
    settings(): Promise<any[]>
    setIpfsStorageSettings(host: string, port: number, protocol: string): Promise<{}>
    createGroup(groupName: string) : Promise<{}>
    deleteGroup(groupId: number) : Promise<{}>
    renameGroup(groupId: number, newGroupName: string) : Promise<{}>
    getGroupIds() : Promise<any[]>
    getGroup(groupId: number) : Promise<{}>
    getEntityInGroup(groupId: number, entityIndex: number) : Promise<{}>
    getGroupEntityCount(groupId: number) : Promise<{}>
    addEntityToGroup(groupId: number, entity: string) : Promise<{}>
    removeEntityFromGroup(groupId: number, entity: string) : Promise<{}>
    removeEntityFromFile(fileId: number, entity: string): Promise<{}>
    setGroupPermissions(fileId: number, groupId: number, read: boolean, write: boolean) : Promise<{}>
    removeGroupFromFile(fileId: number, groupId: number) : Promise<{}>
    events(...args): any
}
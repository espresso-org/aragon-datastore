import { BigNumber } from 'bignumber.js'


export interface RpcProviderContract {
    lastFileId(): Promise<BigNumber>
    addFile(storageRef: string, isPublic: boolean): Promise<{}>
    getFile(fileId: number): Promise<any[]>
    deleteFile(fileId: number, isDeleted: boolean, deletePermanently: boolean): Promise<{}>
    deleteFilesPermanently(fileIds: number[]): Promise<{}>
    setStorageRef(fileId: number, newStorageRef: string): Promise<{}>
    getFileEncryptionKey(fileId: number): Promise<any>
    getEntitiesWithPermissionsOnFile(fileId: number): Promise<string[]>
    getGroupsWithPermissionsOnFile(fileId: number): Promise<any[]>
    getEntityPermissionsOnFile(fileId: number, entity: string): Promise<any>
    getGroupPermissionsOnFile(fileId: number, groupId: number): Promise<any>
    setWritePermission(fileId: number, entity: string, hasWritePermission: boolean): Promise<{}>
    setReadPermission(fileId: number, entity: string, hasReadPermission: boolean): Promise<{}>
    setEntityPermissions(fileId: number, entity: string, read: boolean, write: boolean): Promise<{}>
    setMultiplePermissions(fileId: number, groupIds: number[], groupRead: boolean[], groupWrite: boolean[], entities: string[], entityRead: boolean[], entityWrite: boolean[], isPublic: boolean, fileDataStorageRef: string): Promise<{}>
    settings(): Promise<any[]>
    setSettings(storageProvider: number, encryptionPrivider: number, host: string, port: number, protocol: string, name: string, length: number): Promise<{}>
    createGroup(groupName: string): Promise<{}>
    deleteGroup(groupId: number): Promise<{}>
    renameGroup(groupId: number, newGroupName: string): Promise<{}>
    getGroupIds(): Promise<any[]>
    getGroup(groupId: number): Promise<any>
    getEntityInGroup(groupId: number, entityIndex: number): Promise<{}>
    getGroupEntityCount(groupId: number): Promise<{}>
    addEntityToGroup(groupId: number, entity: string): Promise<{}>
    removeEntityFromGroup(groupId: number, entity: string): Promise<{}>
    removeEntityFromFile(fileId: number, entity: string): Promise<{}>
    setGroupPermissions(fileId: number, groupId: number, read: boolean, write: boolean): Promise<{}>
    removeGroupFromFile(fileId: number, groupId: number): Promise<{}>
    createLabel(name: string, color: string): Promise<{}>
    deleteLabel(labelId: number): Promise<{}>
    getLabel(labelId: number): Promise<any>
    getLabels(): Promise<any>
    events(...args): any
}
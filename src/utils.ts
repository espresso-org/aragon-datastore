export function createFileFromTuple(tuple: any[]) {
    return {
        storageRef: tuple[0],
        name: tuple[1],
        fileSize: tuple[2],
        keepRef: tuple[3],
        isPublic: tuple[4],
        isDeleted: tuple[5],
        owner: tuple[6],
        lastModification: tuple[7],
        permissionAddresses: tuple[8]
    }
}
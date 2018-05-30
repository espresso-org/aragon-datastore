export function createFileFromTuple(tuple: any[]) {
    return {
        storageRef: tuple[0],
        fileSize: tuple[1],
        keepRef: tuple[2],
        isPublic: tuple[3],
        isDeleted: tuple[4]
    }
}
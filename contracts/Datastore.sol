pragma solidity ^0.4.18;

pragma experimental ABIEncoderV2;

contract Datastore {

    struct File {
        string storageRef;
        string name;
        uint fileSize;
        string keepRef;
        bool isPublic;
        bool isDeleted;
    }

    uint public lastFileId = 0;

    mapping (uint => File) files;

    function addFile(string storageRef, string name, uint fileSize, bool isPublic) external returns (uint fileId) {
        lastFileId++;
        files[lastFileId] = File({ storageRef: storageRef, name: name, fileSize: fileSize, keepRef: "", isPublic: isPublic, isDeleted: false });
        return lastFileId;
    }

    function getFile(uint fileId) 
        external
        view 
        returns (
            string storageRef,
            string name,
            uint fileSize,
            string keepRef,
            bool isPublic,
            bool isDeleted
        ) 
    {
        File storage file = files[fileId];

        storageRef = file.storageRef;
        name = file.name;
        fileSize = file.fileSize;
        keepRef = file.keepRef;
        isPublic = file.isPublic;
        isDeleted = file.isDeleted;
    
    }

    function deleteFile(uint fileId) external {
        files[fileId].isDeleted = true;
    }

}

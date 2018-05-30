pragma solidity ^0.4.18;

pragma experimental ABIEncoderV2;

contract Datastore {

    struct File {
        string storageRef;
        uint fileSize;
        string keepRef;
        bool isPublic;
        bool isDeleted;
    }

    uint storedData;

    uint private lastFileId = 0;

    mapping (uint => File) files;

    function addFile(string storageRef, uint fileSize, bool isPublic) external returns (uint fileId) {
        lastFileId++;
        files[lastFileId] = File({ storageRef: storageRef, fileSize: fileSize, keepRef: "", isPublic: isPublic, isDeleted: false });
        return lastFileId;
    }

    function getFile(uint fileId) 
        external
        view 
        returns (
            string storageRef,
            uint fileSize,
            string keepRef,
            bool isPublic,
            bool isDeleted
        ) 
    {
        File storage file = files[fileId];

        storageRef = file.storageRef;
        fileSize = file.fileSize;
        keepRef = file.keepRef;
        isPublic = file.isPublic;
        isDeleted = file.isDeleted;
    
    }

    function deleteFile(uint fileId) external {

    }

    function set(uint x) public {
        storedData = x;
    } 

    function get() public view returns (uint) {
        return storedData;
    }
}

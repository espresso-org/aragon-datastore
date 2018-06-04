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
        mapping (address => Permission) permissions;
    }

    struct Permission {
        bool write;
        bool read;
    }

    uint public lastFileId = 0;

    mapping (uint => File) private files;
    

    function addFile(string _storageRef, string _name, uint _fileSize, bool _isPublic) external returns (uint fileId) {
        lastFileId++;
        files[lastFileId] = File({ 
            storageRef: _storageRef,
            name: _name,
            fileSize: _fileSize,
            keepRef: "",
            isPublic: _isPublic,
            isDeleted: false 
        });
        return lastFileId;
    }

    function getFile(uint _fileId) 
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
        File storage file = files[_fileId];

        storageRef = file.storageRef;
        name = file.name;
        fileSize = file.fileSize;
        keepRef = file.keepRef;
        isPublic = file.isPublic;
        isDeleted = file.isDeleted;
    
    }

    function deleteFile(uint _fileId) external {
        files[_fileId].isDeleted = true;
    }

    function setWritePermission(uint _fileId, address _entity, bool _hasPermission) external {
        files[_fileId].permissions[_entity].write = _hasPermission;
    }

}

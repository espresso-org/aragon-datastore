pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';
//import { PermissionLibrary } from "./libraries/PermissionLibrary.sol";
//import { GroupLibrary } from "./libraries/GroupLibrary.sol";

library PermissionLibrary {
    using SafeMath for uint256;

    /**
     * Owners of files    
     */
    struct OwnerData {
        mapping (uint => address) fileOwners;
    }

    /**
     * Read and write permission for an entity on a specific file
     */
    struct Permission {
        bool write;             
        bool read;
        bool exists;    // Used internally to check if an entity has a stored permission
    }

    /**
     * Users permissions on files and internal references
     */
    struct PermissionData {
        mapping (uint => mapping (address => Permission)) permissions;      // Read and Write permissions for each entity
        mapping (uint => address[]) permissionAddresses;                    // Internal references for permission listing
        mapping (uint => mapping (uint => Permission)) groupPermissions;    // Read and Write permissions for groups
        mapping (uint => uint[]) groupIds;                                  // Internal references for files groups listing
    }

    // ************* OwnerData ************* //
    /**
     * @notice Returns true if `_entity` is owner of file `_fileId`
     * @param _self OwnerData 
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function isOwner(OwnerData storage _self, uint _fileId, address _entity) internal view returns (bool) {
        return _self.fileOwners[_fileId] == _entity;
    }

    /**
     * @notice Returns the owner of the file with `_fileId`
     * @param _self OwnerData
     * @param _fileId File Id
     */
    function getOwner(OwnerData storage _self, uint _fileId) internal view returns (address) {
        return _self.fileOwners[_fileId];
    }

    /**
     * @notice Adds an `_entity` as owner to file with `_fileId`
     * @param _self OwnerData
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function addOwner(OwnerData storage _self, uint _fileId, address _entity) internal {
        _self.fileOwners[_fileId] = _entity;
    }

    // ************* PermissionData ************* //
    /**
     * @notice Initializes the permissionAddresses array for the file with `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     */
    function initializePermissionAddresses(PermissionData storage _self, uint _fileId) internal {
        _self.permissionAddresses[_fileId] = new address[](0);
    }

    /**
     * @notice Returns entity addresses on which permissions are set for file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @return addresses Array of entity addresses
     */
    function getPermissionAddresses(PermissionData storage _self, uint _fileId) internal view returns(address[]) {
        return _self.permissionAddresses[_fileId];
    }

    /**
     * @notice Get write and read permissions for entity `_entity` on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function getPermission(PermissionData storage _self, uint _fileId, address _entity) internal view returns (bool write, bool read) {
        write = _self.permissions[_fileId][_entity].write;
        read = _self.permissions[_fileId][_entity].read;
    }

    /**
     * @notice Set read permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Read permission
     */
    function setReadPermission(PermissionData storage _self, uint _fileId, address _entity, bool _hasPermission) internal {
        if (!_self.permissions[_fileId][_entity].exists) {
            _self.permissionAddresses[_fileId].push(_entity);
            _self.permissions[_fileId][_entity].exists = true;
        }

        _self.permissions[_fileId][_entity].read = _hasPermission;
    }

    /**
     * @notice Set write permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Write permission
     */
    function setWritePermission(PermissionData storage _self, uint _fileId, address _entity, bool _hasPermission) internal {
        if (!_self.permissions[_fileId][_entity].exists) {
            _self.permissionAddresses[_fileId].push(_entity);
            _self.permissions[_fileId][_entity].exists = true;
        }

        _self.permissions[_fileId][_entity].write = _hasPermission;
    }

    /**
     * @notice Returns true if `_entity` has read access on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasReadAccess(PermissionData storage _self, uint _fileId, address _entity) internal view returns (bool) {
        return _self.permissions[_fileId][_entity].read;
    }

    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(PermissionData storage _self, uint _fileId, address _entity) internal view returns (bool) {
        return _self.permissions[_fileId][_entity].write;
    }

    /**
     * @notice Set the read and write permissions on a file for a specified group
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     * @param _read Read permission
     * @param _write Write permission
     */
    function setGroupPermissions(PermissionData storage _self, uint _fileId, uint _groupId, bool _read, bool _write) internal {
        if (!_self.groupPermissions[_fileId][_groupId].exists) {
            _self.groupIds[_fileId].push(_groupId);
            _self.groupPermissions[_fileId][_groupId].exists = true;
        }
        _self.groupPermissions[_fileId][_groupId].read = _read;
        _self.groupPermissions[_fileId][_groupId].write = _write;
    }

    /**
     * @notice Remove group from file permissions
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     */
    function removeGroupFromFile(PermissionData storage _self, uint _fileId, uint _groupId) internal {
        if(!_self.groupPermissions[_fileId][_groupId].exists) {
            delete _self.groupPermissions[_fileId][_groupId];
            for(uint i = 0; i < _self.groupIds[_fileId].length; i++) {
                if(_self.groupIds[_fileId][i] == _groupId)
                    delete _self.groupIds[_fileId][i];
            }
        }
    }
}

library GroupLibrary {
    using SafeMath for uint256;

    /**
     * Represents a group and its entities within it   
     */
    struct Group {
        string groupName;
        mapping (address => uint) entitiesWithIndex;
        address[] entities;
        bool exists;    // Used internally to check if a group really exists
    }

    /**
     * Groups of entities
     */
    struct GroupData {
        mapping (uint => Group) groups;                 // Read and Write permissions for each entity
        uint[] groupList;                               // Internal references for list of groups
    }

    /**
     * @notice Add a group to the datastore
     * @param _self GroupData
     * @param _groupName Name of the group
     */
    function createGroup(GroupData storage _self, string _groupName) internal {
        uint id = _self.groupList.length + 1;
        _self.groups[id].groupName = _groupName;
        _self.groups[id].exists = true;
        _self.groupList.push(id);
    }

    /**
     * @notice Delete a group from the datastore
     * @param _self GroupData
     * @param _groupId Id of the group to delete
     */
    function deleteGroup(GroupData storage _self, uint _groupId) internal {
        delete _self.groups[_groupId];
        delete _self.groupList[_groupId - 1];
    }

    /**
     * @notice Rename a group
     * @param _self GroupData
     * @param _groupId Id of the group to rename
     * @param _newGroupName New name for the group
     */
    function renameGroup(GroupData storage _self, uint _groupId, string _newGroupName) internal {
        _self.groups[_groupId].groupName = _newGroupName;
    }

    /**
     * @notice Get a list of all the groups Id's
     * @param _self GroupData
     */
    function getGroups(GroupData storage _self) internal view returns(uint[]){
        return _self.groupList;
    }

    /**
     * @notice Get a specific group
     * @param _self GroupData
     * @param _groupId Id of the group to return
     */
    function getGroup(GroupData storage _self, uint _groupId) internal view returns(address[] _entities, string _groupName) {
        _entities = _self.groups[_groupId].entities;
        _groupName = _self.groups[_groupId].groupName;
    }

    /**
     * @notice Get an entity inside a specific group
     * @param _self GroupData
     * @param _groupId Id of the group to retrieve the entity from
     * @param _entityIndex Index of the entity to retrieve from the group
     */
    function getGroupEntity(GroupData storage _self, uint _groupId, uint _entityIndex) internal view returns(address) {
        if(_self.groups[_groupId].entities[_entityIndex] != 0)
            return _self.groups[_groupId].entities[_entityIndex];
    }

    /**
     * @notice Get the number of entities in a group
     * @param _self GroupData
     * @param _groupId Id of the group to get the count from
     */
    function getGroupEntityCount(GroupData storage _self, uint _groupId) internal view returns(uint) {
        uint counter = 0;
        for(uint i = 0; i < _self.groups[_groupId].entities.length; i++) {
            if(_self.groups[_groupId].entities[i] != 0)
                counter++;
        }
        return counter;
    }

    /**
     * @notice Add an entity to a group
     * @param _self GroupData
     * @param _groupId Id of the group to add the entity in
     * @param _entity Address of the entity
     */
    function addEntityToGroup(GroupData storage _self, uint _groupId, address _entity) internal {
        _self.groups[_groupId].entitiesWithIndex[_entity] = _self.groups[_groupId].entities.length + 1;
        _self.groups[_groupId].entities.push(_entity);
    }

    /**
     * @notice Remove an entity from a group
     * @param _self GroupData
     * @param _groupId Id of the group to remove the entity from 
     * @param _entity Address of the entity
     */
    function removeEntityFromGroup(GroupData storage _self, uint _groupId, address _entity) internal {
        uint indexOfEntity = _self.groups[_groupId].entitiesWithIndex[_entity] - 1;
        delete _self.groups[_groupId].entities[indexOfEntity];
        delete _self.groups[_groupId].entitiesWithIndex[_entity];
    }
}

contract Datastore {
    using SafeMath for uint256;
    using PermissionLibrary for PermissionLibrary.OwnerData;
    using PermissionLibrary for PermissionLibrary.PermissionData;
    using GroupLibrary for GroupLibrary.GroupData;

    event FileRename(address indexed entity, uint fileId);
    event FileContentUpdate(address indexed entity, uint fileId);
    event NewFile(address indexed entity, uint fileId);
    event NewWritePermission(address indexed entity, uint fileId);
    event NewReadPermission(address indexed entity, uint fileId);
    event DeleteFile(address indexed entity, uint fileId);
    event SettingsChanged(address indexed entity);
    event GroupChange(address indexed entity);

    /**
     * Datastore settings
     */
    enum StorageProvider { None, Ipfs, Filecoin, Swarm }
    enum EncryptionType { None, Aes }

    struct Settings {
        StorageProvider storageProvider;
        EncryptionType encryption;

        string ipfsHost;
        uint16 ipfsPort;
        string ipfsProtocol;
    }

    /** TODO: Use IpfsSettings inside Settings
     *  when aragon supports nested structs
     */
    struct IpfsSettings {
        string host;
        uint16 port;
        string protocol;        
    }
    
    /**
     * File stored in the 
     */
    struct File {
        string storageRef;      // Storage Id of IPFS (Filecoin, Swarm in the future)
        string name;            // File name
        uint fileSize;          // File size in bytes
        string keepRef;         // Keep Id for encryption key
        bool isPublic;          // True if file can be read by anyone
        bool isDeleted;         // Is file deleted
        uint lastModification;  // Timestamp of the last file content update
    }

    /**
     * Id of the last file added to the datastore. 
     * Also represents the total number of files stored.
     */
    uint public lastFileId = 0;

    mapping (uint => File) private files;
    PermissionLibrary.OwnerData private fileOwners;
    PermissionLibrary.PermissionData private permissions;

    Settings public settings;

    GroupLibrary.GroupData private groups;
    
    /**
     * @notice Add a file to the datastore
     * @param _storageRef Storage Id of the file (IPFS only for now)
     * @param _name File name
     * @param _fileSize File size in bytes
     * @param _isPublic Is file readable by anyone
     */
    function addFile(string _storageRef, string _name, uint _fileSize, bool _isPublic) external returns (uint fileId) {
        lastFileId = lastFileId.add(1);

        files[lastFileId] = File({
            storageRef: _storageRef,
            name: _name,
            fileSize: _fileSize,
            keepRef: "",
            isPublic: _isPublic,
            isDeleted: false,
            lastModification: now
        });
        PermissionLibrary.addOwner(fileOwners, lastFileId, msg.sender);
        PermissionLibrary.initializePermissionAddresses(permissions, lastFileId);
        NewFile(msg.sender, lastFileId);
        return lastFileId;
    }

    /**
     * @notice Returns the file with Id `_fileId`
     * @param _fileId File id
     */
    function getFile(uint _fileId) 
        external
        view 
        returns (
            string storageRef,
            string name,
            uint fileSize,
            bool isPublic,
            bool isDeleted,
            address owner,
            bool isOwner,
            uint lastModification,
            address[] permissionAddresses,
            bool writeAccess
        ) 
    {
        File storage file = files[_fileId];

        storageRef = file.storageRef;
        name = file.name;
        fileSize = file.fileSize;
        isPublic = file.isPublic;
        isDeleted = file.isDeleted;
        owner = PermissionLibrary.getOwner(fileOwners, _fileId);
        isOwner = PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender);
        lastModification = file.lastModification;
        permissionAddresses = PermissionLibrary.getPermissionAddresses(permissions, _fileId);
        writeAccess = hasWriteAccess(_fileId, msg.sender);
    }

    /**
     * @notice Returns the file with Id `_fileId`
     * @param _fileId File id
     * @param _caller Caller address
     */
    function getFileAsCaller(uint _fileId, address _caller) 
        external
        view 
        returns (
            string storageRef,
            string name,
            uint fileSize,
            bool isPublic,
            bool isDeleted,
            address owner,
            bool isOwner,
            uint lastModification,
            address[] permissionAddresses,
            bool writeAccess
        ) 
    {
        File storage file = files[_fileId];

        storageRef = file.storageRef;
        name = file.name;
        fileSize = file.fileSize;
        isPublic = file.isPublic;
        isDeleted = file.isDeleted;
        owner = PermissionLibrary.getOwner(fileOwners, _fileId);
        isOwner = PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender);
        lastModification = file.lastModification;
        permissionAddresses = PermissionLibrary.getPermissionAddresses(permissions, _fileId);
        writeAccess = hasWriteAccess(_fileId, _caller);
    }    

    /**
     * @notice Delete file with Id `_fileId`
     * @param _fileId File Id
     */
    function deleteFile(uint _fileId) public {
        require(PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender));

        files[_fileId].isDeleted = true;
        files[_fileId].lastModification = now;
        DeleteFile(msg.sender, lastFileId);
    }

    /**
     * @notice Changes name of file `_fileId` to `_newName`
     * @param _fileId File Id
     * @param _newName New file name
     */
    function setFilename(uint _fileId, string _newName) external {
        require(hasWriteAccess(_fileId, msg.sender));

        files[_fileId].name = _newName;
        files[_fileId].lastModification = now;
        FileRename(msg.sender, lastFileId);
    }

    /**
     * @notice Change file content of file `_fileId` to content stored at `_storageRef`
     * with size of `_fileSize` bytes
     * @param _fileId File Id
     * @param _storageRef Storage Id (IPFS)
     * @param _fileSize File size in bytes
     */
    function setFileContent(uint _fileId, string _storageRef, uint _fileSize) external {
        require(hasWriteAccess(_fileId, msg.sender));

        files[_fileId].storageRef = _storageRef;
        files[_fileId].fileSize = _fileSize;
        files[_fileId].lastModification = now;
        FileContentUpdate(msg.sender, lastFileId);
    }

    /**
     * @notice Set read permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Read permission
     */
    function setReadPermission(uint _fileId, address _entity, bool _hasPermission) external {
        require(PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender));
        PermissionLibrary.setReadPermission(permissions, _fileId, _entity, _hasPermission);
        NewReadPermission(msg.sender, lastFileId);
    }

    /**
     * @notice Set write permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Write permission
     */
    function setWritePermission(uint _fileId, address _entity, bool _hasPermission) external {
        require(PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender));
        PermissionLibrary.setWritePermission(permissions, _fileId, _entity, _hasPermission);
        NewWritePermission(msg.sender, lastFileId);
    }
    
    /**
     * Sets IPFS as the storage provider for the datastore.
     * Since switching between storage providers is not supported,
     * the method can only be called if storage isn't set or already IPFS
     */
    function setIpfsStorageSettings(string host, uint16 port, string protocol) public {
        require(settings.storageProvider == StorageProvider.None || settings.storageProvider == StorageProvider.Ipfs);

        settings.ipfsHost = host;
        settings.ipfsPort = port;
        settings.ipfsProtocol = protocol;
        /*
        settings.ipfs = IpfsSettings({
            host: host,
            port: port,
            protocol: protocol
        });*/

        settings.storageProvider = StorageProvider.Ipfs;
        SettingsChanged(msg.sender);
    }

    /**
     * @notice Returns true if `_entity` has read access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasReadAccess(uint _fileId, address _entity) public view returns (bool) {
        return PermissionLibrary.hasReadAccess(permissions, _fileId, _entity);
    }

    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(uint _fileId, address _entity) public view returns (bool) {
        return PermissionLibrary.isOwner(fileOwners, _fileId, _entity) || PermissionLibrary.hasWriteAccess(permissions, _fileId, _entity);
    }

    /**
     * @notice Add a group to the datastore
     * @param _groupName Name of the group
     */
    function createGroup(string _groupName) external {
        GroupLibrary.createGroup(groups, _groupName);
        GroupChange(msg.sender);
        // TODO: return groupId 
    }

    /**
     * @notice Delete a group from the datastore
     * @param _groupId Id of the group to delete
     */
    function deleteGroup(uint _groupId) external {
        require(groups.groups[_groupId].exists);
        GroupLibrary.deleteGroup(groups, _groupId);
        GroupChange(msg.sender);
    }

    /**
     * @notice Rename a group
     * @param _groupId Id of the group to rename
     * @param _newGroupName New name for the group
     */
    function renameGroup(uint _groupId, string _newGroupName) external  {
        require(groups.groups[_groupId].exists);
        GroupLibrary.renameGroup(groups, _groupId, _newGroupName);
        GroupChange(msg.sender);
    }

    /**
     * @notice Get a list of all the groups Id's
     */
    function getGroups() external view returns(uint[]){
        return GroupLibrary.getGroups(groups);
    }

    /**
     * @notice Get a specific group
     * @param _groupId Id of the group to return
     */
    function getGroup(uint _groupId) public view returns(address[], string) {
        require(groups.groups[_groupId].exists);
        return GroupLibrary.getGroup(groups, _groupId);
    }

    /**
     * @notice Get an entity inside a specific group
     * @param _groupId Id of the group to retrieve the entity from
     * @param _entityIndex Index of the entity to retrieve from the group
     */
    function getGroupEntity(uint _groupId, uint _entityIndex) public view returns(address) {
        require(groups.groups[_groupId].exists);
        return GroupLibrary.getGroupEntity(groups, _groupId, _entityIndex);
    }

    /**
     * @notice Get the number of entities in a group
     * @param _groupId Id of the group to get the count from
     */
    function getGroupEntityCount(uint _groupId) public view returns(uint) {
        require(groups.groups[_groupId].exists);
        return GroupLibrary.getGroupEntityCount(groups, _groupId);
    }

    /**
     * @notice Add an entity to a group
     * @param _groupId Id of the group to add the entity in
     * @param _entity Address of the entity
     */
    function addEntityToGroup(uint _groupId, address _entity) public {
        require(groups.groups[_groupId].exists);
        GroupLibrary.addEntityToGroup(groups, _groupId, _entity);
        GroupChange(msg.sender);
    }

    /**
     * @notice Remove an entity from a group
     * @param _groupId Id of the group to remove the entity from 
     * @param _entity Address of the entity
     */
    function removeEntityFromGroup(uint _groupId, address _entity) public {
        require(groups.groups[_groupId].exists);
        GroupLibrary.removeEntityFromGroup(groups, _groupId, _entity);
        GroupChange(msg.sender);
    }

    /**
     * @notice Set the read and write permissions on a file for a specified group
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     * @param _read Read permission
     * @param _write Write permission
     */
    function setGroupPermissions(uint _fileId, uint _groupId, bool _read, bool _write) public {
        require(PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender));
        PermissionLibrary.setGroupPermissions(permissions, _fileId, _groupId, _read, _write);
    }

    /**
     * @notice Remove group from file permissions
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     */
    function removeGroupFromFile(uint _fileId, uint _groupId) public {
        require(PermissionLibrary.isOwner(fileOwners, _fileId, msg.sender));
        PermissionLibrary.removeGroupFromFile(permissions, _fileId, _groupId);
    }
}

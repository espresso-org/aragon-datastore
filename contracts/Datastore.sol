pragma solidity ^0.4.18;
pragma experimental ABIEncoderV2;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";

contract Datastore {
    using SafeMath for uint256;

    event FileRename(address indexed entity, uint fileId);
    event FileContentUpdate(address indexed entity, uint fileId);
    event NewFile(address indexed entity, uint fileId);
    event NewWritePermission(address indexed entity, uint fileId);
    event NewReadPermission(address indexed entity, uint fileId);
    event DeleteFile(address indexed entity, uint fileId);
    event SettingsChanged(address indexed entity);

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
        address owner;          // Address of the file owner
        uint lastModification;  // Timestamp of the last file content update
        mapping (address => Permission) permissions;  // Read and Write permissions for each entity
        address[] permissionAddresses;  // Internal references for permission listing
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
     * Represents a group and its entities within it   
     */
    struct Group {
        mapping (address => uint) entitiesWithIndex;
        address[] entities;
        uint groupIndex;
        bool exists;    // Used internally to check if a group really exists
    }

    /**
     * Id of the last file added to the datastore. 
     * Also represents the total number of files stored.
     */
    uint public lastFileId = 0;

    mapping (uint => File) private files;

    Settings public settings;

    string[] private groupList;
    mapping (string => Group) private groups;
    
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
            owner: msg.sender,
            lastModification: now,
            permissionAddresses: new address[](0)
        });
        emit NewFile(msg.sender, lastFileId);
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
        owner = file.owner;
        isOwner = this.isOwner(_fileId, msg.sender);
        lastModification = file.lastModification;
        permissionAddresses = file.permissionAddresses;
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
        owner = file.owner;
        isOwner = this.isOwner(_fileId, _caller);
        lastModification = file.lastModification;
        permissionAddresses = file.permissionAddresses;
        writeAccess = hasWriteAccess(_fileId, _caller);
    }    

    /**
     * @notice Delete file with Id `_fileId`
     * @param _fileId File Id
     */
    function deleteFile(uint _fileId) public {
        require(isOwner(_fileId, msg.sender), "Must be file owner.");

        files[_fileId].isDeleted = true;
        files[_fileId].lastModification = now;
        emit DeleteFile(msg.sender, lastFileId);
    }

    /**
     * @notice Changes name of file `_fileId` to `_newName`
     * @param _fileId File Id
     * @param _newName New file name
     */
    function setFilename(uint _fileId, string _newName) external {
        require(hasWriteAccess(_fileId, msg.sender), "Must have Write access.");

        files[_fileId].name = _newName;
        files[_fileId].lastModification = now;
        emit FileRename(msg.sender, lastFileId);
    }


    /**
     * @notice Change file content of file `_fileId` to content stored at `_storageRef`
     * with size of `_fileSize` bytes
     * @param _fileId File Id
     * @param _storageRef Storage Id (IPFS)
     * @param _fileSize File size in bytes
     */
    function setFileContent(uint _fileId, string _storageRef, uint _fileSize) external {
        require(hasWriteAccess(_fileId, msg.sender), "Must have Write access.");

        files[_fileId].storageRef = _storageRef;
        files[_fileId].fileSize = _fileSize;
        files[_fileId].lastModification = now;
        emit FileContentUpdate(msg.sender, lastFileId);
    }

    /**
     * @notice Returns entity addresses on which permissions are set for file `_fileId`
     * @param _fileId File Id
     * @return addresses Array of entity addresses
     */
    function getPermissionAddresses(uint _fileId) external view returns (address[] addresses) {
        return files[_fileId].permissionAddresses;
    }

    /**
     * @notice Get write and read permissions for entity `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function getPermission(uint _fileId, address _entity) external view returns (bool write, bool read) {
        Permission storage permission = files[_fileId].permissions[_entity];

        write = permission.write;
        read = permission.read;
    }

    /**
     * @notice Set read permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Read permission
     */
    function setReadPermission(uint _fileId, address _entity, bool _hasPermission) external {
        require(isOwner(_fileId, msg.sender), "Must be file owner.");

        if (!files[_fileId].permissions[_entity].exists) {
            files[_fileId].permissionAddresses.push(_entity);
            files[_fileId].permissions[_entity].exists = true;
        }

        files[_fileId].permissions[_entity].read = _hasPermission;
        emit NewReadPermission(msg.sender, lastFileId);
    }

    /**
     * @notice Set write permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Write permission
     */
    function setWritePermission(uint _fileId, address _entity, bool _hasPermission) external {
        require(isOwner(_fileId, msg.sender), "Must be file owner.");

        if (!files[_fileId].permissions[_entity].exists) {
            files[_fileId].permissionAddresses.push(_entity);
            files[_fileId].permissions[_entity].exists = true;
        }

        files[_fileId].permissions[_entity].write = _hasPermission;
        emit NewWritePermission(msg.sender, lastFileId);
    }

    /**
     * Settings related methods
     */
    
    /**
     * Sets IPFS as the storage provider for the datastore.
     * Since switching between storage providers is not supported,
     * the method can only be called if storage isn't set or already IPFS
     */
    function setIpfsStorageSettings(string host, uint16 port, string protocol) public {
        require(settings.storageProvider == StorageProvider.None || settings.storageProvider == StorageProvider.Ipfs, "");

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
        emit SettingsChanged(msg.sender);
    }

    /**
     * @notice Returns true if `_entity` is owner of file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function isOwner(uint _fileId, address _entity) public view returns (bool) {
        return files[_fileId].owner == _entity;
    }

    /**
     * @notice Returns true if `_entity` has read access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasReadAccess(uint _fileId, address _entity) public view returns (bool) {
        return files[_fileId].permissions[_entity].read;
    }

    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(uint _fileId, address _entity) public view returns (bool) {
        return isOwner(_fileId, _entity) || files[_fileId].permissions[_entity].write;
    }

    /**
     * @notice Add a group to the datastore
     * @param _groupName Name of the group (names are unique)
     * @param _entities Entity addresses that are part of the group
     */
    function createGroup(string _groupName) external returns(string) {
        require(groups[_groupName].exists == false, "Group must not exist.");
        //groups[_groupName] = Group();
        groups[_groupName].exists = true;
        //groups[_groupName].entities = []; 
        groups[_groupName].groupIndex = groupList.length;
        return _groupName;
    }

    function deleteGroup(string _groupName) public {
        require(groups[_groupName].exists == true, "Group must exist.");
        delete groupList[groups[_groupName].groupIndex];
        delete groups[_groupName];
    }

    function renameGroup(string _groupName, string _newGroupName) external  {
        require(groups[_groupName].exists == true, "Group must exist.");
        groups[_newGroupName] = groups[_groupName];
        delete groups[_groupName];
    }

    function getGroups() external view returns(string[] _groupList){
        _groupList = groupList;
    }

    function getGroup(string _groupName) public view returns(address[] _groupEntities) {
        require(groups[_groupName].exists == true, "Group must exist.");
        return groups[_groupName].entities;
    }

    function getGroupEntity(string _groupName, uint entityIndex) public view returns(address _entity) {
        require(groups[_groupName].exists == true, "Group must exist.");
        return groups[_groupName].entities[entityIndex];
    }

    function getGroupCount(string _groupName) public view returns(uint groupLenght) {
        require(groups[_groupName].exists == true, "Group must exist.");
        return groups[_groupName].entities.length;
    } 

    function addEntityToGroup(string _groupName, address _entity) public {
        require(groups[_groupName].exists == true, "Group must exist.");
        groups[_groupName].entitiesWithIndex[_entity] = groups[_groupName].entities.length;
        groups[_groupName].entities.push(_entity);
    }

    function removeEntityFromGroup(string _groupName, address _entity) public {
        require(groups[_groupName].exists == true, "Group must exist.");
        Group storage groupToRemoveIn = groups[_groupName];
        delete groupToRemoveIn.entities[groupToRemoveIn.entitiesWithIndex[_entity]];
        delete groupToRemoveIn.entitiesWithIndex[_entity];
    }

    function setGroupPermissions(uint _fileId, string _group, bool _read, bool _write) public {

    }

    function removeGroupFromFile(uint _fileId, string _group) public {

    }
}

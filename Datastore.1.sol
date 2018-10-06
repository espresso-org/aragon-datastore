pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/acl/ACL.sol';
import '@aragon/os/contracts/acl/ACLSyntaxSugar.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';
//import './libraries/StrUtil.sol';


contract Datastore is AragonApp {
    using SafeMath for uint256;
    //using StrUtil for string;

    event FileRename(address indexed entity, uint fileId);
    event FileContentUpdate(address indexed entity, uint fileId);
    event NewFile(address indexed entity, uint fileId);
    event NewWritePermission(address indexed entity, uint fileId);
    event NewReadPermission(address indexed entity, uint fileId);
    event NewEntityPermissions(address indexed entity, uint fileId);
    event NewPermissions(address indexed entity, uint fileId);
    event DeleteFile(address indexed entity, uint fileId);
    event SettingsChanged(address indexed entity);

    bytes32 public constant FILE_READ_ROLE = keccak256("FILE_READ_ROLE");
    bytes32 public constant FILE_WRITE_ROLE = keccak256("FILE_WRITE_ROLE");
    bytes32 public constant FILE_OWNER_ROLE = keccak256("FILE_OWNER_ROLE");
    bytes32 public constant DATASTORE_OWNER_ROLE = keccak256("DATASTORE_OWNER_ROLE");



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
        uint group;
        mapping (uint => Permission) groupPermissions;
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
        string groupName;
        mapping (address => uint) entitiesWithIndex;
        address[] entities;
        bool exists;    // Used internally to check if a group really exists
    }
        

    /**
     * Id of the last file added to the datastore. 
     * Also represents the total number of files stored.
     */
    uint public lastFileId = 0;

    mapping (uint => File) private files;

    Settings public settings;

    ACL private acl;

    uint[] private groupList;
    mapping (uint256 => Group) private groups;

    mapping (uint256 => bytes32) private fileOwnerRoles;


    function initialize() onlyInit external
    {
        initialized();

        acl = ACL(kernel.acl());

        acl.createPermission(this, this, FILE_OWNER_ROLE, this);
        acl.createPermission(this, this, DATASTORE_OWNER_ROLE, this);

        acl.grantPermission(msg.sender, this, DATASTORE_OWNER_ROLE);
    }


    modifier onlyWriteAccess(uint256 _fileId) {
        require(hasWriteAccess(_fileId, msg.sender));
        _;
    }

   
    
    /**
     * @notice Add a file to the datastore
     * @param _storageRef Storage Id of the file (IPFS only for now)
     * @param _name File name
     * @param _fileSize File size in bytes
     * @param _isPublic Is file readable by anyone
     */
    function addFile(string _storageRef, string _name, uint _fileSize, bool _isPublic) 
        external 
        auth(DATASTORE_OWNER_ROLE) 
        returns (uint fileId) 
    {

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
            permissionAddresses: new address[](0),
            group: 0
        });

        fileOwnerRoles[lastFileId] = keccak256(FILE_OWNER_ROLE, lastFileId);
        createPermissionIfNew(fileOwnerRoles[lastFileId]);
        
        acl.grantPermission(msg.sender, this, fileOwnerRoles[lastFileId]);
        
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
        lastModification = file.lastModification;
        permissionAddresses = file.permissionAddresses;
        writeAccess = hasWriteAccess(_fileId, _caller);
    }    

    /**
     * @notice Delete file with Id `_fileId`
     * @param _fileId File Id
     */
    function deleteFile(uint _fileId) public auth(fileOwnerRoles[_fileId]) {
        files[_fileId].isDeleted = true;
        files[_fileId].lastModification = now;
        DeleteFile(msg.sender, lastFileId);
    }

    /**
     * @notice Changes name of file `_fileId` to `_newName`
     * @param _fileId File Id
     * @param _newName New file name
     */
    function setFileName(uint _fileId, string _newName) 
    external 
    onlyWriteAccess(_fileId)
    {
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
    function setFileContent(uint _fileId, string _storageRef, uint _fileSize) 
    external 
    onlyWriteAccess(_fileId)
    {
        files[_fileId].storageRef = _storageRef;
        files[_fileId].fileSize = _fileSize;
        files[_fileId].lastModification = now;
        FileContentUpdate(msg.sender, lastFileId);
    }

    /**
     * @notice Returns entity addresses on which permissions are set for file `_fileId`
     * @param _fileId File Id
     * @return addresses Array of entity addresses
     */
    function getEntitiesWithPermissionsOnFile(uint _fileId) 
        external 
        view 
        returns (address[] addresses) 
    {
        return files[_fileId].permissionAddresses;
    }

    /**
     * @notice Get write and read permissions for entity `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function getEntityPermissionsOnFile(uint _fileId, address _entity) 
        external 
        view 
        returns (bool write, bool read) 
    {
        write = acl.hasPermission(_entity, this, keccak256(FILE_READ_ROLE, _fileId));
        read = acl.hasPermission(_entity, this, keccak256(FILE_WRITE_ROLE, _fileId));
    }

    /**
     * @notice Set read permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Read permission
     */
    function setReadPermission(uint _fileId, address _entity, bool _hasPermission) 
        external 
        auth(fileOwnerRoles[_fileId]) 
    {

        if (!files[_fileId].permissions[_entity].exists) {
            files[_fileId].permissionAddresses.push(_entity);
        }
        createPermissionIfNew(keccak256(FILE_READ_ROLE, _fileId));
        acl.grantPermission(_entity, this, keccak256(FILE_READ_ROLE, _fileId));
        NewReadPermission(msg.sender, _fileId);
    }

    /**
     * @notice Set write permission to `_hasPermission` for `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _hasPermission Write permission
     */
    function setWritePermission(uint _fileId, address _entity, bool _hasPermission) 
        external 
        auth(fileOwnerRoles[_fileId]) 
    {

        if (!files[_fileId].permissions[_entity].exists) {
            files[_fileId].permissionAddresses.push(_entity);
        }
        createPermissionIfNew(keccak256(FILE_WRITE_ROLE, _fileId));
        acl.grantPermission(_entity, this, keccak256(FILE_WRITE_ROLE, _fileId));
        NewWritePermission(msg.sender, _fileId);
    }

    /**
     * @notice Add/Remove permissions to an entity for a specific file
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _read Read permission
     * @param _write Write permission     
     */
    function setEntityPermissions(uint _fileId, address _entity, bool _read, bool _write) 
        external
        auth(fileOwnerRoles[_fileId]) 
    {
        this.setReadPermission(_fileId, _entity, _read);
        this.setWritePermission(_fileId, _entity, _write);
        NewEntityPermissions(msg.sender, lastFileId);
    }  


    /**
     * @notice Add a group to the datastore
     * @param _groupName Name of the group
     */
    function createGroup(string _groupName) 
        external 
        auth(DATASTORE_OWNER_ROLE)
        returns (uint) 
    {

        uint id = groupList.length + 1;
        groups[id].groupName = _groupName;
        groups[id].exists = true;
        groupList.push(id);
        acl.createPermission(this, this, keccak256(_groupName), this);
        return id;
    }


    /**
     * @notice Delete a group from the datastore
     * @param _groupId Id of the group to delete
     */
    function deleteGroup(uint _groupId) 
        external 
        auth(DATASTORE_OWNER_ROLE) 
    {
        require(groups[_groupId].exists);

        delete groups[_groupId];
        delete groupList[_groupId - 1];
    }    

    /**
     * @notice Rename a group
     * @param _groupId Id of the group to rename
     * @param _newGroupName New name for the group
     */
    function renameGroup(uint _groupId, string _newGroupName) 
        external 
        auth(DATASTORE_OWNER_ROLE) 
    {
        require(groups[_groupId].exists);
        groups[_groupId].groupName = _newGroupName;
    }


    /**
     * @notice Returns the group id for a specific file
     * @param _fileId File id
     */
    function getFileGroupId(uint _fileId) public view returns (uint) {
        return files[_fileId].group;
    }    

    /**
     * @notice Returns the group name for a specific file
     * @param _fileId File id
     */
    function getFileGroup(uint _fileId) public returns (string) {
        return groups[files[_fileId].group].groupName;
    }    


    /**
     * @notice Set write permission to `_hasPermission` for `_group` on file `_fileId`
     * @param _fileId File Id
     * @param _groupId Group
     * @param _read Write permission
     */
    function setGroupPermissions(uint _fileId, uint _groupId, bool _read, bool _write) external auth(fileOwnerRoles[_fileId]) {

        if (!files[_fileId].groupPermissions[_groupId].exists) {
            //files[_fileId].groupIds.push(_groupId);
            files[_fileId].group = _groupId;
            files[_fileId].groupPermissions[_groupId].exists = true;
        }
        files[_fileId].groupPermissions[_groupId].read = _read;
        files[_fileId].groupPermissions[_groupId].write = _write;

        NewWritePermission(msg.sender, lastFileId);
    }

    /**
     * @notice Remove group from file permissions
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     */
    function removeGroupFromFile(uint _fileId, uint _groupId) public auth(fileOwnerRoles[_fileId]) {

        if (files[_fileId].groupPermissions[_groupId].exists) {
            delete files[_fileId].groupPermissions[_groupId];
            files[_fileId].group = 0;
            /*
            for(uint i = 0; i < files[_fileId].groupIds.length; i++) {
                if(files[_fileId].groupIds[i] == _groupId)
                    delete files[_fileId].groupIds[i];
            }*/
        }
    }    

    /**
     * @notice Get a list of all the groups Id's
     */
    function getGroups() external view returns(uint[]){
        return groupList;
    }    


    /**
     * @notice Get a specific group
     * @param _groupId Id of the group to return
     */
    function getGroup(uint _groupId) public view returns(address[] _entities, string _groupName) {
        require(groups[_groupId].exists);
        _entities = groups[_groupId].entities;
        _groupName = groups[_groupId].groupName;
    }  


    /**
     * @notice Add an entity to a group
     * @param _groupId Id of the group to add the entity in
     * @param _entity Address of the entity
     */
    function addEntityToGroup(uint _groupId, address _entity) public {
        require(groups[_groupId].exists);
        groups[_groupId].entitiesWithIndex[_entity] = groups[_groupId].entities.length + 1;
        groups[_groupId].entities.push(_entity);
    
    }   

    /**
     * @notice Remove an entity from a group
     * @param _groupId Id of the group to remove the entity from 
     * @param _entity Address of the entity
     */
    function removeEntityFromGroup(uint _groupId, address _entity) public {
        require(groups[_groupId].exists);
        uint indexOfEntity = groups[_groupId].entitiesWithIndex[_entity] - 1;
        delete groups[_groupId].entities[indexOfEntity];
        delete groups[_groupId].entitiesWithIndex[_entity];
    }       


    /**
     * @notice Get an entity inside a specific group
     * @param _groupId Id of the group to retrieve the entity from
     * @param _entityIndex Index of the entity to retrieve from the group
     */
    function getGroupEntity(uint _groupId, uint _entityIndex) public view returns(address) {
        require(groups[_groupId].exists);
        if(groups[_groupId].entities[_entityIndex] != 0)
            return groups[_groupId].entities[_entityIndex];
    }

    /**
     * @notice Get the number of entities in a group
     * @param _groupId Id of the group to get the count from
     */
    function getGroupEntityCount(uint _groupId) public view returns(uint) {
        require(groups[_groupId].exists);
        uint counter = 0;
        for(uint i = 0; i < groups[_groupId].entities.length; i++) {
            if(groups[_groupId].entities[i] != 0)
                counter++;
        }
        return counter;
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
    }


    function addDatastoreOwner(address entity) public auth(DATASTORE_OWNER_ROLE) {
        acl.grantPermission(entity, this, DATASTORE_OWNER_ROLE);
    }

    /**
     * @notice Returns true if `_entity` is owner of file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function isOwner(uint _fileId, address _entity) public view returns (bool) {
        return acl.hasPermission(_entity, this, fileOwnerRoles[_fileId]);
    }


    /**
     * @notice Returns true if `_entity` has read access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasReadAccess(uint _fileId, address _entity) public view returns (bool) {
        if (acl.hasPermission(_entity, this, fileOwnerRoles[_fileId]) ||
            acl.hasPermission(_entity, this, keccak256(FILE_READ_ROLE, _fileId)))
            return true;

        if (files[_fileId].groupPermissions[files[_fileId].group].read
            && hasGroupReadAccess(_fileId, getFileGroupId(_fileId))) {
            return true;
        }
        
        return false;
    }


    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(uint _fileId, address _entity) public view returns (bool) {
        if (acl.hasPermission(_entity, this, fileOwnerRoles[_fileId]) ||
            acl.hasPermission(_entity, this, keccak256(FILE_WRITE_ROLE, _fileId)))
            return true;

        if (files[_fileId].groupPermissions[files[_fileId].group].write
            && hasGroupWriteAccess(_fileId, getFileGroupId(_fileId))) {
            return true;
        }

        return false;            
    }    


  
    function hasGroupWriteAccess(uint _fileId, uint _groupId) public returns (bool) {
        return files[_fileId].groupPermissions[_groupId].write;
    }

    function hasGroupReadAccess(uint _fileId, uint _groupId) public returns (bool) {
        return files[_fileId].groupPermissions[_groupId].read;
    }

    function createPermissionIfNew(bytes32 permission) internal {
        if (acl.getPermissionManager(this, permission) == 0)
            acl.createPermission(this, this, permission, this);
    }    

    function encodeParam(uint8 id, uint8 op, uint240 value) internal pure returns (uint256) {
        return uint256(id) << 31 * 8 
             | uint256(op) << 30 * 8 
             | value;
    }
}

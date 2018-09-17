pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';
//import { PermissionLibrary } from "./PermissionLibrary.sol";

pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';

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
        mapping (uint => mapping(address => Permission)) permissions;   // Read and Write permissions for each entity
        mapping (uint => address[]) permissionAddresses;                // Internal references for permission listing
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
        if (_self.permissions[_fileId][_entity].exists) {
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
        if (_self.permissions[_fileId][_entity].exists) {
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
    function hasReadAccess(PermissionData storage _self, uint _fileId, address _entity) public view returns (bool) {
        return _self.permissions[_fileId][_entity].read;
    }

    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(PermissionData storage _self, uint _fileId, address _entity) public view returns (bool) {
        return _self.permissions[_fileId][_entity].write;
    }
}

contract Datastore {
    using SafeMath for uint256;
    using PermissionLibrary for PermissionLibrary.OwnerData;

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
}

pragma solidity ^0.4.24;

import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/apps/AragonApp.sol";
import "@espresso-org/object-acl/contracts/ObjectACL.sol";
import "./libraries/PermissionLibrary.sol";
import "./libraries/GroupLibrary.sol";
import "./libraries/FileLibrary.sol";


contract Datastore is AragonApp {
    using PermissionLibrary for PermissionLibrary.PermissionData;
    using FileLibrary for FileLibrary.FileList;
    using FileLibrary for FileLibrary.LabelList;
    using GroupLibrary for GroupLibrary.GroupData;

    bytes32 constant public DATASTORE_MANAGER_ROLE = keccak256(abi.encodePacked("DATASTORE_MANAGER_ROLE"));
    bytes32 constant public CREATE_FILE_ROLE = keccak256(abi.encodePacked("CREATE_FILE_ROLE"));
    bytes32 constant public EDIT_FILE_ROLE = keccak256(abi.encodePacked("EDIT_FILE_ROLE"));
    bytes32 constant public DELETE_FILE_ROLE = keccak256(abi.encodePacked("DELETE_FILE_ROLE"));

    
    event NewFile(uint256 fileId);
    event FileChange(uint256 fileId);
    event LabelChange(uint256 labelId);
    event PermissionChange(uint256 fileId);
    event SettingsChange();
    event GroupChange(uint256 groupId);

    /**
     * Datastore settings
     */
    enum StorageProvider { None, Ipfs, Swarm, Filecoin }

    struct Settings {
        StorageProvider storageProvider;
    }

    ACL private acl;
    FileLibrary.FileList private fileList;
    FileLibrary.LabelList private labelList;
    PermissionLibrary.PermissionData private permissions;
    GroupLibrary.GroupData private groups;
    Settings public settings;
    ObjectACL private objectACL;

    modifier fileEditPermission(uint256 _fileId) {
        require(acl.hasPermission(msg.sender, this, EDIT_FILE_ROLE)
            || permissions.isOwner(_fileId, msg.sender), "You must be the file owner.");
        _;
    }     

    modifier fileDeletePermission(uint256 _fileId) {
        require(acl.hasPermission(msg.sender, this, DELETE_FILE_ROLE)
            || permissions.isOwner(_fileId, msg.sender), "You must be the file owner.");
        _;
    }          

    function initialize(ObjectACL _objectACL) onlyInit public {
        initialized();
        acl = ACL(kernel().acl());
        objectACL = _objectACL;
        permissions.initialize(objectACL);
        groups.initialize(objectACL);
        fileList.initializeRootFolder();
    }      
    
    /**
     * @notice Add a file to the datastore
     * @param _storageRef Storage Id of the file 
     * @param _parentFolderId Parent folder id
     */
    function addFile(string _storageRef, uint256 _parentFolderId)
        external 
        returns (uint256 fileId) 
    {
        if (_parentFolderId == 0 && !acl.hasPermission(msg.sender, this, DATASTORE_MANAGER_ROLE)) {
            return addFileToRootFolder(_storageRef);
        }

        require(hasWriteAccess(_parentFolderId, msg.sender));

        uint256 fId = fileList.addFile(_storageRef, _parentFolderId, false);
        
        permissions.addOwner(fId, msg.sender);
        emit FileChange(fId);
        return fId;
    }

    /**
     * @dev Add a file to the datastore root folder
     * @param _storageRef Storage Id of the file 
     */
    function addFileToRootFolder(string _storageRef)
        internal
        auth(CREATE_FILE_ROLE)
        returns (uint256 fileId)
    {

        uint256 fId = fileList.addFile(_storageRef, 0, false);
        
        permissions.addOwner(fId, msg.sender);
        emit FileChange(fId);
        return fId;        
    }

    /**
     * @notice Add a folder to the datastore
     * @param _storageRef Storage Id of the file 
     * @param _parentFolderId Parent folder id
     */
    function addFolder(string _storageRef, uint256 _parentFolderId) 
        external 
        returns (uint256 fileId) 
    {
        if (_parentFolderId == 0 && !acl.hasPermission(msg.sender, this, DATASTORE_MANAGER_ROLE)) {
            return addFolderToRootFolder(_storageRef);
        }

        require(hasWriteAccess(_parentFolderId, msg.sender), "You must have write permission.");

        uint256 fId = fileList.addFile(_storageRef, _parentFolderId, true);
        permissions.addOwner(fId, msg.sender);
        emit FileChange(fId);
        return fId;
    }    

    /**
     * @dev Add a folder to the datastore root folder
     * @param _storageRef Storage Id of the file 
     */
    function addFolderToRootFolder(string _storageRef)
        internal
        auth(CREATE_FILE_ROLE)
        returns (uint256 fileId)
    {
        uint256 fId = fileList.addFile(_storageRef, 0, true);
        permissions.addOwner(fId, msg.sender);
        emit FileChange(fId);
        return fId;     
    }    

    /**
     * @notice Changes the file information
     * @dev Changes the storage reference of file `_fileId` to `_newStorageRef`
     * @param _fileId File Id
     * @param _newStorageRef New storage reference
     */
    function setStorageRef(uint256 _fileId, string _newStorageRef) external {
        require(hasWriteAccess(_fileId, msg.sender));

        fileList.setStorageRef(_fileId, _newStorageRef);
        emit FileChange(_fileId);
    }

    /**
     * @notice Returns the file with Id `_fileId`
     * @param _fileId File id
     * @param _caller Caller address
     */
    function getFileAsCaller(uint256 _fileId, address _caller) 
        external
        view 
        returns (
            string storageRef,
            bool isDeleted,
            address owner,
            bool isOwner,
            address[] permissionAddresses,
            bool writeAccess,
            bool isFolder,
            uint256 parentFolderId
        )
    {
        FileLibrary.File storage file = fileList.files[_fileId];

        storageRef = file.storageRef;
        isDeleted = file.isDeleted;
        owner = permissions.getOwner(_fileId);
        isOwner = permissions.isOwner(_fileId, _caller);
        permissionAddresses = permissions.permissionAddresses[_fileId];
        writeAccess = hasWriteAccess(_fileId, _caller);
        isFolder = file.isFolder;
        parentFolderId = file.parentFolderId;
    }

    /**
     * @notice Set file `_fileId` as `_isDeleted ? "deleted" : "undeleted"`
     * @param _fileId File Id
     * @param _isDeleted Is file deleted or not
     * @param _deletePermanently If true, will delete file permanently
     */
    function deleteFile(uint256 _fileId, bool _isDeleted, bool _deletePermanently) 
        public 
        fileDeletePermission(_fileId) 
    {
        if (_isDeleted && _deletePermanently) {
            fileList.permanentlyDeleteFile(_fileId);
            emit FileChange(_fileId);            
        }
        else {
            fileList.setIsDeleted(_fileId, _isDeleted);
            emit FileChange(_fileId);
        }
    }

    /**
     * @notice Delete files in `_fileIds`. Files cannot be restored
     * @param _fileIds File Ids
     */
    function deleteFilesPermanently(uint256[] _fileIds) public {
        for (uint256 i = 0; i < _fileIds.length; i++) {
            fileList.permanentlyDeleteFile(_fileIds[i]);
            emit FileChange(i);
        }
    }      

    /**
     * @notice Returns the last file Id
     */
    function lastFileId() external view returns (uint256) {
        return fileList.files.length - 1;
    }

    /**
     * @notice Returns entity addresses on which permissions are set for file `_fileId`
     * @param _fileId File Id
     * @return addresses Array of entity addresses
     */
    function getEntitiesWithPermissionsOnFile(uint256 _fileId) 
        external 
        view 
        returns (address[]) 
    {
        return permissions.permissionAddresses[_fileId];
    }

    /**
     * @notice Returns group ids on which permissions are set for file `_fileId`
     * @param _fileId File Id
     * @return Array of group ids
     */
    function getGroupsWithPermissionsOnFile(uint256 _fileId) 
        external 
        view 
        returns (uint256[]) 
    {
        return permissions.groupIds[_fileId];
    }

    /**
     * @notice Get write permissions for entity `_entity` on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function getEntityPermissionsOnFile(uint256 _fileId, address _entity) 
        external 
        view 
        returns (bool)
    {
        return permissions.hasWriteAccess(_fileId, _entity);
    } 

    /**
     * @notice Get write permissions for group `_groupId` on file `_fileId`
     * @param _fileId File Id
     * @param _groupId Group Id
     */
    function getGroupPermissionsOnFile(uint256 _fileId, uint256 _groupId) 
        external 
        view 
        returns (bool write) 
    {
        PermissionLibrary.Permission storage permission = permissions.groupPermissions[_fileId][_groupId];
        write = permission.write;
    } 

    /**
     * @notice `_write ? "Add" : "Remove"` write permission
     * @param _fileId File Id
     * @param _entity Entity address
     * @param _write Write permission     
     */
    function setWritePermission(uint256 _fileId, address _entity, bool _write) 
        external 
        fileEditPermission(_fileId) 
    {        
        permissions.setEntityPermissions(_fileId, _entity, _write);
        emit PermissionChange(_fileId);
    }

    /**
     * @notice Remove entity from file permissions
     * @param _fileId Id of the file
     * @param _entity Entity address
     */
    function removeEntityFromFile(uint256 _fileId, address _entity) 
        external 
        fileDeletePermission(_fileId) 
    {
        permissions.removeEntityFromFile(_fileId, _entity);
        emit PermissionChange(_fileId);       
    }
    
    /**
     * @notice Sets the storage provider for the datastore
     * @param _storageProvider Storage provider
     */
    function setSettings(
        StorageProvider _storageProvider
    ) public auth(DATASTORE_MANAGER_ROLE) {
        require(settings.storageProvider == StorageProvider.None, "Settings already set");

        settings.storageProvider = _storageProvider;

        emit SettingsChange();
    }
    

    /**
     * @notice Returns true if `_entity` has write access on file `_fileId`
     * @param _fileId File Id
     * @param _entity Entity address     
     */
    function hasWriteAccess(uint256 _fileId, address _entity) public view returns (bool) {
        if (acl.hasPermission(_entity, this, EDIT_FILE_ROLE)
            || permissions.hasWriteAccess(_fileId, _entity)
            || hasGroupWriteAccess(_fileId, _entity))
            return true;

        // Lookup parent folders up to 8 levels for write access
        uint256 folderLevel = 0;
        uint256 currentFileId = _fileId;

        while (folderLevel < 8 && currentFileId != 0) {
            FileLibrary.File file = fileList.files[currentFileId];

            if (permissions.hasWriteAccess(file.parentFolderId, _entity)
                || hasGroupWriteAccess(file.parentFolderId, _entity))
                return true;
            
            currentFileId = file.parentFolderId;
            folderLevel++;
        }

        return false;

    }

    function hasGroupWriteAccess(uint256 _fileId, address _entity) internal view returns (bool) {
        for (uint256 i = 0; i < groups.groupList.length; i++) {
            if (groups.groups[groups.groupList[i]].exists) {
                if (permissions.groupPermissions[_fileId][groups.groupList[i]].exists) {
                    if (permissions.groupPermissions[_fileId][groups.groupList[i]].write) {
                        if (groups.isEntityInGroup(groups.groupList[i], _entity)) {
                            return true;
                        }
                    }
                }
            }
        }        
    }

    /**
     * @dev Returns whether an entity has the CREATE_FILE_ROLE 
     * @param _entity Entity address
     */
    function hasCreateFileRole(address _entity) external view returns (bool) {
        return acl.hasPermission(_entity, this, CREATE_FILE_ROLE);
    }    

    /**
     * @dev Returns whether an entity has the DELETE_FILE_ROLE
     * @param _entity Entity address
     */
    function hasDeleteRole(address _entity) 
        external
        view 
        returns (bool)
    {
        return acl.hasPermission(_entity, this, DELETE_FILE_ROLE);
    }    

    /**
     * @notice Add a group to the datastore
     * @param _groupName Name of the group
     */
    function createGroup(string _groupName) external auth(DATASTORE_MANAGER_ROLE) {
        uint256 groupId = groups.createGroup(_groupName);
        emit GroupChange(groupId);
    }

    /**
     * @notice Delete a group from the datastore
     * @param _groupId Id of the group to delete
     */
    function deleteGroup(uint256 _groupId) external auth(DATASTORE_MANAGER_ROLE) {
        require(groups.groups[_groupId].exists);
        groups.deleteGroup(_groupId);
        emit GroupChange(_groupId);
    }

    /**
     * @notice Rename a group
     * @param _groupId Id of the group to rename
     * @param _newGroupName New name for the group
     */
    function renameGroup(uint256 _groupId, string _newGroupName) external auth(DATASTORE_MANAGER_ROLE) {
        require(groups.groups[_groupId].exists);
        groups.renameGroup(_groupId, _newGroupName);
        emit GroupChange(_groupId);
    }

    /**
     * @notice Get a specific group
     * @param _groupId Id of the group to return
     */
    function getGroup(uint256 _groupId) public view returns (address[], string) {
        require(groups.groups[_groupId].exists);
        return groups.getGroup(_groupId);
    }

    /**
     * @notice Get a list of all the groups Id's
     */
    function getGroupIds() public view returns (uint[]) {
        return groups.groupList;
    }

    /**
     * @notice Add an entity to a group
     * @param _groupId Id of the group to add the entity in
     * @param _entity Address of the entity
     */
    function addEntityToGroup(uint256 _groupId, address _entity) 
        auth(DATASTORE_MANAGER_ROLE)
        external 
    {
        require(groups.groups[_groupId].exists);
        groups.addEntityToGroup(_groupId, _entity);
        emit GroupChange(_groupId);
    }

    /**
     * @notice Remove an entity from a group
     * @param _groupId Id of the group to remove the entity from 
     * @param _entity Address of the entity
     */
    function removeEntityFromGroup(uint256 _groupId, address _entity) 
        auth(DATASTORE_MANAGER_ROLE)
        external 
    {
        require(groups.groups[_groupId].exists);
        groups.removeEntityFromGroup(_groupId, _entity);
        emit GroupChange(_groupId);
    }

    /**
     * @notice Set the write permission on a file for a specified group
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     * @param _write Write permission
     */
    function setGroupPermissions(uint256 _fileId, uint256 _groupId, bool _write) 
        external 
        fileEditPermission(_fileId) 
    {
        permissions.setGroupPermissions(_fileId, _groupId, _write);
        emit PermissionChange(_fileId);
    }

    /**
     * @notice Remove group from file permissions
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     */
    function removeGroupFromFile(uint256 _fileId, uint256 _groupId) external fileEditPermission(_fileId) {
        permissions.removeGroupFromFile(_fileId, _groupId);
        emit PermissionChange(_fileId);
    }

    /**
     * @notice Add a label to the datastore
     * @param _name Name of the label
     * @param _color Color of the label
     */
    function createLabel(bytes28 _name, bytes4 _color) external auth(DATASTORE_MANAGER_ROLE) {
        labelList.createLabel(_name, _color);
        emit LabelChange(labelList.lastLabelId);
    }

    /**
     * @notice Delete a label from the datastore
     * @param _labelId Id of the label
     */
    function deleteLabel(uint _labelId) external auth(DATASTORE_MANAGER_ROLE) {
        labelList.deleteLabel(_labelId);
        emit LabelChange(_labelId);
    }

    /**
     * @notice Returns the label with Id `_labelId`
     * @param _labelId Label id
     */
    function getLabel(uint _labelId) external view returns (bytes28 name, bytes4 color) {
        FileLibrary.Label storage label = labelList.labels[_labelId];
        name = label.name;
        color = label.color;
    }

    /**
     * @notice Returns every label Ids    
     */
    function getLabels() external view returns (uint[]) {
        return labelList.labelIds;
    }

}

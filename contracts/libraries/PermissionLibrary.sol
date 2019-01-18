pragma solidity ^0.4.24;

import "@espresso-org/object-acl/contracts/ObjectACL.sol";

library PermissionLibrary {
    bytes32 constant public FILE_WRITE_ROLE = keccak256("FILE_WRITE_ROLE");

    /**
     * Write permission for an entity on a specific file
     */
    struct Permission {
        bool write;             
        bool exists;    // Used internally to check if an entity has a stored permission
    }

    /**
     * Users permissions on files and internal references
     */
    struct PermissionData {
        mapping (uint => mapping (address => Permission)) entityPermissions;      // Write permissions for each entity
        mapping (uint => address[]) permissionAddresses;                          // Internal references for permission listing
        mapping (uint => mapping (uint => Permission)) groupPermissions;          // Write permissions for groups
        mapping (uint => uint[]) groupIds;                                        // Internal references for files groups listing

        ObjectACL acl;      
    }

    function initialize(PermissionData storage _self, ObjectACL _acl) internal {
        _self.acl = _acl;
    }

    /**
     * @notice Returns true if `_entity` is owner of file `_fileId`
     * @param _self PermissionData 
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function isOwner(PermissionData storage _self, uint _fileId, address _entity) internal view returns (bool) {
        return _self.acl.getObjectPermissionManager(_fileId, FILE_WRITE_ROLE) == _entity;
    }

    /**
     * @notice Adds an `_entity` as owner to file with `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function addOwner(PermissionData storage _self, uint _fileId, address _entity) internal {
        _self.acl.createObjectPermission(_entity, _fileId, FILE_WRITE_ROLE, _entity);
    }

    /**
     * @notice Returns the owner for the file `_fileId`
     * @param _self PermissionData
     * @param _fileId File Id
     */
    function getOwner(PermissionData storage _self, uint _fileId) internal view returns (address) {
        return _self.acl.getObjectPermissionManager(_fileId, FILE_WRITE_ROLE);
    }

    function hasWriteAccess(PermissionData storage _self, uint256 _fileId, address _entity)
        internal 
        view 
        returns (bool) 
    {
        return _self.acl.hasObjectPermission(_entity, _fileId, FILE_WRITE_ROLE);
    }

    /**
     * @notice Set the write permissions on a file for a specified entity
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _entity Id of the group
     * @param _write Write permission
     */
    function setEntityPermissions(PermissionData storage _self, uint _fileId, address _entity, bool _write) internal { 
        if (!_self.entityPermissions[_fileId][_entity].exists) {
            _self.permissionAddresses[_fileId].push(_entity);
            _self.entityPermissions[_fileId][_entity].exists = true;
            _self.acl.createObjectPermission(_entity, _fileId, FILE_WRITE_ROLE, msg.sender);
        }

        if (_write) 
            _self.acl.grantObjectPermission(_entity, _fileId, FILE_WRITE_ROLE, msg.sender);
        else
            _self.acl.revokeObjectPermission(_entity, _fileId, FILE_WRITE_ROLE, msg.sender);
    }   

    /**
     * @notice Set the write permissions on a file for a specified group
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     * @param _write Write permission
     */
    function setGroupPermissions(PermissionData storage _self, uint _fileId, uint _groupId, bool _write) internal {
        if (!_self.groupPermissions[_fileId][_groupId].exists) {
            _self.groupIds[_fileId].push(_groupId);
            _self.groupPermissions[_fileId][_groupId].exists = true;
        }
        _self.groupPermissions[_fileId][_groupId].write = _write;
    }

    /**
     * @notice Remove entity from file permissions
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _entity Entity address
     */
    function removeEntityFromFile(PermissionData storage _self, uint _fileId, address _entity) internal {
        if (_self.entityPermissions[_fileId][_entity].exists) {
            delete _self.entityPermissions[_fileId][_entity];
            for (uint i = 0; i < _self.permissionAddresses[_fileId].length; i++) {
                if (_self.permissionAddresses[_fileId][i] == _entity)
                    delete _self.permissionAddresses[_fileId][i];
            }
            _self.acl.revokeObjectPermission(_entity, _fileId, FILE_WRITE_ROLE, msg.sender);
        }
    }

    /**
     * @notice Remove group from file permissions
     * @param _self PermissionData
     * @param _fileId Id of the file
     * @param _groupId Id of the group
     */
    function removeGroupFromFile(PermissionData storage _self, uint _fileId, uint _groupId) internal {
        if (_self.groupPermissions[_fileId][_groupId].exists) {
            delete _self.groupPermissions[_fileId][_groupId];
            for (uint i = 0; i < _self.groupIds[_fileId].length; i++) {
                if (_self.groupIds[_fileId][i] == _groupId)
                    delete _self.groupIds[_fileId][i];
            }
        }
    }
}
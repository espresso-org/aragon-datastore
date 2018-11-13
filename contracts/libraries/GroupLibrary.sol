pragma solidity ^0.4.24;

import "@espresso-org/object-acl/contracts/ObjectACL.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";

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
        mapping (uint => Group) groups;     // Read and Write permissions for each entity
        uint[] groupList;                   // Internal references for list of groups
        ObjectACL acl;
        bytes32 DATASTORE_GROUP;
    }

    function initialize(GroupData storage _self, ObjectACL _acl, bytes32 _DATASTORE_GROUP) internal {
        _self.DATASTORE_GROUP = _DATASTORE_GROUP;
        _self.acl = _acl;
    }

    /**
     * @notice Add a group to the datastore
     * @param _self GroupData
     * @param _groupName Name of the group
     */
    function createGroup(GroupData storage _self, string _groupName) internal returns (uint) {
        uint id = _self.groupList.length.add(1);
        _self.groups[id].groupName = _groupName;
        _self.groups[id].exists = true;
        _self.groupList.push(id);
        _self.acl.createObjectPermission(this, id, _self.DATASTORE_GROUP, this);
        return id;
    }

    /**
     * @notice Delete a group from the datastore
     * @param _self GroupData
     * @param _groupId Id of the group to delete
     */
    function deleteGroup(GroupData storage _self, uint _groupId) internal {
        delete _self.groups[_groupId];
        delete _self.groupList[_groupId.sub(1)];
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
     * @notice Get a specific group
     * @param _self GroupData
     * @param _groupId Id of the group to return
     */
    function getGroup(GroupData storage _self, uint _groupId) internal view returns (address[] _entities, string _groupName) {
        _entities = _self.groups[_groupId].entities;
        _groupName = _self.groups[_groupId].groupName;
    }

    /**
     * @notice Returns if an entity is part of a group
     * @param _self GroupData
     * @param _groupId Id of the group
     * @param _entity Address of the entity
     */
    function isEntityInGroup(GroupData storage _self, uint _groupId, address _entity) internal view returns (bool) {
        return _self.acl.hasObjectPermission(_entity, _groupId, _self.DATASTORE_GROUP);
    }

    /**
     * @notice Add an entity to a group
     * @param _self GroupData
     * @param _groupId Id of the group to add the entity in
     * @param _entity Address of the entity
     */
    function addEntityToGroup(GroupData storage _self, uint _groupId, address _entity) internal {
        _self.groups[_groupId].entitiesWithIndex[_entity] = _self.groups[_groupId].entities.length.add(1);
        _self.groups[_groupId].entities.push(_entity);
        _self.acl.createObjectPermission(_entity, _groupId, _self.DATASTORE_GROUP, this);
        _self.acl.grantObjectPermission(_entity, _groupId, _self.DATASTORE_GROUP, this);
    }

    /**
     * @notice Remove an entity from a group
     * @param _self GroupData
     * @param _groupId Id of the group to remove the entity from 
     * @param _entity Address of the entity
     */
    function removeEntityFromGroup(GroupData storage _self, uint _groupId, address _entity) internal {
        uint indexOfEntity = _self.groups[_groupId].entitiesWithIndex[_entity];
        if (indexOfEntity > 0) {
            indexOfEntity = indexOfEntity.sub(1);
            delete _self.groups[_groupId].entities[indexOfEntity];
            delete _self.groups[_groupId].entitiesWithIndex[_entity];
            _self.acl.revokeObjectPermission(_entity, _groupId, _self.DATASTORE_GROUP, this);
        }
    }
}
pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';

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
pragma solidity ^0.4.24;

import '@aragon/os/contracts/apps/AragonApp.sol';


contract DatastoreACL is AragonApp {

    address private datastore;
    mapping (bytes32 => mapping (bytes32 => bytes32)) internal objectPermissions;  // object => permissions hash => params hash
    mapping (bytes32 => address) internal objectPermissionManager;


    modifier auth(bytes32 _role) {
        require(canPerformP(msg.sender, _role, new uint256[](0)));
        _;
    }


    /**
    * @dev Initialize can only be called once. It saves the block number in which it was initialized.
    * @notice Initialize an ACL instance and set `_permissionsCreator` as the entity that can create other permissions
    * @param _permissionsCreator Entity that will be given permission over createPermission
    * @param _acl Kernel ACL
    */
    function initialize(address _permissionsCreator) public onlyInit {
        initialized();

        datastore = _permissionsCreator;
        _createPermission(_permissionsCreator, this, CREATE_PERMISSIONS_ROLE, _permissionsCreator);
    }


    /**
    * @dev Check whether an action can be performed by a sender for a particular role 
    * @param _sender Sender of the call
    * @param _role Role on this app
    * @param _params Permission params for the role
    * @return Boolean indicating whether the sender has the permissions to perform the action.
    *         Always returns false if the app hasn't been initialized yet.
    */    
    function canPerformP(address _sender, bytes32 _role, uint256[] _params) public view returns (bool) {
        if (!hasInitialized()) {
            return false;
        }

        bytes memory how; // no need to init memory as it is never used
        if (_params.length > 0) {
            uint256 byteLength = _params.length * 32;
            assembly {
                how := _params // forced casting
                mstore(how, byteLength)
            }
        }
        return hasPermission(_sender, address(this), _role, how);
    }  

    /**
    * @dev Creates a `_role` permission with a uint object on the Datastore
    * @param _obj Object
    * @param _role Identifier for the group of actions in app given access to perform
    */
    function createObjectPermission(uint256 _obj, bytes32 _role)
        external
        auth(CREATE_PERMISSIONS_ROLE)
        noPermissionManager(datastore, _role)
    {
        _createObjectPermission(datastore, keccak256(_obj), _role, datastore);
    }  

    /**
    * @dev Function called to verify permission for role `_role` and uint object `_obj` status on `_entity`
    * @param _entity Address of the entity
    * @param _obj Object
    * @param _role Identifier for the group of actions in app given access to perform
    * @return boolean indicating whether the ACL allows the role or not
    */
    function hasObjectPermission(address _entity, uint256 _obj, bytes32 _role) public view returns (bool)
    {
        return hasPermission(_entity, datastore, keccak256(_role, _obj), new uint256[](0));
    }   

    /**
    * @dev Grants permission for role `_role` on object `_obj`, if allowed. 
    * @param _entity Address of the whitelisted entity that will be able to perform the role
    * @param _obj Object
    * @param _role Identifier for the group of actions in app given access to perform
    */
    function grantObjectPermission(address _entity, uint256 _obj, bytes32 _role)
        external
    {
        if (getPermissionManager(datastore, keccak256(_role, _obj)) == 0)
            _createPermission(_entity, datastore, keccak256(_role, _obj), datastore);

        _setPermission(_entity, datastore, keccak256(_role, _obj), EMPTY_PARAM_HASH);
    }

    /**
    * @dev Revokes permission for role `_role` on object `_obj`, if allowed. 
    * @param _entity Address of the whitelisted entity to revoke access from
    * @param _obj Object
    * @param _role Identifier for the group of actions in app being revoked
    */
    function revokeObjectPermission(address _entity, uint256 _obj, bytes32 _role)
        external
    {
        if (getPermissionManager(datastore, keccak256(_role, _obj)) == msg.sender)
            _setPermission(_entity, datastore, keccak256(_role, _obj), NO_PERMISSION);
    }





    /**
    * @dev Internal createPermission for access inside the kernel (on instantiation)
    */
    function _createObjectPermission(address _entity, bytes32 _obj, bytes32 _role, address _manager) internal {
        _setObjectPermission(_entity, _obj, _role, EMPTY_PARAM_HASH);
        _setObjectPermissionManager(_manager, _obj, _role);
    }


    /**
    * @dev Internal function called to actually save the permission
    */
    function _setObjectPermission(address _entity, bytes32 _obj, bytes32 _role, bytes32 _paramsHash) internal {
        objectPermissions[_obj][permissionHash(_entity, _role)] = _paramsHash;
        bool entityHasPermission = _paramsHash != NO_PERMISSION;
        bool permissionHasParams = entityHasPermission && _paramsHash != EMPTY_PARAM_HASH;

        // TODO emit new events
        //emit SetPermission(_entity, _app, _role, entityHasPermission);
        if (permissionHasParams) {
        //    emit SetPermissionParams(_entity, _app, _role, _paramsHash);
        }
    }   

    function _setObjectPermissionManager(address _newManager, bytes32 _obj, bytes32 _role) internal {
        objectPermissionManager[objectRoleHash(_obj, _role)] = _newManager;
        //emit ChangePermissionManager(_app, _role, _newManager);
    }

    function permissionHash(address _who, bytes32 _what) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("OBJECT_PERMISSION", _who, _what));
    } 

    function objectRoleHash(bytes32 _obj, bytes32 _what) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("OBJECT_ROLE", _obj, _what));
    }        

    /**
    * @dev Prevents the Autopetrify of the contract
    */
    function petrify() internal {}    


}

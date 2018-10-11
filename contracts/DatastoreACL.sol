pragma solidity ^0.4.24;

import '@aragon/os/contracts/acl/ACL.sol';
import '@aragon/os/contracts/acl/ACLSyntaxSugar.sol';


contract DatastoreACL is ACL {

    address private datastore;
    ACL private acl;
    mapping (bytes32 => mapping (uint256 => bytes32)) internal objectPermissions; 


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
    function initialize(address _permissionsCreator, address _acl) public onlyInit {
        initialized();

        datastore = _permissionsCreator;
        acl = ACL(_acl);
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
    * @param _role Identifier for the group of actions in app given access to perform
    * @param _obj Object
    */
    function createObjectPermission(uint256 _obj, bytes32 _role)
        external
        auth(CREATE_PERMISSIONS_ROLE)
        noPermissionManager(datastore, _role)
    {
        _createObjectPermission(datastore, datastore, keccak256(_obj), _role, datastore);
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
    * @dev Creates a permission in the kernel ACL
    * @notice Create a new permission granting `_entity` the ability to perform actions requiring `_role` on `_app`, setting `_manager` as the permission's manager
    * @param _entity Address of the whitelisted entity that will be able to perform the role
    * @param _app Address of the app in which the role will be allowed (requires app to depend on kernel for ACL)
    * @param _role Identifier for the group of actions in app given access to perform
    * @param _manager Address of the entity that will be able to grant and revoke the permission further.
    */
    function aclCreatePermission(address _entity, address _app, bytes32 _role, address _manager)
        external
    {
        acl.createPermission(_entity, _app, _role, _manager);
    } 


    /**
    * @dev Grants permission on the kernel ACL, if allowed. 
    * @notice Grant `_entity` the ability to perform actions requiring `_role` on `_app`
    * @param _entity Address of the whitelisted entity that will be able to perform the role
    * @param _app Address of the app in which the role will be allowed (requires app to depend on kernel for ACL)
    * @param _role Identifier for the group of actions in app given access to perform
    */
    function aclGrantPermission(address _entity, address _app, bytes32 _role)
        external
    {
        acl.grantPermission(_entity, _app, _role);
    }

    /**
    * @dev Function to check ACL permission on kernel
    * @param _who Sender of the original call
    * @param _where Address of the app
    * @param _where Identifier for a group of actions in app
    * @param _how Permission parameters
    * @return boolean indicating whether the ACL allows the role or not
    */
    function aclHasPermission(address _who, address _where, bytes32 _what, bytes memory _how) public view returns (bool)
    {
        return acl.hasPermission(_who, _where, _what, _how);
    }



    /**
    * @dev Internal createPermission for access inside the kernel (on instantiation)
    */
    function _createObjectPermission(address _entity, address _app, bytes32 _obj, bytes32 _role, address _manager) internal {
        _setObjectPermission(_entity, _app, _obj, _role, EMPTY_PARAM_HASH);
        _setPObjectermissionManager(_manager, _app, _role);
    }


    /**
    * @dev Internal function called to actually save the permission
    */
    function _setObjectPermission(address _entity, address _app, bytes32 _obj, bytes32 _role, bytes32 _paramsHash) internal {
        permissions[permissionHash(_entity, _app, _role)] = _paramsHash;
        bool entityHasPermission = _paramsHash != NO_PERMISSION;
        bool permissionHasParams = entityHasPermission && _paramsHash != EMPTY_PARAM_HASH;

        emit SetPermission(_entity, _app, _role, entityHasPermission);
        if (permissionHasParams) {
            emit SetPermissionParams(_entity, _app, _role, _paramsHash);
        }
    }    

    /**
    * @dev Prevents the Autopetrify of the contract
    */
    function petrify() internal {}    


}

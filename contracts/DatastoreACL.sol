pragma solidity ^0.4.24;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/acl/ACL.sol';
import '@aragon/os/contracts/acl/ACLSyntaxSugar.sol';



contract DatastoreACL is AragonApp, ACLHelpers {

    bytes32 public constant DATASTOREACL_ADMIN_ROLE = keccak256("DATASTOREACL_ADMIN_ROLE");

    mapping (bytes32 => mapping (bytes32 => bytes32)) internal objectPermissions;  // object => permissions hash => params hash
    mapping (bytes32 => address) internal objectPermissionManager;



    modifier onlyPermissionManager(address _sender, bytes32 _obj, bytes32 _role) {
        require(getObjectPermissionManager(_obj, _role) == _sender, "Must be the object permission manager");
        _;
    }


    /**
    * @dev Initialize can only be called once. It saves the block number in which it was initialized.
    */
    function initialize() public onlyInit {
        initialized();
    } 

    /**
    * @dev Creates a `_role` permission with a uint object on the Datastore
    * @param _obj Object
    * @param _role Identifier for the group of actions in app given access to perform
    */
    function createObjectPermission(uint256 _obj, bytes32 _role)
        external
       // auth(ACL.CREATE_PERMISSIONS_ROLE)
       // noPermissionManager(datastore, _role)
    {
        _createObjectPermission(datastore, keccak256(_obj), _role, datastore);
    }  

    /**
    * @dev Function called to verify permission for role `_what` and uint object `_obj` status on `_who`
    * @param _who Address of the entity
    * @param _obj Object
    * @param _what Identifier for the group of actions in app given access to perform
    * @return boolean indicating whether the ACL allows the role or not
    */
    function hasObjectPermission(address _who, bytes32 _obj, bytes32 _what) public view returns (bool)
    {
        bytes32 whoParams = objectPermissions[_obj][permissionHash(_who, _what)];
        if (whoParams != ACL.NO_PERMISSION && ACL.evalParams(whoParams, _who, datastore, _what, new uint256[](0))) {
            return true;
        }

        return false;
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
        if (getObjectPermissionManager(datastore, _obj, _role) == 0)
            _createObjectPermission(_entity, _obj, _role, datastore);

        _setObjectPermission(_entity, datastore, keccak256(_role, _obj), ACL.EMPTY_PARAM_HASH);
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
        if (getObjectPermissionManager(datastore, _obj, _role) == msg.sender)
            _setObjectPermission(_entity, _obj, _role, ACL.NO_PERMISSION);
    }



    
    /**
    * @dev Get manager for permission
    * @param _obj Object
    * @param _role Identifier for a group of actions in app
    * @return address of the manager for the permission
    */
    function getObjectPermissionManager(bytes32 _obj, bytes32 _role) public view returns (address) {
        return objectPermissionManager[objectRoleHash(_obj, _role)];
    }

    /**
    * @dev Internal createPermission for access inside the kernel (on instantiation)
    */
    function _createObjectPermission(address _entity, bytes32 _obj, bytes32 _role, address _manager) internal {
        _setObjectPermission(_entity, _obj, _role, ACL.EMPTY_PARAM_HASH);
        _setObjectPermissionManager(_manager, _obj, _role);
    }


    /**
    * @dev Internal function called to actually save the permission
    */
    function _setObjectPermission(address _entity, bytes32 _obj, bytes32 _role, bytes32 _paramsHash) internal {
        objectPermissions[_obj][permissionHash(_entity, _role)] = _paramsHash;
        bool entityHasPermission = _paramsHash != ACL.NO_PERMISSION;
        bool permissionHasParams = entityHasPermission && _paramsHash != ACL.EMPTY_PARAM_HASH;

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

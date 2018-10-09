pragma solidity ^0.4.24;

import '@aragon/os/contracts/acl/ACL.sol';
import '@aragon/os/contracts/acl/ACLSyntaxSugar.sol';


contract DatastoreACL is ACL {

    address private datastore;
    ACL private acl;

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
    * @dev Creates a `_role` permission with a uint argument on the Datastore
    * @param _role Identifier for the group of actions in app given access to perform
    * @param _arg Role argument
    */
    function createPermissionWithArg(uint256 _arg, bytes32 _role)
        external
        auth(CREATE_PERMISSIONS_ROLE)
        noPermissionManager(datastore, _role)
    {
        _createPermission(datastore, datastore, keccak256(_role, _arg), datastore);
    }  

    function hasPermissionWithArg(address _entity, uint256 _arg, bytes32 _role) public view returns (bool)
    {
        return hasPermission(_entity, datastore, keccak256(_role, _arg), new uint256[](0));
    }   

    function grantPermissionWithArg(address _entity, uint256 _arg, bytes32 _role)
        external
    {
        if (getPermissionManager(datastore, keccak256(_role, _arg)) == 0)
            _createPermission(_entity, datastore, keccak256(_role, _arg), datastore);

        _setPermission(_entity, datastore, keccak256(_role, _arg), EMPTY_PARAM_HASH);
    }

    function revokePermissionWithArg(address _entity, uint256 _arg, bytes32 _role)
        external
    {
        if (getPermissionManager(datastore, keccak256(_role, _arg)) == msg.sender)
            _setPermission(_entity, datastore, keccak256(_role, _arg), NO_PERMISSION);
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
    * @dev Prevents the Autopetrify of the contract
    */
    function petrify() internal {}    


}

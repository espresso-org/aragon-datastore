pragma solidity ^0.4.24;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/acl/ACL.sol';
import '@aragon/os/contracts/acl/ACLSyntaxSugar.sol';



contract DatastoreACL is AragonApp, ACLHelpers {

    bytes32 public constant DATASTOREACL_ADMIN_ROLE = keccak256("DATASTOREACL_ADMIN_ROLE");


    enum Op { NONE, EQ, NEQ, GT, LT, GTE, LTE, RET, NOT, AND, OR, XOR, IF_ELSE } // op types

    struct Param {
        uint8 id;
        uint8 op;
        uint240 value; // even though value is an uint240 it can store addresses
        // in the case of 32 byte hashes losing 2 bytes precision isn't a huge deal
        // op and id take less than 1 byte each so it can be kept in 1 sstore
    }     

    uint8 internal constant BLOCK_NUMBER_PARAM_ID = 200;
    uint8 internal constant TIMESTAMP_PARAM_ID    = 201;
    // 202 is unused
    uint8 internal constant ORACLE_PARAM_ID       = 203;
    uint8 internal constant LOGIC_OP_PARAM_ID     = 204;
    uint8 internal constant PARAM_VALUE_PARAM_ID  = 205;
    // TODO: Add execution times param type?

    // Hardcoded constant to save gas
    //bytes32 public constant EMPTY_PARAM_HASH = keccak256(uint256(0));
    bytes32 public constant EMPTY_PARAM_HASH = 0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563;
    bytes32 public constant NO_PERMISSION = bytes32(0);
    address public constant ANY_ENTITY = address(-1);
    address public constant BURN_ENTITY = address(1); // address(0) is already used as "no permission manager"

    uint256 internal constant ORACLE_CHECK_GAS = 30000;     
    

    address private datastore;
    mapping (bytes32 => mapping (bytes32 => bytes32)) internal objectPermissions;  // object => permissions hash => params hash
    mapping (bytes32 => Param[]) internal permissionParams; // params hash => params
    mapping (bytes32 => address) internal objectPermissionManager;


    modifier onlyPermissionManager(address _sender, bytes32 _obj, bytes32 _role) {
        require(getObjectPermissionManager(_obj, _role) == _sender, "Must be an object permission manager");
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
        auth(DATASTOREACL_ADMIN_ROLE)
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
    function hasObjectPermission(address _who, uint256 _obj, bytes32 _what) public view returns (bool)
    {
        return hasObjectPermission(_who, keccak256(_obj), _what);
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
        if (whoParams != NO_PERMISSION && evalParams(whoParams, _obj, _who, _what, new uint256[](0))) {
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
        return grantObjectPermission(_entity, keccak256(_obj), _role);
    }

    /**
    * @dev Grants permission for role `_role` on object `_obj`, if allowed. 
    * @param _entity Address of the whitelisted entity that will be able to perform the role
    * @param _obj Object
    * @param _role Identifier for the group of actions in app given access to perform
    */
    function grantObjectPermission(address _entity, bytes32 _obj, bytes32 _role)
        public
        auth(DATASTOREACL_ADMIN_ROLE)
    {
        if (getObjectPermissionManager(_obj, _role) == 0)
            _createObjectPermission(_entity, _obj, _role, datastore);

        _setObjectPermission(_entity, _obj, _role, EMPTY_PARAM_HASH);
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
        revokeObjectPermission(_entity, keccak256(_obj), _role);
    }    

    /**
    * @dev Revokes permission for role `_role` on object `_obj`, if allowed. 
    * @param _entity Address of the whitelisted entity to revoke access from
    * @param _obj Object
    * @param _role Identifier for the group of actions in app being revoked
    */
    function revokeObjectPermission(address _entity, bytes32 _obj, bytes32 _role)
        public
        auth(DATASTOREACL_ADMIN_ROLE)
    {
        _setObjectPermission(_entity, _obj, _role, NO_PERMISSION);
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


    function evalParams(
        bytes32 _paramsHash,
        bytes32 _obj,
        address _who,
        bytes32 _what,
        uint256[] _how
    ) public view returns (bool)
    {
        if (_paramsHash == EMPTY_PARAM_HASH) {
            return true;
        }

        return _evalParam(_paramsHash, 0, _obj, _who, _what, _how);
    }

    function _evalParam(
        bytes32 _paramsHash,
        uint32 _paramId,
        bytes32 _obj,
        address _who,
        bytes32 _what,
        uint256[] _how
    ) internal view returns (bool)
    {
        if (_paramId >= permissionParams[_paramsHash].length) {
            return false; // out of bounds
        }

        Param memory param = permissionParams[_paramsHash][_paramId];

        if (param.id == LOGIC_OP_PARAM_ID) {
            return _evalLogic(param, _paramsHash, _obj, _who, _what, _how);
        }

        uint256 value;
        uint256 comparedTo = uint256(param.value);

        // get value
        if (param.id == ORACLE_PARAM_ID) {
            value = checkOracle(IACLOracle(param.value), _obj, _who, _what, _how) ? 1 : 0;
            comparedTo = 1;
        } else if (param.id == BLOCK_NUMBER_PARAM_ID) {
            value = getBlockNumber();
        } else if (param.id == TIMESTAMP_PARAM_ID) {
            value = getTimestamp();
        } else if (param.id == PARAM_VALUE_PARAM_ID) {
            value = uint256(param.value);
        } else {
            if (param.id >= _how.length) {
                return false;
            }
            value = uint256(uint240(_how[param.id])); // force lost precision
        }

        if (Op(param.op) == Op.RET) {
            return uint256(value) > 0;
        }

        return compare(value, Op(param.op), comparedTo);
    }

    function _evalLogic(Param _param, bytes32 _paramsHash, bytes32 _obj, address _who, bytes32 _what, uint256[] _how)
        internal
        view
        returns (bool)
    {
        if (Op(_param.op) == Op.IF_ELSE) {
            uint32 conditionParam;
            uint32 successParam;
            uint32 failureParam;

            (conditionParam, successParam, failureParam) = decodeParamsList(uint256(_param.value));
            bool result = _evalParam(_paramsHash, conditionParam, _obj, _who, _what, _how);

            return _evalParam(_paramsHash, result ? successParam : failureParam, _obj, _who, _what, _how);
        }

        uint32 param1;
        uint32 param2;

        (param1, param2,) = decodeParamsList(uint256(_param.value));
        bool r1 = _evalParam(_paramsHash, param1, _obj, _who, _what, _how);

        if (Op(_param.op) == Op.NOT) {
            return !r1;
        }

        if (r1 && Op(_param.op) == Op.OR) {
            return true;
        }

        if (!r1 && Op(_param.op) == Op.AND) {
            return false;
        }

        bool r2 = _evalParam(_paramsHash, param2, _obj, _who, _what, _how);

        if (Op(_param.op) == Op.XOR) {
            return r1 != r2;
        }

        return r2; // both or and and depend on result of r2 after checks
    }

    function compare(uint256 _a, Op _op, uint256 _b) internal pure returns (bool) {
        if (_op == Op.EQ)  return _a == _b;                              // solium-disable-line lbrace
        if (_op == Op.NEQ) return _a != _b;                              // solium-disable-line lbrace
        if (_op == Op.GT)  return _a > _b;                               // solium-disable-line lbrace
        if (_op == Op.LT)  return _a < _b;                               // solium-disable-line lbrace
        if (_op == Op.GTE) return _a >= _b;                              // solium-disable-line lbrace
        if (_op == Op.LTE) return _a <= _b;                              // solium-disable-line lbrace
        return false;
    }

    function checkOracle(IACLOracle _oracleAddr, bytes32 _obj, address _who, bytes32 _what, uint256[] _how) internal view returns (bool) {
        bytes4 sig = _oracleAddr.canPerform.selector;

        // a raw call is required so we can return false if the call reverts, rather than reverting
        bytes memory checkCalldata = abi.encodeWithSelector(sig, _obj, _who, _what, _how);
        uint256 oracleCheckGas = ORACLE_CHECK_GAS;

        bool ok;
        assembly {
            ok := staticcall(oracleCheckGas, _oracleAddr, add(checkCalldata, 0x20), mload(checkCalldata), 0, 0)
        }

        if (!ok) {
            return false;
        }

        uint256 size;
        assembly { size := returndatasize }
        if (size != 32) {
            return false;
        }

        bool result;
        assembly {
            let ptr := mload(0x40)       // get next free memory ptr
            returndatacopy(ptr, 0, size) // copy return from above `staticcall`
            result := mload(ptr)         // read data at ptr and set it to result
            mstore(ptr, 0)               // set pointer memory to 0 so it still is the next free ptr
        }

        return result;
    }    


    function permissionHash(address _who, bytes32 _what) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("OBJECT_PERMISSION", _who, _what));
    } 

    function objectRoleHash(bytes32 _obj, bytes32 _what) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("OBJECT_ROLE", _obj, _what));
    }        


}

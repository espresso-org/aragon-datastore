pragma solidity 0.4.24;

import "@aragon/os/contracts/factory/EVMScriptRegistryFactory.sol";
import "@aragon/os/contracts/factory/DAOFactory.sol";
import "@aragon/os/contracts/acl/ACL.sol";
import "@aragon/os/contracts/apm/APMNamehash.sol";


contract TestDatastore is APMNamehash {
    function apmNamehash(string name) external pure returns (bytes32) {
        return super.apmNamehash(name);
    }
}
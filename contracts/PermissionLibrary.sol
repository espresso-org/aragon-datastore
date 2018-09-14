pragma solidity ^0.4.18;

import '@aragon/os/contracts/apps/AragonApp.sol';
import '@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol';

library PermissionLibrary {
    using SafeMath for uint256;

    struct Owner {
        mapping (uint => address) fileOwners;
    }

    /**
     * @notice Returns true if `_entity` is owner of file `_fileId`
     * @param _self Owner mapping
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function isOwner(Owner storage _self, uint _fileId, address _entity) internal view returns (bool) {
        return _self.fileOwners[_fileId] == _entity;
    }

    /**
     * @notice Returns the owner of the file with `_fileId`
     * @param _self Owner mapping
     * @param _fileId File Id
     */
    function getOwner(Owner storage _self, uint _fileId) internal view returns (address) {
        return _self.fileOwners[_fileId];
    }

    /**
     * @notice Adds a `_entiy` as owner to file with `_fileId`
     * @param _self Owner mapping
     * @param _fileId File Id
     * @param _entity Entity address
     */
    function addOwner(Owner storage _self, uint _fileId, address _entity) internal {
        _self.fileOwners[_fileId] = _entity;
    }
}
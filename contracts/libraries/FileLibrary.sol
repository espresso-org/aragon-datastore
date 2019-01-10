pragma solidity ^0.4.24;

import "@aragon/os/contracts/lib/math/SafeMath.sol";

library FileLibrary {
    using SafeMath for uint256;

    /**
     * Label for files
     */
    struct Label {
        bytes28 name;       // Label name
        bytes4 color;       // Label color
    }

    struct LabelList {
        /**
         * Id of the last label added to the datastore. 
         * Also represents the total number of labels stored.
         */
        uint lastLabelId;
        mapping (uint => FileLibrary.Label) labels;
        uint[] labelIds;                                    // Internal references for list of labels
    }

    /**
     * File stored in the Datastore
     * Order optimized for storage
     */
    struct File {
        string storageRef;      // File data storage reference 
        bool isDeleted;         // True if file is deleted
        bool isFolder;          // Folders are simply files with isFolder set to true
        uint256 parentFolderId; // Parent folder reference        
    }

    struct FileList {
        FileLibrary.File[] files;
    }

    function addFile(
        FileList storage _self, 
        string _storageRef, 
        uint256 _parentFolderId,
        bool _isFolder
    ) 
        internal 
        returns (uint fileId) 
    {
        _self.files.push(FileLibrary.File({
            storageRef: _storageRef,
            isDeleted: false,
            isFolder: _isFolder,
            parentFolderId: _parentFolderId
        }));
        return _self.files.length - 1;
    }

    function setStorageRef(FileList storage _self, uint _fileId, string _newStorageRef) internal {
        _self.files[_fileId].storageRef = _newStorageRef;
    }

    function setIsDeleted(FileList storage _self, uint _fileId, bool _isDeleted) internal {
        _self.files[_fileId].isDeleted = _isDeleted;
    }    

    function permanentlyDeleteFile(FileList storage _self, uint _fileId) internal {
        delete _self.files[_fileId];
    }

    function createLabel(LabelList storage _self, bytes28 _name, bytes4 _color) internal {
        _self.lastLabelId = _self.lastLabelId.add(1);

        _self.labelIds.push(_self.lastLabelId);
        _self.labels[_self.lastLabelId] = FileLibrary.Label({
            name: _name,
            color: _color
        });
    }

    function deleteLabel(LabelList storage _self, uint _labelId) internal {
        delete _self.labelIds[_labelId.sub(1)];
        delete _self.labels[_labelId];
    }
 
    function initializeRootFolder(FileList storage _self) internal {
        _self.files.push(File({
            storageRef: "",
            isDeleted: false,
            isFolder: true,
            parentFolderId: 0
        }));        
    }      
}
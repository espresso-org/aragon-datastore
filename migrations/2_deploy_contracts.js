var Datastore = artifacts.require("./Datastore.sol");
var PermissionLibrary = artifacts.require("./PermissionLibrary.sol");
var GroupLibrary = artifacts.require("./GroupLibrary.sol");
var FileLibrary = artifacts.require("./FileLibrary.sol");

module.exports = function(deployer) {
  deployer.deploy(PermissionLibrary)
  deployer.deploy(GroupLibrary)
  deployer.deploy(FileLibrary)
  deployer.link(PermissionLibrary, Datastore)
  deployer.link(GroupLibrary, Datastore)
  deployer.link(FileLibrary, Datastore)
  deployer.deploy(Datastore)
};

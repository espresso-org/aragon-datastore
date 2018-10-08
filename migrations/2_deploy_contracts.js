var Datastore = artifacts.require("./Datastore.sol");
var PermissionLibrary = artifacts.require("./PermissionLibrary.sol");
var GroupLibrary = artifacts.require("./GroupLibrary.sol");

module.exports = function(deployer) {
  deployer.deploy(PermissionLibrary)
  deployer.deploy(GroupLibrary)
  deployer.link(PermissionLibrary, Datastore)
  deployer.link(GroupLibrary, Datastore)
  deployer.deploy(Datastore)
};

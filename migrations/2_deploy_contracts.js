var Datastore = artifacts.require("./Datastore.sol");
var PermissionLibrary = artifacts.require("./PermissionLibrary.sol");

module.exports = function(deployer) {
  deployer.deploy(PermissionLibrary)
  deployer.link(PermissionLibrary, Datastore)
  deployer.deploy(Datastore)
};

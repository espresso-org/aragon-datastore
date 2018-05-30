var Datastore = artifacts.require("./Datastore.sol");

module.exports = function(deployer) {
  deployer.deploy(Datastore)
};

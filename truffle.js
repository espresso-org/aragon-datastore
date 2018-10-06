module.exports = {
  "networks": {
    rpc: {
      host: "localhost",
      port: 8545,
      network_id: 2, 
      gas: 0xfffffffffff, 
      gasPrice: 0x01       
    },  
    development: {
      host: "localhost",
      port: 8545,
      network_id: "16",
      gas: 0xfffffffffff, 
      gasPrice: 0x01       
    },
    coverage: {
      host: "localhost",
      network_id: "4",
      port: 8555,         // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    }
  }
};

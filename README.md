# AragonOS Datastore

The Datastore lets DApps easily store files and manage their permissions decentrally. It consists of two modules: 

1. A javascript library to store files in a distributed file system, IPFS as of right now. It will also handle the encryption/decryption process.
2. A solidity smart contract that keeps the information of those files and manages permissions.

## Javascript library

To be as extensible as possible, the Datastore is built around a system of multiple providers. To use the Javascript library, first import the necessary objects: 


```javascript
import { Datastore, providers } from 'aragon-datastore'
```

And you can then create an instance like this:

```javascript
const datastore = new Datastore({
    storageProvider: new providers.storage.Ipfs(),
    encryptionProvider: new providers.encryption.Aes(),
    rpcProvider: new providers.rpc.Aragon(aragonApp)
})
```

The code above would create a Datastore instance using [IPFS](https://ipfs.io) as storage and [aragon.js](https://github.com/aragon/aragon.js) to execute the smart contract methods and receive events. To use Filecoin instead of IPFS, simply select the corresponding storage provider. In case the DApp is not using Aragon, a Web3 provider is also availabe: 

```javascript
    rpcProvider: new providers.rpc.Web3(...)
```

## Solidity smart contract

To use or extend the smart contract features, import the `Datastore.sol` file:

```javascript
import "aragon-datastore/contracts/Datastore.sol";
```

## IPFS

Right now, the Datastore only supports IPFS. The provider will try to connect to `localhost` by default on port `5001`. Make sure an IPFS daemon is running:

```
ipfs daemon
```





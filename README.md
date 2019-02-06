# AragonOS Datastore

[![Build Status](https://travis-ci.org/espresso-org/aragon-datastore.svg?branch=master)](https://travis-ci.org/espresso-org/aragon-datastore) 
[![Coverage Status](https://coveralls.io/repos/github/espresso-org/aragon-datastore/badge.svg?branch=master)](https://coveralls.io/github/espresso-org/aragon-datastore?branch=master)

The Datastore lets DApps easily store files and manage their permissions decentrally. It consists of two modules: 

1. A javascript library to store files in a distributed file system, IPFS and Swarm as of right now. It will also handle the encryption/decryption process.
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

The code above would create a Datastore instance using [IPFS](https://ipfs.io) as storage and [aragon.js](https://github.com/aragon/aragon.js) to execute the smart contract methods and receive events. To use Swarm or Filecoin instead of IPFS, simply select the corresponding storage provider. In case the DApp is not using Aragon, a Web3 provider is also available: 

```javascript
rpcProvider: new providers.rpc.Web3(...)
```

Here's how you can upload a file:

```javascript
// Adding a file to the datastore.
// fileContent is an ArrayBuffer.
// parentFolderId is an integer. If not specified, it's 0 by default (Home folder)
await datastore.addFile('filename.pdf', fileContent, parentFolderId)
```

Then, to give a write permission on this file:

```javascript
// Give the write permission to entity 0xb4124cEB3451635DAcedd11767f004d8a28c6eE7 on file 3.
await datastore.setWritePermission(3, '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7', true)
```

This is just a short example, there is a ton more of functionnality in this library. If you wish to see the complete documentation, you can check it out in the [documentation folder](doc) of this project.

## Solidity smart contract

To use or extend the smart contract features, import the `Datastore.sol` file:

```javascript
import "aragon-datastore/contracts/Datastore.sol";
```

## IPFS

If you're using IPFS as the storage provider, it will try to connect to `localhost` by default on port `5001`. Make sure an IPFS daemon is running:

```
ipfs daemon
```

## Swarm

Swarm can be used as the storage provider. Since it's in beta for now, files are uploaded to the public [Swarm Gateway](https://swarm-gateways.net/). It's important to keep in mind that any files uploaded there can potentially be lost forever so please use experimentally and with caution.

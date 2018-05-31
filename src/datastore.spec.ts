import * as Web3 from 'web3'
import { Datastore, providers } from './'

const WEB3_HOST = 'http://127.0.0.1:8545'

describe('Datastore', async () => {

  xit('lists files', async () => {      

    const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_HOST))

    const datastore = new Datastore({
      encryptionProvider: new providers.encryption.Aes(),
      rpcProvider: new providers.rpc.Web3(web3),
      storageProvider: new providers.storage.Ipfs()
    })

    const files = await datastore.listFiles()
    

  })

  xit('adds file', async () => {      

    const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_HOST)) 

    const datastore = new Datastore({
      encryptionProvider: new providers.encryption.Aes(),
      rpcProvider: new providers.rpc.Web3(web3),
      storageProvider: new providers.storage.Ipfs()
    })

    const fileId = await datastore.addFile(new ArrayBuffer(40))
    
  })
})
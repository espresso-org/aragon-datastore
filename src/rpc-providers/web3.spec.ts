import * as Web3 from 'web3'
import { Web3 as Web3Provider  } from './web3'

const WEB3_HOST = 'http://127.0.0.1:8545'

describe('Datastore web3 provider', async () => {
    xit('Should return a contract', async () => {

      const web3 = new Web3(new Web3.providers.HttpProvider(WEB3_HOST))

      const provider = new Web3Provider(web3)

      const contract = await provider.getContract()

      expect(contract).not.toBeNull()
      //console.log(contract)
    })
  })
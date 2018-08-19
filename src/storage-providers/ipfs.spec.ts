import { Ipfs } from './ipfs' 
import * as ipfsAPI from 'ipfs-api' 

const IpfsConfig = {
    host: 'localhost', 
    port: '5001', 
    protocol: 'http'
}

describe('IPFS Provider', async () => {
    const _ipfs = new ipfsAPI(IpfsConfig)

    describe('files', async () => {

        describe('addFile', async () => {
            it('pins file', async () => {

                let ipfs = new Ipfs(IpfsConfig)
                let result = await ipfs.addFile(new ArrayBuffer(40))

                let pinnedHash = (await _ipfs.pin.ls()).find(pin => pin.hash === result)
                
                expect(pinnedHash.hash).toEqual(result)

            }, 30000)
        })

        describe('getFile', async () => {
            it('returns the exact same file', async () => {

                const fileContent = new ArrayBuffer(40)
                let ipfs = new Ipfs(IpfsConfig)
                let storageRef = await ipfs.addFile(fileContent)
                let file = await ipfs.getFile(storageRef)

                expect(file).toEqual(fileContent)

            }) 
        })       

    })
 
})
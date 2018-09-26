import * as ipfsAPI from 'ipfs-api' 
import { Ipfs } from './ipfs' 

/**
 * The tests in this file needs an IPFS server to run.
 * // TODO: Start a temporary IPFS server automatically to run the tests
 */

const IpfsConfig = {
    host: 'localhost', 
    port: '5001', 
    protocol: 'http'
}

describe('IPFS Provider', async () => {
    const _ipfs = new ipfsAPI(IpfsConfig)

    describe('files', async () => {

        describe('addFile', async () => {
            xit('pins file', async () => {

                const ipfs = new Ipfs(IpfsConfig)
                const result = await ipfs.addFile(new ArrayBuffer(40))

                const pinnedHash = (await _ipfs.pin.ls()).find((pin) => pin.hash === result)
                
                expect(pinnedHash.hash).toEqual(result)

            }, 30000)
        })

        describe('getFile', async () => {
            xit('returns the exact same file', async () => {

                const fileContent = new ArrayBuffer(40)
                const ipfs = new Ipfs(IpfsConfig)
                const storageRef = await ipfs.addFile(fileContent)
                const file = await ipfs.getFile(storageRef)

                expect(file).toEqual(fileContent)
            }) 
        })       
    })
})
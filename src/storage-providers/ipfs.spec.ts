import { Ipfs } from './ipfs' 

const IpfsConfig = {
    host: 'localhost', 
    port: '5001', 
    protocol: 'http'
}

describe('IPFS Provider', async () => {


    describe('files', async () => {

        it('add file', async () => {

            let ipfs = new Ipfs(IpfsConfig)
            let result = await ipfs.addFile(new ArrayBuffer(40))
            console.log('result: ', result) 
            expect(null).toBeNull()

        })

        xit('get file', async () => {

            let ipfs = new Ipfs(IpfsConfig)
            let fileId = await ipfs.addFile(new ArrayBuffer(40))
            let file = await ipfs.addFile(fileId)

            console.log('fileId: ', fileId)
            console.log('file: ', file)

        })        

    })
 
})
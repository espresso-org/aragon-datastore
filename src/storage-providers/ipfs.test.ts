import { Ipfs } from './ipfs' 

describe('IPFS Provider', async () => {


    describe('files', async () => {

        it('add file', async () => {

            let ipfs = new Ipfs({ host: 'localhost', port: '5001' })
            let result = await ipfs.files.add(new ArrayBuffer(40))
            console.log('result: ', result)

        })

        it('get file', async () => {

            let ipfs = new Ipfs({ host: 'localhost', port: '5001' })
            let fileId = await ipfs.files.add(new ArrayBuffer(40))
            let file = await ipfs.files.get(fileId)

            console.log('fileId: ', fileId)
            console.log('file: ', file)

        })        

    })
 
})
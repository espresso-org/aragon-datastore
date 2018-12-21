
import { FileCache } from './file-cache'
import { expect } from 'chai'
import 'mocha'

describe('FileCache', async () => {
    const root = {
        id: 0,
        name: '/',
        isFolder: true,
        isPublic: true,
        isDeleted: false
    }

    const files = [{
        id: 1,
        name: 'file.jpg',
        parentFolder: 0,
        isFolder: false,
        isPublic: true,
        isDeleted: false
    }]

    xdescribe('contructor', async () => {

        it('adds files passed as params', async () => {
            
            const fileCache = new FileCache([root])

            const folder = await fileCache.getFile(0)
            
            expect(folder).not.to.be.null
        })
        
    })

    describe('addFile', async () => {

        it('adds a file passed as param', async () => {
            
            const fileCache = new FileCache([root])

            await fileCache.addFile(files[0])

            //const file = await fileCache.getFile(1)
            
            //expect(file).not.to.be.null
        })
        
    })    
});
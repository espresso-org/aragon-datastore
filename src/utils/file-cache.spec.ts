
import { FileCache } from './file-cache'
import { expect } from 'chai'
import 'mocha'
import { idText } from 'typescript';

class IdGenerator {
    _id: number

    constructor(startId = 0) {
        this._id = startId
    }

    id() {
        return this._id++
    }
}

describe('FileCache', async () => {
    const root = {
        id: 0,
        name: '/',
        isFolder: true,
        isPublic: true,
        isDeleted: false
    }

    const files = [{
        name: 'file.jpg',
        parentFolder: 0,
        isFolder: false,
        isDeleted: false
    },{
        name: 'Folder 1',
        parentFolder: 0,
        isFolder: true,
        isDeleted: false
    },{
        name: 'Inner file.pdf',
        parentFolder: 1,
        isFolder: false,
        isDeleted: false
    },{
        name: 'Folder 2',
        parentFolder: 1,
        isFolder: true,
        isDeleted: false
    }
    ]

    let idGenerator

    beforeEach(async () => {
        idGenerator = new IdGenerator(1)
    })

    xdescribe('contructor', async () => {

        it('adds files passed as params', async () => {
            
            const fileCache = new FileCache([root])

            const folder = await fileCache.getFile(0)
            
            expect(folder).not.to.be.null
        })
        
    })

    xdescribe('addFile', async () => {

        xit('adds a file passed as param', async () => {
            
            const fileCache = new FileCache([root])

            await fileCache.addFile({ id: idGenerator.id(), ...files[0] })

            //const file = await fileCache.getFile(1)
            
            //expect(file).not.to.be.null
        })

        it('adds a file into the right folder', async () => {
            
            const fileCache = new FileCache([root])

            await fileCache.addFile({ id: idGenerator.id(), ...files[1]})
            await fileCache.addFile({ id: idGenerator.id(), ...files[2]})

            const file = await fileCache.getFolder(1)

            console.log(file)
            
            //expect(file).not.to.be.null
        })        
        
    })    

    xdescribe('getFolder', async () => {

        it('should return the folder', async () => {
            
            const fileCache = new FileCache([root])

            await fileCache.addFile(files[0])

            const folder = await fileCache.getFolder(0)
            
            console.log('files ', folder)
            //expect(file).not.to.be.null
        })
        
    })   
    
    describe('getFilePath', async () => {

        it('should return the ids of the path', async () => {
            
            const fileCache = new FileCache([root])
            const folder1 = { id: idGenerator.id(), ...files[1]}
            const file1 = { id: idGenerator.id(), ...files[2], parentFolder: folder1.id }
            const folder2 = { id: idGenerator.id(), ...files[3], parentFolder: folder1.id }

            await fileCache.addFile(folder1)
            await fileCache.addFile(file1)
            await fileCache.addFile(folder2)
            await fileCache.addFile({ id: idGenerator.id(), ...files[2], parentFolder: folder2.id })
            
            const path = await fileCache.getFilePath(4)
            expect(path).to.deep.equal([0, 1, 3, 4])
        })
        
    })     
});
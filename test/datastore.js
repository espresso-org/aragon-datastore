//const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
//const getBalance = require('@aragon/test-helpers/balance')(web3)

const Datastore = artifacts.require('Datastore')

contract('Datastore ', accounts => {
    let datastore

    beforeEach(async () => {
        datastore = await Datastore.new()

    })

    it('increases lastFileId by 1 after addFile', async () => {
        assert.equal(await datastore.lastFileId(), 0)
        await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", "file name", 100, true)
        assert.equal(await datastore.lastFileId(), 1)
    })    

    it('getFile returns the right file data', async () => {
        const file1 = { 
            name: 'test name',
            storageRef: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
            size: 4567,
            isPublic: true
        }

        const file2 = { 
            name: 'test name2',
            storageRef: 'K4WWQSuPMS6aGCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
            size: 9872214,
            isPublic: false
        }        

        await datastore.addFile(file1.storageRef, file1.name, file1.size, file1.isPublic)
        await datastore.addFile(file2.storageRef, file2.name, file2.size, file2.isPublic)

        const getFile1 = await datastore.getFile(1)
        assert.equal(getFile1[0], file1.storageRef)
        assert.equal(getFile1[1], file1.name)
        assert.equal(getFile1[2], file1.size)
        assert.equal(getFile1[3], file1.isPublic)
        assert.equal(getFile1[4], false) // isDeleted should be false

        const getFile2 = await datastore.getFile(2)
        assert.equal(getFile2[0], file2.storageRef)
        assert.equal(getFile2[1], file2.name)
        assert.equal(getFile2[2], file2.size)
        assert.equal(getFile2[3], file2.isPublic)
        assert.equal(getFile2[4], false) // isDeleted should be false
        
    })


    it('setFilename changes the file name', async () => {
        const newFilename = 'new file name'

        await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", "file name", 100, true)
        await datastore.setFilename(1, newFilename)

        assert.equal((await datastore.getFile(1))[1], newFilename)
    })


    it('setFileContent changes the storage reference and file size', async () => {
        const newStorageRef = 'Qm2NjB3YrhJTHsV4X3vb2tWWQSuPMS6aXCbZKpEjPHPUZN'
        const newFileSize = 9086

        await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", "file name", 100, true)
        await datastore.setFileContent(1, newStorageRef, newFileSize)

        const file = await datastore.getFile(1)

        assert.equal(file[0], newStorageRef)
        assert.equal(file[2], newFileSize)
    })    

    it('throws when setFilename is called by account with no write access', async () => {
        await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", "file name", 100, true, { from: accounts[0] })

        await assertThrow(async () => datastore.setFilename(1, 'new file name', { from: accounts[1] }))

    }) 

})


async function assertThrow(fn) {
    try {
        await fn()
    } catch(e) {
        return true
    }
    assert.fail('Should have thrown')
}
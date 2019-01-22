const _ = require('lodash')
const { GasTracker } = require('../src/utils/gas-tracker')

const Datastore = artifacts.require('Datastore')
const ObjectACL = artifacts.require('@espresso-org/object-acl/contracts/ObjectACL')
const DAOFactory = artifacts.require('@aragon/core/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/core/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')
const TestDatastore = artifacts.require('TestDatastore')

const EMPTY_ADDR = '0x0000000000000000000000000000000000000000'

//contract = () => 0

contract('Datastore ', accounts => {
    let datastore
    let daoFact
    let acl
    let kernel
    let kernelBase
    let aclBase
    let APP_MANAGER_ROLE
    let objectACL
    let helper

    const root = accounts[0]
    const holder = accounts[1]
    const DUMMY_ROLE = 1
    const gasTracker = new GasTracker()

    before(async () => {
        aclBase = await ACL.new()        
        kernelBase = await Kernel.new(true)
        helper = await TestDatastore.new()
    })

    after(async () => {
        console.log(gasTracker.summary())
    })    

    beforeEach(async () => {
        
        const regFact = await EVMScriptRegistryFactory.new()
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)        

        const r = await daoFact.newDAO(root)
        kernel = Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        acl = ACL.at(await kernel.acl())         
        
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

        await acl.createPermission(holder, kernel.address, APP_MANAGER_ROLE, holder, { from: root })

        const receipt = await kernel.newAppInstance(await helper.apmNamehash("datastore"), (await Datastore.new()).address, { from: holder })        
        datastore = Datastore.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        const daclReceipt = await kernel.newAppInstance(await helper.apmNamehash("datastore-acl"), (await ObjectACL.new()).address, { from: holder })        
        objectACL = ObjectACL.at(daclReceipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(datastore.address, objectACL.address, await objectACL.OBJECTACL_ADMIN_ROLE(), root)
        await acl.createPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE(), root)
        await acl.grantPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        await acl.grantPermission(holder, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        
         
        await objectACL.initialize() 
        await datastore.initialize(objectACL.address)

        await acl.grantPermission(objectACL.address, acl.address, await acl.CREATE_PERMISSIONS_ROLE())
    })

    describe('addFile', async () => {

        xit('increases lastFileId by 1 after addFile', async () => {
            assert.equal(await datastore.lastFileId(), 0)
            await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 0)
            assert.equal(await datastore.lastFileId(), 1)
        })   

        it('fires FileChange event', async () => {
            await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)
    
            await assertEvent(datastore, { event: 'FileChange' })
        })          
    })
    
    xit('getFileAsCaller returns the right file data', async () => {
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

        await datastore.addFile(file1.storageRef, 0)
        await datastore.addFile(file2.storageRef, 0)

        const getFile1 = await datastore.getFileAsCaller(1, '0xdeadbeef')
        assert.equal(getFile1[0], file1.storageRef)
        assert.equal(getFile1[1], false) // isDeleted should be false

        const getFile2 = await datastore.getFileAsCaller(2, '0xdeadbeef')
        assert.equal(getFile2[0], file2.storageRef)
        assert.equal(getFile2[1], false) // isDeleted should be false
        
    })   
    

    xdescribe('deleteFile', async () => {
        it('deletes a file from the datastore if second param is true', async () => {
            const file1 = { 
                name: 'test name',
                storageRef: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
                size: 4567,
                isPublic: true
            }       

            await datastore.addFile(file1.storageRef, 0)
            gasTracker.track('deleteFile', await datastore.deleteFile(1, true, false))

            const getFile1 = await datastore.getFileAsCaller(1, accounts[0])
            assert.equal(getFile1[0], file1.storageRef)
            assert.equal(getFile1[1], true) // isDeleted should be true      
        })

        it('restores a file if second param is false', async () => {
            const file1 = { 
                name: 'test name',
                storageRef: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
                size: 4567,
                isPublic: true
            }       

            await datastore.addFile(file1.storageRef, 0)
            await datastore.deleteFile(1, true, false)
            await datastore.deleteFile(1, false, false)

            const getFile1 = await datastore.getFileAsCaller(1, accounts[0])
            assert.equal(getFile1[0], file1.storageRef)
            assert.equal(getFile1[1], false) // isDeleted should be false      
        })    
        
        it('deletes a file permanently if third param is true', async () => {
            const file1 = { 
                name: 'test name',
                storageRef: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
                size: 4567,
                isPublic: true
            }       

            await datastore.addFile(file1.storageRef, 0)
            await datastore.deleteFile(1, true, true)

            const getFile1 = await datastore.getFileAsCaller(1, accounts[0])
            assert.equal(getFile1[0], '')
            assert.equal(getFile1[1], false)    
        })        

        it('throws when not called by owner', async () => {
            await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 0)

            assertThrow(async () => {
                await datastore.deleteFile(1, true, false, { from: accounts[1] })
            })
        })
    })  

    describe('deleteFilesPermanently', async () => {
        xit('deletes files from the datastore parmanently', async () => {
            const file1 = { 
                name: 'test name',
                storageRef: 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t',
                size: 4567,
                isPublic: true
            }       

            await datastore.addFile(file1.storageRef, 0)
            gasTracker.track('deleteFilesPermanently([1])', await datastore.deleteFilesPermanently([ 1 ]))

            const getFile1 = await datastore.getFileAsCaller(1, accounts[0])
            assert.equal(getFile1[0], '')
            assert.equal(getFile1[1], false)
            assert.equal(getFile1[2], EMPTY_ADDR)    
        })   
    })  

    xit('fires PermissionChange event on setWritePermission call', async () => {
        await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0, { from: accounts[0] })
        await datastore.setWritePermission(1, accounts[1], true)

        await assertEvent(datastore, { event: 'PermissionChange' })
    })   
    
    xdescribe('getGroupsWithPermissionsOnFile', async () => {
        it('returns the right group list', async() => {
            await datastore.createGroup('My first group')
            await datastore.createGroup('My second group')
            await datastore.createGroup('My third group')

            await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)
            await datastore.setGroupPermissions(1, 1, true)

            const groups = await datastore.getGroupsWithPermissionsOnFile(1)

            assert.equal(groups.length, 1)
            assert.equal(groups[0].toNumber(), 1)
        }) 
    })  
    
    xdescribe('getEntityPermissionsOnFile', async () => {
        it('returns the read and write permissions', async() => {

            await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)
            await datastore.setWritePermission(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7', true)

            const permissions = await datastore.getEntityPermissionsOnFile(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')

            assert.equal(permissions, true)
        })
    })  
    
    
    xdescribe('removeEntityFromFile', async () => {
        it('sets read and write permissions to false', async() => {
            await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)

            await datastore.setWritePermission(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef6', false)
            await datastore.setWritePermission(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7', true)
            gasTracker.track('removeEntityFromFile', await datastore.removeEntityFromFile(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7'))
            await datastore.removeEntityFromFile(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef8')

            assert.equal((await datastore.hasWriteAccess(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')), false)
            assert.equal((await datastore.hasWriteAccess(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef8')), false)
        })

        it('fires PermissionChange event ', async () => {
            await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)
            await datastore.setWritePermission(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7', true)
            await datastore.removeEntityFromFile(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')

            await assertEvent(datastore, { event: 'PermissionChange' })
        })   
        
        it('throws when not called by owner', async () => {
            await datastore.addFile("QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t", 0)
            await datastore.setWritePermission(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7', true)

            assertThrow(async () => {
                await datastore.removeEntityFromFile(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7', { from: accounts[1] })
            })
        })        
    })   
    
    
    it('getGroupPermissionsOnFile returns the right data', async() => {
        await datastore.createGroup('My first group')
        await datastore.createGroup('My second group')

        await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0)
        await datastore.setGroupPermissions(1, 1, true)

        const groupPermissions = await datastore.getGroupPermissionsOnFile(1, 1)

        assert.equal(groupPermissions, true)
    })

    it('tests if ownership of files works correctly', async() => {
        await datastore.addFile('QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t', 0, { from: accounts[0] })
        const file = await datastore.getFileAsCaller(1, accounts[0])

        assert.equal(file[2], accounts[0])
    })

    it('createGroup creates a new group', async () => {
        gasTracker.track('createGroup', await datastore.createGroup('My first group'))
        await datastore.createGroup('My second group')

        assert.equal((await datastore.getGroupIds())[0], 1)
        assert.equal((await datastore.getGroupIds())[1], 2)
    })

    describe('deleteGroup', async () => {
        it('deletes a group', async () => {
            await datastore.createGroup('My first group')
            await datastore.createGroup('My second group')
            gasTracker.track('deleteGroup', await datastore.deleteGroup(2))

            assert.equal((await datastore.getGroupIds())[0], 1)
            assert.equal((await datastore.getGroupIds())[1], 0)
        })

        it("throws if group doesn't exist", async () => {
            await datastore.createGroup('My first group')
            
            assertThrow(async () => await datastore.deleteGroup(2))
        })
    })

    describe('renameGroup', async () => {
        it('renames an existing group', async() => {
            await datastore.createGroup('My old name')
            gasTracker.track('renameGroup', await datastore.renameGroup(1, 'My new name'))
            var group = await datastore.getGroup(1)

            assert.equal(group[1], 'My new name')
        })

        it("throws if group doesn't exist", async () => {
            await datastore.createGroup('My first group')
            
            assertThrow(async () => await datastore.renameGroup(2, 'new name'))
        })
    })

    it('getGroupIds returns the list of Id of the groups', async() => {
        await datastore.createGroup('My first group')
        await datastore.createGroup('My second group')
        await datastore.createGroup('My third group')
        var groupCount = await datastore.getGroupIds();

        assert.equal(groupCount.length, 3)
        assert.equal((await datastore.getGroupIds())[0], 1)
        assert.equal((await datastore.getGroupIds())[1], 2)
        assert.equal((await datastore.getGroupIds())[2], 3)
    })

    describe('getGroup', async () => {

        it('returns the list of entities in a group and its name', async() => {
            await datastore.createGroup('My first group')
            await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7')
            await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')
            var group = await datastore.getGroup(1)

            assert.equal(group[0][0], '0xb4124ceb3451635dacedd11767f004d8a28c6ee7')
            assert.equal(group[0][1], '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')
            assert.equal(group[1], 'My first group')
        })

        it("throws if group doesn't exist", async () => {            
            assertThrow(async () => await datastore.getGroup(2))
        })
    })        

    describe('addEntityToGroup', async () => {
        it('adds an entity to a group', async() => {
            await datastore.createGroup('My first group')
            gasTracker.track('addEntityToGroup', await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7'))
            
            const entities = (await datastore.getGroup(1))[0]

            assert.equal(entities[0], '0xb4124ceb3451635dacedd11767f004d8a28c6ee7')
        })

        it("throws if group doesn't exist", async () => {            
            assertThrow(async () => await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7'))
        })
    })     

    describe('removeEntityFromGroup', async () => {
        it('removes an entity from a group', async() => {
            await datastore.createGroup('My first group')
            await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7')
            await datastore.addEntityToGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')
            gasTracker.track('removeEntityFromGroup', await datastore.removeEntityFromGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7'))
            
            const entities = (await datastore.getGroup(1))[0]

            assert.equal(entities[0], 0)
            assert.equal(entities[1], '0xb4124ceb3451635dacedd11767f004d8a28c6ef7')
        })  

        it("throws if group doesn't exist", async () => {            
            assertThrow(async () => await datastore.removeEntityFromGroup(1, '0xb4124ceb3451635dacedd11767f004d8a28c6ee7'))
        })
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

async function assertEvent(contract, filter) {
    return new Promise((resolve, reject) => {
        if (!contract[filter.event])
            return reject(`No event named ${filter.event} found`)

        const event = contract[filter.event]()
        event.watch()
        event.get((error, logs) => {
            if (error)
                return reject(`Error while filtering events for ${filter.event}: ${e.message}`)

            const log = _.filter(logs, filter)

            if (log) 
                resolve(log)
            else {
                assert.fail(`Failed to find filtered event for ${filter.event}`)
                reject()
            }
            
        })
        event.stopWatching()
    })
}
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
const FILE_REF = 'QmWWQSuPMS6aXCbZKpEjPHPUZN2NjB3YrhJTHsV4X3vb2t'
const NEW_REF = 'QmVc69uK2mXxwvb5PT7QgujrY3XjY9Ys2Gwn62kCc7rqrL'

//contract = () => 0

contract('Gas usage - Groupes ', accounts => {
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



    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)
        gasTracker.track('1. datastore manager', await datastore.setStorageRef(1, NEW_REF))
    })   

         
    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)
        await datastore.setWritePermission(1, accounts[1], true)
        gasTracker.track('2. entity write access', await datastore.setStorageRef(1, NEW_REF, { from: accounts[1] }))
    })   
    
    
    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)
        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.setGroupPermissions(1, 1, true)

        gasTracker.track('3. 1 group 1 entity', await datastore.setStorageRef(1, NEW_REF, { from: accounts[1] }))
    })   

    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)
        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])
        await datastore.setGroupPermissions(1, 1, true)

        gasTracker.track('4. 1 group 5 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[5] }))
    })   
    
    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)

        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])

        await datastore.createGroup("Group 2")
        await datastore.addEntityToGroup(2, accounts[6])
        await datastore.addEntityToGroup(2, accounts[7])
        await datastore.addEntityToGroup(2, accounts[8])
        await datastore.addEntityToGroup(2, accounts[9])
        await datastore.addEntityToGroup(2, accounts[10])        

        await datastore.setGroupPermissions(1, 2, true)

        gasTracker.track('5. 2 groups 5 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[10] }))
    })   

    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)

        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])

        await datastore.createGroup("Group 2")
        await datastore.addEntityToGroup(2, accounts[6])
        await datastore.addEntityToGroup(2, accounts[7])
        await datastore.addEntityToGroup(2, accounts[8])
        await datastore.addEntityToGroup(2, accounts[9])
        await datastore.addEntityToGroup(2, accounts[10])        

        await datastore.createGroup("Group 3")
        await datastore.addEntityToGroup(3, accounts[11])
        await datastore.addEntityToGroup(3, accounts[12])
        await datastore.addEntityToGroup(3, accounts[13])
        await datastore.addEntityToGroup(3, accounts[14])
        await datastore.addEntityToGroup(3, accounts[15])            

        await datastore.setGroupPermissions(1, 3, true)

        gasTracker.track('6. 3 groups 5 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[15] }))
    })      
    
    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)

        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])

        await datastore.createGroup("Group 2")
        await datastore.addEntityToGroup(2, accounts[6])
        await datastore.addEntityToGroup(2, accounts[7])
        await datastore.addEntityToGroup(2, accounts[8])
        await datastore.addEntityToGroup(2, accounts[9])
        await datastore.addEntityToGroup(2, accounts[10])        

        await datastore.createGroup("Group 3")
        await datastore.addEntityToGroup(3, accounts[11])
        await datastore.addEntityToGroup(3, accounts[12])
        await datastore.addEntityToGroup(3, accounts[13])
        await datastore.addEntityToGroup(3, accounts[14])
        await datastore.addEntityToGroup(3, accounts[15])     

        await datastore.createGroup("Group 4")
        await datastore.addEntityToGroup(4, accounts[16])
        await datastore.addEntityToGroup(4, accounts[17])
        await datastore.addEntityToGroup(4, accounts[18])
        await datastore.addEntityToGroup(4, accounts[19])
        await datastore.addEntityToGroup(4, accounts[20])            

        await datastore.setGroupPermissions(1, 4, true)

        gasTracker.track('7. 4 groups 5 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[20] }))
    })     


    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)

        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])

        await datastore.createGroup("Group 2")
        await datastore.addEntityToGroup(2, accounts[6])
        await datastore.addEntityToGroup(2, accounts[7])
        await datastore.addEntityToGroup(2, accounts[8])
        await datastore.addEntityToGroup(2, accounts[9])
        await datastore.addEntityToGroup(2, accounts[10])        

        await datastore.createGroup("Group 3")
        await datastore.addEntityToGroup(3, accounts[11])
        await datastore.addEntityToGroup(3, accounts[12])
        await datastore.addEntityToGroup(3, accounts[13])
        await datastore.addEntityToGroup(3, accounts[14])
        await datastore.addEntityToGroup(3, accounts[15])     

        await datastore.createGroup("Group 4")
        await datastore.addEntityToGroup(4, accounts[16])
        await datastore.addEntityToGroup(4, accounts[17])
        await datastore.addEntityToGroup(4, accounts[18])
        await datastore.addEntityToGroup(4, accounts[19])
        await datastore.addEntityToGroup(4, accounts[20])      
        
        await datastore.createGroup("Group 5")
        await datastore.addEntityToGroup(5, accounts[21])
        await datastore.addEntityToGroup(5, accounts[22])
        await datastore.addEntityToGroup(5, accounts[23])
        await datastore.addEntityToGroup(5, accounts[24])
        await datastore.addEntityToGroup(5, accounts[25])         

        await datastore.setGroupPermissions(1, 5, true)

        gasTracker.track('8. 5 groups 5 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[25] }))
    })    
    
    it('setStorageRef', async () => {
        await datastore.addFile(FILE_REF, 0)
        await datastore.createGroup("Group 1")
        await datastore.addEntityToGroup(1, accounts[1])
        await datastore.addEntityToGroup(1, accounts[2])
        await datastore.addEntityToGroup(1, accounts[3])
        await datastore.addEntityToGroup(1, accounts[4])
        await datastore.addEntityToGroup(1, accounts[5])
        await datastore.addEntityToGroup(1, accounts[6])
        await datastore.addEntityToGroup(1, accounts[7])
        await datastore.addEntityToGroup(1, accounts[8])
        await datastore.addEntityToGroup(1, accounts[9])
        await datastore.addEntityToGroup(1, accounts[10])
        await datastore.setGroupPermissions(1, 1, true)

        gasTracker.track('9. 1 group 10 entities', await datastore.setStorageRef(1, NEW_REF, { from: accounts[10] }))
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
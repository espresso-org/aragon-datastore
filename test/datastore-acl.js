const _ = require('lodash')

const Datastore = artifacts.require('Datastore')
const DatastoreACL = artifacts.require('DatastoreACL')
const DAOFactory = artifacts.require('@aragon/core/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/core/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')
const TestDatastore = artifacts.require('TestDatastore')


contract('DatastoreACL ', accounts => {
    let datastore
    let daoFact
    let acl
    let kernel
    let kernelBase
    let aclBase
    let APP_MANAGER_ROLE
    let datastoreACL
    let helper

    const root = accounts[0]
    const holder = accounts[1]
    const DUMMY_ROLE = 1


    before(async () => {
        aclBase = await ACL.new()        
        kernelBase = await Kernel.new(true)
        helper = await TestDatastore.new()
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

        const daclReceipt = await kernel.newAppInstance(await helper.apmNamehash("datastore-acl"), (await DatastoreACL.new()).address, { from: holder })        
        datastoreACL = DatastoreACL.at(daclReceipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(datastore.address, datastoreACL.address, await datastoreACL.DATASTOREACL_ADMIN_ROLE(), root)
        await acl.grantPermission(root, datastoreACL.address, await datastoreACL.DATASTOREACL_ADMIN_ROLE())
        await acl.createPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE(), root)
        await acl.grantPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        await acl.grantPermission(holder, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        
         
        await datastoreACL.initialize() 
        await datastore.init(datastoreACL.address)

        await acl.grantPermission(datastoreACL.address, acl.address, await acl.CREATE_PERMISSIONS_ROLE())

    })


    describe('revokeObjectPermission', async () => {
        it('throws if not called the permission manager', async () => {
            await datastoreACL.grantObjectPermission(root, 1, DUMMY_ROLE, root)
            assertThrow(async () => await datastoreACL.revokeObjectPermission(root, 1, DUMMY_ROLE, holder))
        })
    })   
    
    describe('grantObjectPermission', async () => {
        it('throws if not called the permission manager', async () => {
            await datastoreACL.createObjectPermission(root, 1, DUMMY_ROLE, root)
            assertThrow(async () => datastoreACL.grantObjectPermission(root, 1, DUMMY_ROLE, holder), { from: holder} )
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
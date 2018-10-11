const _ = require('lodash')

const Datastore = artifacts.require('Datastore')
const DatastoreACL = artifacts.require('DatastoreACL')
const DAOFactory = artifacts.require('@aragon/core/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/core/contracts/factory/EVMScriptRegistryFactory')
const ACL = artifacts.require('@aragon/core/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/core/contracts/kernel/Kernel')


contract('DatastoreACL ', accounts => {
    let datastore
    let daoFact
    let acl
    let kernel
    let kernelBase
    let aclBase
    let APP_MANAGER_ROLE
    let datastoreACL

    const root = accounts[0]
    const holder = accounts[1]
    const DUMMY_ROLE = 1


    before(async () => {
        aclBase = await ACL.new()        
        kernelBase = await Kernel.new(true)
    })

    beforeEach(async () => {
        
        const regFact = await EVMScriptRegistryFactory.new()
        daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)        

        const r = await daoFact.newDAO(root)
        kernel = Kernel.at(r.logs.filter(l => l.event == 'DeployDAO')[0].args.dao)
        acl = ACL.at(await kernel.acl())         
        
        APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

        await acl.createPermission(holder, kernel.address, APP_MANAGER_ROLE, holder, { from: root })

        const receipt = await kernel.newAppInstance('0x1234', (await Datastore.new()).address, { from: holder })
        
        datastore = Datastore.at(receipt.logs.filter(l => l.event == 'NewAppProxy')[0].args.proxy)

        await acl.createPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE(), root)
        await acl.grantPermission(root, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        await acl.grantPermission(holder, datastore.address, await datastore.DATASTORE_MANAGER_ROLE())
        
        datastoreACL = await DatastoreACL.new()   
        await datastoreACL.initialize(datastore.address, acl.address) 
        await datastore.init(datastoreACL.address)

        await acl.grantPermission(datastoreACL.address, acl.address, await acl.CREATE_PERMISSIONS_ROLE())
    })

    describe('canPerformP', async () => {
        it('returns false if DatastoreACL is not initialized', async () => {
            const dsAcl = await DatastoreACL.new()
            const result = await dsAcl.canPerformP.call(root, 0, [])
            assert.equal(result, false)
        })

        it('returns false on non-existing permission', async () => {
            const result = await datastoreACL.canPerformP.call(root, 0, [0])
            assert.equal(result, false)
        })        
    })

    describe('createObjectPermission', async () => {
        it('throws if not called with CREATE_PERMISSIONS_ROLE', async () => {
            assertThrow(async () => datastoreACL.createObjectPermission(1, DUMMY_ROLE))
        })
    })    

    describe('aclCreatePermission', async () => {
        it('creates a permission on the ACL', async () => {
            datastoreACL.aclCreatePermission(root, datastore.address, DUMMY_ROLE, root)
            const hasRole = await acl.hasPermission.call(root, datastore.address, DUMMY_ROLE)
            
            assert.equal(hasRole, true)
        })
    })

    describe('aclGrantPermission', async () => {

        it('grants a permission for an entity on the ACL', async () => {
            await datastoreACL.aclCreatePermission(root, datastore.address, DUMMY_ROLE, datastoreACL.address)
            await datastoreACL.aclGrantPermission(holder, datastore.address, DUMMY_ROLE)
            const hasRole = await acl.hasPermission.call(holder, datastore.address, DUMMY_ROLE)
            
            assert.equal(hasRole, true)
        })
    })

    describe('aclHasPermission', async () => {

        it('returns the ACL permission', async () => {
            acl.createPermission(holder, datastore.address, DUMMY_ROLE, root)
            const hasRole = await datastoreACL.aclHasPermission.call(holder, datastore.address, DUMMY_ROLE, [])
            assert(hasRole, true)
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
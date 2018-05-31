import * as rxjs from 'rxjs'

//import contract from 'truffle-contract'
//import * as DatastoreContract from '../../build-contracts/Datastore'
import * as DatastoreContract from '../build-contracts/Datastore.json'

export class Web3 {

    _web3
    _contract
    _isInit


    constructor(web3) {
        const contract = require('truffle-contract')
        
        this._web3 = web3
        this._contract = contract(DatastoreContract)
        this._contract.defaults({
            gas:3000000
        })

        this._contract.setProvider(web3.currentProvider)

        this._isInit = this.initialize()

    }

    private getAccounts() {
        return new Promise((res, rej) => {
            this._web3.eth.getAccounts((err, accounts) => {
                if (err) 
                    return rej(err)                
                
                res(accounts)
            })
        })
    }

    async initialize() {
        // Initialize only once
        if (!this._isInit) {
            const accounts = await this.getAccounts()
            this._contract.web3.eth.defaultAccount = accounts[0]
        }
        else
            return this._isInit
    }


    async getContract() {
        await this.initialize()

        let contractInstance = await this._contract.deployed()
        return contractInstance
    }
}


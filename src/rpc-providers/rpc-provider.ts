import { RpcProviderContract } from './rpc-provider-contract'

export interface RpcProvider {
    getContract(): Promise<RpcProviderContract>
}
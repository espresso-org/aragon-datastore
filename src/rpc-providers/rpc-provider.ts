export interface RpcProvider {
    
    getContract(): Promise<any>
}
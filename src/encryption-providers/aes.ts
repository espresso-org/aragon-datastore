import { EncryptionProvider } from './encryption-provider'

export class Aes implements EncryptionProvider {
    private _encryptionAlgo

    constructor(opts?) {
        this._encryptionAlgo = {
            name: opts.name,
            length: opts.length,
            // We temporarily use a fixed IV, but will eventually change to a randomly generated one for each file when Keep will be implemented
            iv: new Int8Array([104, 5, -65, -46, 117, 38, 107, 60, 69, 4, -99, 41, 71, -35, -46, 82]) //crypto.getRandomValues(new Int8Array(16))
        }
    }

    /**
     * Encrypts a file with an AES Cipher algorithm
     * @param {ArrayBuffer} file File as an ArrayBuffer
     */
    async encryptFile(file: ArrayBuffer) {
        const encryptionKey = await crypto.subtle.generateKey(this._encryptionAlgo, true, ['encrypt', 'decrypt'])
        console.log('encryptionKey: ', encryptionKey)
        const encryptionKeyAsJSON = await crypto.subtle.exportKey('jwk', <CryptoKey>encryptionKey)
        const encryptionKeyAsString = JSON.stringify(encryptionKeyAsJSON)
        console.log('encryptionKeyAsString: ', encryptionKeyAsString)
        const encryptedFile = await crypto.subtle.encrypt(this._encryptionAlgo, <CryptoKey>encryptionKey, file)

        return {
            encryptedFile: encryptedFile,
            encryptionKey: encryptionKeyAsString
        }
    }

    /**
     * Decrypts a file with an AES Cipher algorithm
     * @param {ArrayBuffer} encryptedFile Encrypted file to decrypt
     * @param {CryptoKey} encryptionKey Encryption key
     */
    async decryptFile(encryptedFile: ArrayBuffer, encryptionKey: CryptoKey) {
        let name = this._encryptionAlgo.name
        let iv = this._encryptionAlgo.iv
        return await crypto.subtle.decrypt({ name: name, iv: iv }, encryptionKey, encryptedFile)
    }
}
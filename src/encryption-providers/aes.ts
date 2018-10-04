import { EncryptionProvider } from './encryption-provider'

export class Aes implements EncryptionProvider {
    private _encryptionAlgo

    constructor(opts?) {
        this._encryptionAlgo = {
            name: opts.name,
            length: opts.length,
            iv: crypto.getRandomValues(new Int8Array(16))
        }
    }

    /**
     * Encrypts a file with an AES Cipher algorithm
     * @param {ArrayBuffer} file File as an ArrayBuffer
     */
    async encryptFile(file: ArrayBuffer) {
        const encryptionKey = await crypto.subtle.generateKey(this._encryptionAlgo, true, ['encrypt', 'decrypt'])
        const encryptionKeyAsJSON = await crypto.subtle.exportKey('jwk', <CryptoKey>encryptionKey)
        const encryptionKeyAsString = JSON.stringify(encryptionKeyAsJSON)
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
        return await crypto.subtle.decrypt(this._encryptionAlgo, encryptionKey, encryptedFile)
    }
}
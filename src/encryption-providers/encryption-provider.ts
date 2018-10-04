export interface EncryptionProvider {
    encryptFile(file: ArrayBuffer): Promise<any>
    decryptFile(encryptedFile: ArrayBuffer, encryptionKey: CryptoKey): Promise<ArrayBuffer>
}
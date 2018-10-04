import { DatastoreSettings, EncryptionProvider } from '../datastore-settings'
import { Aes } from './aes'

export { EncryptionProvider } from './encryption-provider'
export { Aes } from './aes'

export function getEncryptionProviderFromSettings(settings: DatastoreSettings) {
    switch (settings.encryptionProvider) {
        case EncryptionProvider.Aes: 
            return new Aes({
                name: settings.aes.name,
                length: settings.aes.length,
            })

        case EncryptionProvider.None:
            return undefined
    }
}
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function uploadImage(
  file: File,
  folder: 'avatars' | 'blocks',
  uid: string
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Ukuran gambar maksimal 2MB')
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${folder}/${uid}/${Date.now()}_${safeName}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

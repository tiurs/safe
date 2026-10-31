import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Only file names are stored in the database; the documents path can change between app updates on iOS.
function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function photoUri(name: string): string {
  return new File(photoDir(), name).uri;
}

function newName(ext: string) {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || '.jpg'}`;
}

function storePicked(uri: string): string {
  const src = new File(uri);
  const name = newName(src.extension);
  src.copySync(new File(photoDir(), name));
  return name;
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission was not granted.');
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;
  return storePicked(result.assets[0].uri);
}

export function deletePhotos(names: string[]) {
  for (const name of names) {
    try {
      const file = new File(photoDir(), name);
      if (file.exists) file.delete();
    } catch {
      // ignore missing files
    }
  }
}

export function readPhotoBase64(name: string): string | null {
  try {
    const file = new File(photoDir(), name);
    return file.exists ? file.base64Sync() : null;
  } catch {
    return null;
  }
}

export function writePhotoBase64(name: string, data: string) {
  const safeName = name.replace(/[^A-Za-z0-9._-]/g, '_');
  const file = new File(photoDir(), safeName);
  if (file.exists) file.delete();
  file.create();
  file.writeSync(data, { encoding: 'base64' });
  return safeName;
}

export function clearAllPhotos() {
  const dir = photoDir();
  for (const entry of dir.list()) {
    try {
      entry.delete();
    } catch {
      // ignore
    }
  }
}

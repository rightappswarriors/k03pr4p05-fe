import * as ImagePicker from 'expo-image-picker'
import { useErrorModal } from './errorModalHook'

interface UseImagePickerOptions {
  allowsEditing?: boolean
  aspect?: [number, number]
  quality?: number
}

/** Shape MediaService.normalizeMediaFile expects on native. */
export interface PickedFile {
  uri: string
  name: string
  type: string
}

// Turns a raw ImagePicker asset into {uri, name, type}. Consumers like
// uploadVerificationDocument read file.uri directly — handing them a bare
// string instead of this object is what produces "Media file URI is
// required", since file.uri on a string is undefined.
function toPickedFile(asset: ImagePicker.ImagePickerAsset): PickedFile {
  const fallbackName = asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`
  const name = asset.fileName ?? fallbackName
  const ext = (/\.(\w+)$/.exec(name)?.[1] ?? 'jpg').toLowerCase()
  const type = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`
  return { uri: asset.uri, name, type }
}

/**
 * Thin wrapper around expo-image-picker. Both methods resolve to a
 * {uri, name, type} object — the shape uploadVerificationDocument /
 * MediaService.normalizeMediaFile expect — or null if permission was
 * denied / the user cancelled.
 */
export function useImagePicker(options: UseImagePickerOptions = {}) {
  const { allowsEditing = true, aspect = [16, 9], quality = 0.8 } = options
  const { visible: errorVisible, title, text, showError, closeError } = useErrorModal()

  const pickImage = async (): Promise<PickedFile | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      showError('Photo library permission is required.', 'Permission Denied')
      return null
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing,
      aspect,
      quality,
    })
    if (result.canceled) return null
    return toPickedFile(result.assets[0])
  }

  const takePhoto = async (): Promise<PickedFile | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      showError('Camera permission is required.', 'Permission Denied')
      return null
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing, aspect, quality })
    if (result.canceled) return null
    return toPickedFile(result.assets[0])
  }

  return { pickImage, takePhoto, errorVisible, errorTitle: title, errorText: text, showError, closeError }
}
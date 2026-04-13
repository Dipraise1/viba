import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export async function pickAndUploadAvatar(): Promise<string | null> {
  // Ask permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = asset.uri.split('.').pop() ?? 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  // Upload to Supabase Storage bucket "avatars"
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, decode(asset.base64), {
      contentType: `image/${ext}`,
      upsert: true,
    });

  if (uploadError) {
    console.error('Avatar upload failed:', uploadError.message);
    return null;
  }

  // Get public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // cache bust

  // Save URL to profile
  await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  return publicUrl;
}

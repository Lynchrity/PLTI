import { supabase } from './supabase';

const MEDIA_BUCKET = 'media';

export async function uploadMediaFile(
  folder: 'avatars' | 'banners',
  userId: string,
  file: File,
  fileName?: string,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeName = fileName ?? `${Date.now()}.${ext}`;
  const path = `${folder}/${userId}/${safeName}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('bucket not found')) {
      throw new Error(
        'Media storage is not configured. Create a public "media" bucket and run supabase-storage-media.sql.',
      );
    }
    if (lower.includes('row-level security') || lower.includes('policy')) {
      throw new Error(
        'Photo upload was blocked by storage security. Run supabase-storage-media.sql in the Supabase SQL Editor.',
      );
    }
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mediaPathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0] ?? '');
}

/** Best-effort delete of a file previously uploaded to the media bucket. */
export async function deleteMediaByPublicUrl(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;

  const path = mediaPathFromPublicUrl(publicUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) {
    console.warn('Could not delete media file:', error.message);
  }
}

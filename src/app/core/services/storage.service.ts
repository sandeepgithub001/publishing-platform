import { Injectable } from '@angular/core';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { fb } from '../firebase';

export const COVER_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const INLINE_VIDEO_MAX_BYTES = 25 * 1024 * 1024;

export class UploadError extends Error {}

/** Media uploads to Firebase Storage (spec §4.6): validation + progress + URL. */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = fb().storage;

  /** Cover / inline media under articles/{articleId}/ — owner-only by rules. */
  async uploadForArticle(
    file: File,
    articleId: string,
    kind: 'cover' | 'inline',
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type === 'video/mp4';
    if (kind === 'cover' && !isImage) throw new UploadError('Cover must be an image');
    if (!isImage && !isVideo) throw new UploadError('Only images or mp4 videos are allowed');
    const cap = isVideo ? INLINE_VIDEO_MAX_BYTES : COVER_MAX_BYTES;
    if (file.size > cap) throw new UploadError(`File exceeds ${Math.round(cap / 1024 / 1024)} MB limit`);

    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `articles/${articleId}/${kind}-${Date.now()}.${ext}`;
    return this.upload(file, path, onProgress);
  }

  async uploadAvatar(file: File, uid: string, onProgress?: (pct: number) => void): Promise<string> {
    if (!file.type.startsWith('image/')) throw new UploadError('Avatar must be an image');
    if (file.size > AVATAR_MAX_BYTES) throw new UploadError('Avatar must be ≤ 2 MB');
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    return this.upload(file, `avatars/${uid}/${Date.now()}.${ext}`, onProgress);
  }

  private upload(file: File, path: string, onProgress?: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref(this.storage, path), file, { contentType: file.type });
      task.on(
        'state_changed',
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => reject(new UploadError(err.message)),
        async () => {
          try {
            resolve(await getDownloadURL(task.snapshot.ref));
          } catch (e) {
            reject(e instanceof Error ? e : new UploadError(String(e)));
          }
        },
      );
    });
  }
}

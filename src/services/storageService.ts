import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  storageType: 'cloud-storage' | 'client-optimized';
}

export const storageService = {
  // Validate image file
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Please select a valid image file (JPEG, PNG, or WebP).' };
    }
    // Max 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { valid: false, error: 'Image file size exceeds the 5MB limit. Please choose a smaller image.' };
    }
    return { valid: true };
  },

  // Compress image client-side to ensure lightweight optimized size (~40KB-70KB)
  async compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },

  // Upload food image
  async uploadFoodImage(
    restaurantId: string,
    file: File,
    onProgress?: (progressPercent: number) => void
  ): Promise<UploadResult> {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error, storageType: 'cloud-storage' };
    }

    // Try cloud storage first
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `menu_images/${restaurantId}/${Date.now()}_${sanitizedName}`;
      const imageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(imageRef, file);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      return {
        success: true,
        url: downloadUrl,
        storageType: 'cloud-storage',
      };
    } catch (cloudErr) {
      console.warn('Firebase Storage upload notice (falling back to client optimized compression):', cloudErr);
      try {
        if (onProgress) onProgress(50);
        const optimizedUrl = await this.compressImage(file);
        if (onProgress) onProgress(100);
        return {
          success: true,
          url: optimizedUrl,
          storageType: 'client-optimized',
        };
      } catch (fallbackErr) {
        return {
          success: false,
          error: cloudErr instanceof Error ? cloudErr.message : 'Upload failed',
          storageType: 'cloud-storage',
        };
      }
    }
  },
};

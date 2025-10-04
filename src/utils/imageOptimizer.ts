import piexif from 'piexifjs';

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2000; // px

export interface ImageValidationError {
  type: 'size' | 'dimension' | 'format';
  message: string;
}

/**
 * Valide une image (taille, dimensions, format)
 */
export const validateImage = async (file: File): Promise<ImageValidationError | null> => {
  // Vérifier taille
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      type: 'size',
      message: `L'image dépasse la taille maximale de ${MAX_IMAGE_SIZE_MB}MB (${(file.size / (1024 * 1024)).toFixed(2)}MB)`
    };
  }

  // Vérifier format
  const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validFormats.includes(file.type)) {
    return {
      type: 'format',
      message: `Format non supporté. Formats acceptés: JPEG, PNG, WebP`
    };
  }

  // Vérifier dimensions
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
        resolve({
          type: 'dimension',
          message: `Dimensions trop grandes (${img.width}x${img.height}). Maximum: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`
        });
      } else {
        resolve(null); // Validation OK
      }
    };
    img.onerror = () => {
      resolve({
        type: 'format',
        message: 'Impossible de charger l\'image'
      });
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Supprime les données EXIF d'une image (privacy)
 * Conserve uniquement l'orientation pour rotation correcte
 */
export const stripEXIF = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataURL = e.target?.result as string;

        // Extraire EXIF
        const exifObj = piexif.load(dataURL);

        // Conserver uniquement l'orientation
        const orientation = exifObj['0th']?.[piexif.ImageIFD.Orientation];

        // Créer nouvel objet EXIF minimal
        const newExif = {
          '0th': {},
          'Exif': {},
          'GPS': {},
          'Interop': {},
          '1st': {},
          'thumbnail': null
        };

        // Ajouter orientation si présente
        if (orientation) {
          newExif['0th'][piexif.ImageIFD.Orientation] = orientation;
        }

        // Générer nouveau EXIF binaire
        const exifBytes = piexif.dump(newExif);

        // Insérer dans l'image
        const newDataURL = piexif.insert(exifBytes, dataURL);

        // Convertir en Blob
        fetch(newDataURL)
          .then(res => res.blob())
          .then(blob => resolve(blob))
          .catch(reject);
      } catch (error) {
        console.error('Erreur stripEXIF:', error);
        // En cas d'erreur, retourner le fichier original
        resolve(file);
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Redimensionne une image si nécessaire pour respecter MAX_IMAGE_DIMENSION
 */
export const resizeImageIfNeeded = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;

      // Pas besoin de redimensionner
      if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
        resolve(file);
        return;
      }

      // Calculer nouvelles dimensions (ratio préservé)
      let newWidth = width;
      let newHeight = height;

      if (width > height) {
        newWidth = MAX_IMAGE_DIMENSION;
        newHeight = Math.round((height / width) * MAX_IMAGE_DIMENSION);
      } else {
        newHeight = MAX_IMAGE_DIMENSION;
        newWidth = Math.round((width / height) * MAX_IMAGE_DIMENSION);
      }

      // Créer canvas et redimensionner
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible de créer contexte canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convertir en Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Impossible de convertir canvas en Blob'));
          }
        },
        file.type,
        0.92 // Qualité JPEG/WebP
      );
    };

    img.onerror = () => reject(new Error('Impossible de charger l\'image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Pipeline complet d'optimisation d'image
 * 1. Validation (taille, dimensions, format)
 * 2. Suppression EXIF (privacy)
 * 3. Redimensionnement si nécessaire
 */
export const optimizeImage = async (file: File): Promise<{ blob: Blob; error: ImageValidationError | null }> => {
  // 1. Validation
  const validationError = await validateImage(file);
  if (validationError) {
    return { blob: file, error: validationError };
  }

  try {
    // 2. Suppression EXIF
    let optimizedBlob = await stripEXIF(file);

    // 3. Redimensionnement
    optimizedBlob = await resizeImageIfNeeded(new File([optimizedBlob], file.name, { type: file.type }));

    return { blob: optimizedBlob, error: null };
  } catch (error) {
    console.error('Erreur optimisation image:', error);
    return { blob: file, error: null }; // Retourner original en cas d'erreur
  }
};

// src\lib\imageUtils.ts

const PROXY_DOMAIN = 'https://images.bumbaskitchen.app';

export function optimizeImageUrl(url: string | undefined | null, width?: number, height?: number): string {
  if (!url) return '';

  if (url.includes('res.cloudinary.com')) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      const uploadIndex = pathParts.indexOf('upload');
      
      if (uploadIndex !== -1 && uploadIndex >= 2) {
        const cloudName = pathParts[uploadIndex - 2]; 

        let startIndex = uploadIndex + 1;
        
        if (pathParts[startIndex] && (pathParts[startIndex].includes('w_') || pathParts[startIndex].includes('q_'))) {
            startIndex++;
        }

        if (pathParts[startIndex] && pathParts[startIndex].startsWith('v') && !isNaN(parseInt(pathParts[startIndex].substring(1)))) {
          startIndex++;
        }

        const cleanPath = pathParts.slice(startIndex).join('/'); 
        
        let transformations = 'q_auto,f_avif';
        if (width && height) {
          transformations = `w_${width},h_${height},c_fill,q_auto,f_avif`;
        }
        
        return `${PROXY_DOMAIN}/${cloudName}/${transformations}/${cleanPath}`;
      }
    } catch (e) {
      return url;
    }
  }

  return url;
}

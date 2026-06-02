const PROXY_DOMAIN = 'https://images.bumbaskitchen.app';

export function optimizeImageUrl(url: string | undefined | null): string {
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
        
        return `${PROXY_DOMAIN}/${cloudName}/${cleanPath}`;
      }
    } catch (e) {
      return url;
    }
  }

  return url;
}
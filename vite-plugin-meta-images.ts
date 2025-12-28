import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      // Injecting meta-tag version of CSP for extra browser compatibility
      const cspTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.cnpdirect.com; connect-src 'self' https://www.cnpdirect.com wss://www.cnpdirect.com;">`;
      
      if (!html.includes('Content-Security-Policy')) {
        html = html.replace('<head>', `<head>\n    ${cspTag}`);
      }

      const baseUrl = getDeploymentUrl();
      if (!baseUrl) return html;

      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) imageExt = 'png';
      else if (fs.existsSync(opengraphJpgPath)) imageExt = 'jpg';
      else if (fs.existsSync(opengraphJpegPath)) imageExt = 'jpeg';

      if (imageExt) {
        const imageUrl = `${baseUrl}/opengraph.${imageExt}`;
        html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g, `<meta property="og:image" content="${imageUrl}" />`);
        html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g, `<meta name="twitter:image" content="${imageUrl}" />`);
      }

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) return `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV !== 'test') console.log(...args);
}

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      // Logic to preserve the CSP tag we just added
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) return html;

      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const imageExt = fs.existsSync(opengraphPngPath) ? 'png' : 'jpg';

      const imageUrl = `${baseUrl}/opengraph.${imageExt}`;
      html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g, `<meta property="og:image" content="${imageUrl}" />`);
      html = html.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g, `<meta name="twitter:image" content="${imageUrl}" />`);

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) return `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return null;
}

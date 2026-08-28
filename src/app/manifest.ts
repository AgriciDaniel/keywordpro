import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Keyword Pro',
    short_name: 'Keyword Pro',
    description:
      'A local-first keyword research console with guided reports, charts, and exports.',
    start_url: '/keyword-pro',
    display: 'standalone',
    background_color: '#1F1F1F',
    theme_color: '#1F1F1F',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

let exportedConfig: NextConfig = config;

try {
  // Serwist PWA wrapper — types vary by version, use dynamic import
  const { default: withSerwist } = await import('@serwist/next');
  exportedConfig = (withSerwist as Function)({
    swSrc: 'src/sw.ts',
    swDest: 'public/sw.js',
  })(config);
} catch {
  // Serwist not available, proceed without PWA
}

export default exportedConfig;

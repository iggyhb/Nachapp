/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

let exportedConfig = config;

try {
  const { default: withSerwist } = await import('@serwist/next');
  exportedConfig = withSerwist({
    swSrc: 'src/sw.ts',
    swDest: 'public/sw.js',
  })(config);
} catch {
  // Serwist not available, proceed without PWA
}

export default exportedConfig;

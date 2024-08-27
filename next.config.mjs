// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      `i2o.scdn.co`,
      'mosaic.scdn.co',
      'i.scdn.co',
      'image-cdn-ak.spotifycdn.com',
      'thisis-images.scdn.co',
      'seeded-session-images.scdn.co',
      'daily-mix.scdn.co',
      'newjams-images.scdn.co',
    ],
  },
};

export default nextConfig;

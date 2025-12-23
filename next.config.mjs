import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: [
      'i2o.scdn.co',
      'mosaic.scdn.co',
      'i.scdn.co',
      'platform-lookaside.fbsbx.com',
      'image-cdn-ak.spotifycdn.com',
      'thisis-images.scdn.co',
      'seeded-session-images.scdn.co',
      'daily-mix.scdn.co',
      'newjams-images.scdn.co',
      'pickasso.spotifycdn.com',
      'image-cdn-fa.spotifycdn.com',
      's1.ticketm.net',
      'images.universe.com',
    ],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);

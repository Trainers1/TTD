/** @type {import('next').NextConfig} */
const nextConfig = {
  /* 이미지 외부 도메인 허용 (필요 시 추가) */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;

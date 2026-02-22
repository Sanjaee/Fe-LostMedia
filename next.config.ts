import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  reactStrictMode: true,
  images: {
    domains: [
      "res.cloudinary.com",
      "i.pinimg.com",
      "via.placeholder.com",
      "localhost",
      "lostmedia.zacloth.com",
      "zacloth.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "googleusercontent.com",
    ],
  },
};

export default nextConfig;

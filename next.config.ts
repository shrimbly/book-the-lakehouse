import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; a processed full-size JPEG + thumbnail plus
      // multipart overhead can push past that on detailed photos.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

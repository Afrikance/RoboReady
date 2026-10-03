/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**.blob.vercel-storage.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]
            : []),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com; frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com; connect-src 'self' https://api.stripe.com https://*.blob.vercel-storage.com https://challenges.cloudflare.com",
          },
        ],
      },
    ]
  },
}

export default nextConfig

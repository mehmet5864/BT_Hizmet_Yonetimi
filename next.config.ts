import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["exceljs", "pdfkit", "docx"],
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      {
        source: "/indir",
        headers: [...common, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/api/paket",
        headers: [...common, { key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/:path((?!indir$|api/paket$).*)",
        headers: [...common, { key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  poweredByHeader: false,
  // Ícones e logo mudam raramente: o navegador guarda por 7 dias (e revalida depois).
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [
      { source: "/icons/:path*", headers: cache },
      { source: "/brand/:path*", headers: cache },
    ];
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Importa só os ícones usados (menos JS no navegador).
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

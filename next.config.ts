import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // Importa só os ícones usados (menos JS no navegador).
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

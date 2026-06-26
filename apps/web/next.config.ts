import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép dev server phục vụ tài nguyên /_next/* khi truy cập qua tunnel domain
  allowedDevOrigins: ["daoduck.id.vn", "backend.daoduck.id.vn"],
};

export default nextConfig;

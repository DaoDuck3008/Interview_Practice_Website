"use client";

import { useState } from "react";
import AdminSidebar, { SIDEBAR_WIDTH } from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#06060c]">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div
        className="flex flex-col min-h-screen min-w-0 transition-[margin-left] duration-200"
        style={{
          marginLeft: collapsed
            ? SIDEBAR_WIDTH.collapsed
            : SIDEBAR_WIDTH.expanded,
        }}
      >
        <AdminHeader />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

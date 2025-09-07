import { Routes, Route } from "react-router-dom";
import { Overview } from "@/components/dashboard/Overview";
import { Conversations } from "@/components/dashboard/Conversations";
import { Categories } from "@/components/dashboard/Categories";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { Analytics } from "@/components/dashboard/Analytics";
import { DashboardSettings } from "@/components/dashboard/Settings";

export function DashboardContent() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="conversations" element={<Conversations />} />
      <Route path="categories" element={<Categories />} />
      <Route path="actions" element={<ActionItems />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<DashboardSettings />} />
    </Routes>
  );
}
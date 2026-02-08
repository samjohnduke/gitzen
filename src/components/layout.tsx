import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";

interface LayoutProps {
  username?: string;
  onLogout: () => void;
}

export function Layout({ username, onLogout }: LayoutProps) {
  return (
    <div style={{
      display: "flex",
      height: "100%",
      overflow: "hidden",
    }}>
      <Sidebar username={username} onLogout={onLogout} />
      <main style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}

import { getUserData } from "@/lib/data";
import { ShellClient } from "@/components/ShellClient";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getUserData();
  const isStaff = Boolean(profile?.is_treasurer || profile?.is_splits_manager);

  return (
    <ShellClient user={user} profile={profile} isStaff={isStaff}>
      {children}
    </ShellClient>
  );
}
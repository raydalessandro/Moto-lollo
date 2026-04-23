import { AppShell } from "@/components/AppShell";
import { DbProvider } from "@/mocks/DbProvider";

export default function Page() {
  return (
    <DbProvider>
      <AppShell />
    </DbProvider>
  );
}

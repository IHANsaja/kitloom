import type { Metadata } from "next";

import { AccountPanel } from "@/components/auth/AccountPanel";
import { Band } from "@/components/ui/Frame";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <Band as="div">
      <AccountPanel />
    </Band>
  );
}

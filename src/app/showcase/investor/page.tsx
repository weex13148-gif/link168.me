import ShowcaseGate from "@/components/showcase/ShowcaseGate";
import InvestorShowcase from "@/components/showcase/InvestorShowcase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "投资人尽调 | Link168 外部尽调",
  robots: { index: false, follow: false },
};

export default function InvestorPage() {
  return (
    <ShowcaseGate>
      <InvestorShowcase />
    </ShowcaseGate>
  );
}

import ShowcaseGate from "@/components/showcase/ShowcaseGate";
import GovernmentShowcase from "@/components/showcase/GovernmentShowcase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "政府与园区 | Link168 外部尽调",
  robots: { index: false, follow: false },
};

export default function GovernmentPage() {
  return (
    <ShowcaseGate>
      <GovernmentShowcase />
    </ShowcaseGate>
  );
}

import ShowcaseGate from "@/components/showcase/ShowcaseGate";
import ShowcaseModeSelector from "@/components/showcase/ShowcaseModeSelector";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase | Link168 外部尽调",
  robots: { index: false, follow: false },
};

export default function ShowcasePage() {
  return (
    <ShowcaseGate>
      <ShowcaseModeSelector />
    </ShowcaseGate>
  );
}

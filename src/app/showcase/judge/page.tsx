import ShowcaseGate from "@/components/showcase/ShowcaseGate";
import JudgeShowcase from "@/components/showcase/JudgeShowcase";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "评委专用 | Link168 外部尽调",
  robots: { index: false, follow: false },
};

export default function JudgePage() {
  return (
    <ShowcaseGate>
      <JudgeShowcase />
    </ShowcaseGate>
  );
}

import type { Metadata } from "next";
import { ForYouList } from "@/components/for-you-list";
import { TopicPreferences } from "@/components/topic-preferences";

export const metadata: Metadata = {
  title: "For You",
  description: "Previously visited publisher headlines chosen from your local topic preferences.",
};

export default function ForYouPage() {
  return (
    <>
      <section className="shell saved-page local-discovery-page">
        <span className="section-overline">A local discovery collection</span>
        <h1>For You</h1>
        <p>Revisit publisher headlines from previously loaded feeds. Nothing is uploaded, synchronized, or fetched from the provider on this page.</p>
        <ForYouList />
      </section>
      <TopicPreferences />
    </>
  );
}

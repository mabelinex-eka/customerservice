import { loadKB } from "@/lib/db";
import AnswerDesk from "@/components/AnswerDesk";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const kb = await loadKB();
    return <AnswerDesk kb={kb} />;
  } catch (e) {
    console.error("Failed to load knowledge base", e);
    return (
      <main className="wrap" style={{ paddingBlock: 40 }}>
        <div className="gap">The knowledge base couldn&apos;t be loaded. Refresh in a minute; if it keeps happening, tell your team lead.</div>
      </main>
    );
  }
}

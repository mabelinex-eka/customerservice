import { kb } from "@/lib/kb";
import AnswerDesk from "@/components/AnswerDesk";

export const dynamic = "force-static";

export default function Page() {
  return <AnswerDesk kb={kb} />;
}

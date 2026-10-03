import { WhiteboardPage } from "@/components/whiteboard/WhiteboardPage";

type Params = Promise<{ slug: string }>;

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;

  return <WhiteboardPage slug={slug} />;
}

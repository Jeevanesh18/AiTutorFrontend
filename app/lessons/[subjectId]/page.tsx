// /lessons/[subjectId]/page.tsx
import SubjectLevelsPage from "./SubjectLevelsPage";

interface Props {
  params: { subjectId: string };
}

export default async function SubjectLevelsPageServer({ params }: Props) {
  // If params is a Promise, await it
  const resolvedParams = await params; // <- key fix

  const subjectId = parseInt(resolvedParams.subjectId);

  return <SubjectLevelsPage subjectId={subjectId} />;
}

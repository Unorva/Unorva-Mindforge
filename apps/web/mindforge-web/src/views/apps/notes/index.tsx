import NotesApp from "src/components/apps/notes";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const Notes = () => {
  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="Notes app" />
      <NotesApp />
    </AppPage>
  );
};

export default Notes;

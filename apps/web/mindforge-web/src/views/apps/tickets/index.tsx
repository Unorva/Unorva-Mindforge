import TicketsApp from "src/components/apps/tickets";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const Tickets = () => {
  return (
    <AppPage className="gap-5 bg-transparent p-0">
      <AppPageHeader title="Tickets App" />
      <TicketsApp />
    </AppPage>
  );
};

export default Tickets;

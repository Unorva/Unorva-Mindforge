import CreateTicketForm from "src/components/apps/tickets/create-ticketform";
import { TicketProvider } from "src/context/ticket-context";
import { AppPage, AppPageHeader } from "@/components/shared/app-workspace";

const CreateTickets = () => {
  return (
    <TicketProvider>
      <AppPage className="gap-5 bg-transparent p-0">
        <AppPageHeader title="Tickets App" />
        <CreateTicketForm />
      </AppPage>
    </TicketProvider>
  );
};

export default CreateTickets;

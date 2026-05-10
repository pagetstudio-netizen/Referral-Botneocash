import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import AdminLayout from "@/components/layout/admin-layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import UserDetail from "@/pages/user-detail";
import Withdrawals from "@/pages/withdrawals";
import Channels from "@/pages/channels";
import Settings from "@/pages/settings";
import Broadcast from "@/pages/broadcast";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("neocash_token"));

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/users/:telegramId" component={() => <AdminLayout><UserDetail /></AdminLayout>} />
            <Route path="/users" component={() => <AdminLayout><Users /></AdminLayout>} />
            <Route path="/withdrawals" component={() => <AdminLayout><Withdrawals /></AdminLayout>} />
            <Route path="/channels" component={() => <AdminLayout><Channels /></AdminLayout>} />
            <Route path="/settings" component={() => <AdminLayout><Settings /></AdminLayout>} />
            <Route path="/broadcast" component={() => <AdminLayout><Broadcast /></AdminLayout>} />
            <Route path="/" component={() => <AdminLayout><Dashboard /></AdminLayout>} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

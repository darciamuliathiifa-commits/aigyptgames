import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Home from '@/pages/Home';
import Join from '@/pages/Join';
import Prompt from '@/pages/Prompt';
import Submit from '@/pages/Submit';
import Status from '@/pages/Status';
import Leaderboard from '@/pages/Leaderboard';
import Gallery from '@/pages/Gallery';
import Live from '@/pages/Live';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/join" component={Join} />
      <Route path="/prompt" component={Prompt} />
      <Route path="/submit" component={Submit} />
      <Route path="/status" component={Status} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/live" component={Live} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

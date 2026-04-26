import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppShell from "./components/AppShell";
import WardrobePage from "./pages/WardrobePage";
import CanvasPage from "./pages/CanvasPage";
import OutfitsPage from "./pages/OutfitsPage";
import StatsPage from "./pages/StatsPage";
import LoginPage from "./pages/LoginPage";
import DesignersPage from "./pages/DesignersPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={WardrobePage} />
      <Route path="/canvas" component={CanvasPage} />
      <Route path="/outfits" component={OutfitsPage} />
      <Route path="/designers" component={DesignersPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "DM Sans, sans-serif",
                fontSize: "0.875rem",
                background: "oklch(0.965 0.007 80)",
                border: "1px solid oklch(0.87 0.01 80)",
                color: "oklch(0.18 0.01 60)",
              },
            }}
          />
          <AppShell>
            <Router />
          </AppShell>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

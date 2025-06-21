import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate,
  Outlet,
  createRoutesFromElements,
  Route,
  createHashRouter
} from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import ViewProfile from "./pages/ViewProfile";
import SavedContacts from "./pages/SavedContacts";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/auth/AuthCallback";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import ChatPage from './pages/chat';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// Create routes configuration
const routes = createRoutesFromElements(
  <Route>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route element={<Layout><Outlet /></Layout>}>
      <Route path="/" element={<Home />} />
      <Route
        path="/search"
        element={
          <PrivateRoute>
            <Search />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile/:profileId"
        element={
          <PrivateRoute>
            <ViewProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <PrivateRoute>
            <SavedContacts />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Route>
);

// Use HashRouter for better compatibility with static hosting
const router = createHashRouter(routes, {
  // This ensures the router properly handles hash-based URLs
  basename: '/'
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import Calendar from "./pages/Calendar";
import Transactions from "./pages/Transactions";
import { setTokenGetter } from "./lib/api";
import "./App.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function AuthTokenProvider({ children }) {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
    // Once signed in, make sure any previously-failed queries get retried
    if (isSignedIn) {
      queryClient.invalidateQueries();
    }
  }, [getToken, isSignedIn]);
  return children;
}

function ProtectedLayout() {
  return (
    <>
      <SignedIn>
        <Layout />
      </SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  );
}

function App() {
  useEffect(() => {
    import("./lib/api").then(({ default: api }) => api.seed().catch(() => {}));
  }, []);

  return (
    <ClerkProvider publishableKey={clerkPubKey} afterSignInUrl="/app" afterSignUpUrl="/app">
      <QueryClientProvider client={queryClient}>
        <AuthTokenProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login/*" element={<Login />} />
              <Route path="/sign-up/*" element={<Login />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/sales" element={<Sales />} />
                <Route path="/app/customers" element={<Customers />} />
                <Route path="/app/customers/:id" element={<CustomerDetail />} />
                <Route path="/app/products" element={<Products />} />
                <Route path="/app/calendar" element={<Calendar />} />
                <Route path="/app/transactions" element={<Transactions />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-center" dir="rtl" />
        </AuthTokenProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;

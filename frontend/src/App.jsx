import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import api from "./lib/api";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function ProtectedRoute({ children }) {
  const loggedIn = localStorage.getItem("pinkas_logged_in") === "true";
  if (!loggedIn) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  useEffect(() => {
    api.seed().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/app/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/app/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/app/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/app/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
            <Route path="/app/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" dir="rtl" />
    </QueryClientProvider>
  );
}

export default App;

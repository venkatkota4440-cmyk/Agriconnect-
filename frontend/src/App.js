import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ProtectedRoute } from "@/components/layout/AppShell";

import Landing from "@/pages/Landing";
import { Login, Register } from "@/pages/Auth";
import { HowItWorks, About } from "@/pages/Static";
import Marketplace from "@/pages/Marketplace";
import ListingDetails from "@/pages/ListingDetails";
import { Farmers, Buyers } from "@/pages/Directory";
import UserProfile from "@/pages/UserProfile";
import MarketPrices from "@/pages/MarketPrices";
import Dashboard from "@/pages/Dashboard";
import MyStock from "@/pages/MyStock";
import Offers from "@/pages/Offers";
import OfferDetail from "@/pages/OfferDetail";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import Transactions from "@/pages/Transactions";
import Following from "@/pages/Following";
import SavedItems from "@/pages/SavedItems";
import Verification from "@/pages/Verification";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Messages from "@/pages/Messages";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/about" element={<About />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/listing/:id" element={<ListingDetails />} />
              <Route path="/farmers" element={<Farmers />} />
              <Route path="/buyers" element={<Buyers />} />
              <Route path="/markets" element={<MarketPrices />} />
              <Route path="/users/:id" element={<UserProfile />} />

              {/* Protected (AppShell) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/stock" element={<MyStock />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/offers/:id" element={<OfferDetail />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/contracts/:id" element={<ContractDetail />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/following" element={<Following />} />
                <Route path="/saved" element={<SavedItems />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<Messages />} />
                <Route path="/market-prices" element={<MarketPrices embedded />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Routes>
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </div>
  );
}

export default App;

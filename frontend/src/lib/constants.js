export const CATEGORIES = [
  "Vegetables", "Fruits", "Grains", "Pulses", "Spices",
  "Oilseeds", "Dairy", "Organic Produce", "Flowers", "Other",
];

export const CATEGORY_ICONS = {
  Vegetables: "carrot", Fruits: "apple", Grains: "wheat", Pulses: "bean",
  Spices: "flame", Oilseeds: "droplets", Dairy: "milk", "Organic Produce": "leaf",
  Flowers: "flower-2", Other: "package",
};

export const BUYER_TYPES = [
  "Retailer", "Wholesaler", "Trader", "Restaurant",
  "Food Processor", "Exporter", "Institutional Buyer",
];

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_low", label: "Lowest price" },
  { value: "price_high", label: "Highest price" },
  { value: "newest", label: "Newest" },
  { value: "nearest", label: "Nearest" },
  { value: "popular", label: "Most popular" },
];

export const GRADES = ["A", "B", "C"];
export const UNITS = ["kg", "quintal", "tonne", "litre", "dozen", "piece", "bag"];

export const DELIVERY_FLOW = ["preparing", "pickup_scheduled", "picked_up", "in_transit", "delivered", "completed"];
export const DELIVERY_LABELS = {
  preparing: "Preparing", pickup_scheduled: "Pickup Scheduled", picked_up: "Picked Up",
  in_transit: "In Transit", delivered: "Delivered", completed: "Completed",
};

export const NAV_PUBLIC = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/farmers", label: "Farmers" },
  { to: "/buyers", label: "Buyers" },
  { to: "/markets", label: "Markets" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
];

// UI dictionary used by the AI translation feature
export const I18N_BASE = {
  marketplace: "Marketplace", farmers: "Farmers", buyers: "Buyers", markets: "Markets",
  how_it_works: "How It Works", about: "About", sign_in: "Sign In", get_started: "Get Started",
  hero_title: "Connect Directly. Trade Smarter. Grow Together.",
  hero_sub: "AgriLink 360 connects farmers with verified buyers, transparent market prices, reliable logistics, and secure digital transactions.",
  explore_marketplace: "Explore Marketplace", join_as_farmer: "Join as a Farmer",
  search_placeholder: "Search crops, farmers, buyers, markets...",
  dashboard: "Dashboard", my_stock: "My Stock", offers: "Offers", contracts: "Contracts",
  transactions: "Transactions", following: "Following", saved: "Saved Items",
  verification: "Verification", notifications: "Notifications", settings: "Settings",
  messages: "Messages", make_offer: "Make Offer", view_details: "View Details",
  contact_farmer: "Contact Farmer", save: "Save", follow: "Follow", following_state: "Following",
  tagline: "Connecting Farmers. Empowering Markets.",
};

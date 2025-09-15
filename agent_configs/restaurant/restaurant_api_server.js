// Restaurant Industry Agent API Server
const express = require('express');
const app = express();
app.use(express.json());

// Mock database
const restaurants = {
  inventory: {
    tables: { "2-top": 10, "4-top": 8, "6-top": 4, "bar": 12 },
    reservations: [],
    waitlist: []
  },
  menu: {
    appetizers: [
      { id: "app1", name: "Oysters", price: 18, available: true, allergens: ["shellfish"] },
      { id: "app2", name: "Burrata", price: 16, available: true, allergens: ["dairy"] }
    ],
    entrees: [
      { id: "ent1", name: "Ribeye Steak", price: 48, available: true, allergens: [], pairings: ["cab-sauv", "malbec"] },
      { id: "ent2", name: "Salmon", price: 32, available: true, allergens: ["fish"], pairings: ["pinot-noir", "chardonnay"] }
    ]
  },
  wine: {
    inventory: [
      { id: "cab-sauv", name: "Caymus Cabernet", vintage: 2019, price: 120, stock: 12 },
      { id: "pinot-noir", name: "Domaine Romanee", vintage: 2020, price: 85, stock: 8 }
    ]
  }
};

// Reservation endpoints
app.post('/api/restaurant/availability', (req, res) => {
  const { date, time, party_size } = req.body;
  const available = Math.random() > 0.3;
  res.json({ available, alternatives: available ? [] : ["7:30 PM", "9:00 PM"] });
});

app.post('/api/restaurant/reservations', (req, res) => {
  const reservation = { ...req.body, id: Date.now(), status: "confirmed" };
  restaurants.inventory.reservations.push(reservation);
  res.json({ success: true, reservation });
});

// Order management
app.post('/api/restaurant/orders', (req, res) => {
  const order = { ...req.body, id: Date.now(), status: "submitted", estimated_time: 25 };
  res.json({ success: true, order });
});

// Menu availability
app.get('/api/restaurant/menu/availability', (req, res) => {
  res.json(restaurants.menu);
});

// Wine pairings
app.post('/api/restaurant/wine/pairings', (req, res) => {
  const { dish_id } = req.body;
  const pairings = restaurants.wine.inventory.filter(w =>
    restaurants.menu.entrees.find(e => e.id === dish_id)?.pairings?.includes(w.id)
  );
  res.json({ pairings });
});

// Billing
app.post('/api/restaurant/billing', (req, res) => {
  const { items } = req.body;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const tip_suggestions = [0.18, 0.20, 0.22].map(rate => ({
    percentage: rate * 100,
    amount: subtotal * rate
  }));
  res.json({ subtotal, tax, total: subtotal + tax, tip_suggestions });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Restaurant API Server running on port ${PORT}`);
});
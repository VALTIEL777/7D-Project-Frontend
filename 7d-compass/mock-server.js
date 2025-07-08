const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data for routes
const mockRoutes = {
  spotting: [
    {
      routeId: 1,
      routeCode: 'SPT-001',
      type: 'spotting',
      startDate: '2025-01-15',
      endDate: null,
      encodedPolyline: 'abc123',
      totalDistance: 25.5,
      totalDuration: 180,
      optimizedOrder: [1, 2, 3],
      optimizationMetadata: {
        optimizationDate: '2025-01-14',
        totalWaypoints: 3,
        originAddress: '2837 N Froid Street',
        destinationAddress: '456 Oak Ave'
      },
      createdAt: '2025-01-14T10:00:00Z',
      updatedAt: '2025-01-14T10:00:00Z',
      createdBy: 1,
      updatedBy: 1,
      tickets: [
        { ticketId: 1, ticketCode: 'TKT-001', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 150.00 },
        { ticketId: 2, ticketCode: 'TKT-002', address: '123 Main St', queue: 1, quantity: 1, amountToPay: 200.00 },
        { ticketId: 3, ticketCode: 'TKT-003', address: '456 Oak Ave', queue: 2, quantity: 1, amountToPay: 175.00 }
      ]
    }
  ],
  concrete: [
    {
      routeId: 2,
      routeCode: 'CON-001',
      type: 'concrete',
      startDate: '2025-01-16',
      endDate: null,
      encodedPolyline: 'def456',
      totalDistance: 30.2,
      totalDuration: 240,
      optimizedOrder: [1, 2, 3, 4],
      optimizationMetadata: {
        optimizationDate: '2025-01-15',
        totalWaypoints: 4,
        originAddress: '2837 N Froid Street',
        destinationAddress: '789 Pine Ln'
      },
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
      createdBy: 1,
      updatedBy: 1,
      tickets: [
        { ticketId: 4, ticketCode: 'TKT-004', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 300.00 },
        { ticketId: 5, ticketCode: 'TKT-005', address: '123 Main St', queue: 1, quantity: 1, amountToPay: 250.00 },
        { ticketId: 6, ticketCode: 'TKT-006', address: '456 Oak Ave', queue: 2, quantity: 1, amountToPay: 275.00 },
        { ticketId: 7, ticketCode: 'TKT-007', address: '789 Pine Ln', queue: 3, quantity: 1, amountToPay: 225.00 }
      ]
    }
  ],
  asphalt: [
    {
      routeId: 3,
      routeCode: 'ASP-001',
      type: 'asphalt',
      startDate: '2025-01-17',
      endDate: null,
      encodedPolyline: 'ghi789',
      totalDistance: 22.8,
      totalDuration: 160,
      optimizedOrder: [1, 2],
      optimizationMetadata: {
        optimizationDate: '2025-01-16',
        totalWaypoints: 2,
        originAddress: '2837 N Froid Street',
        destinationAddress: '101 Elm Rd'
      },
      createdAt: '2025-01-16T10:00:00Z',
      updatedAt: '2025-01-16T10:00:00Z',
      createdBy: 1,
      updatedBy: 1,
      tickets: [
        { ticketId: 8, ticketCode: 'TKT-008', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 180.00 },
        { ticketId: 9, ticketCode: 'TKT-009', address: '101 Elm Rd', queue: 1, quantity: 1, amountToPay: 220.00 }
      ]
    }
  ]
};

const mockReadyTickets = {
  spotting: [
    {
      ticketid: 1,
      ticketcode: 'TKT-001',
      contractnumber: 'CNT-001',
      amounttopay: 150.00,
      tickettype: 'spotting',
      daysoutstanding: 5,
      comment7d: 'Ready for processing',
      quantity: 1,
      address: '2837 N Froid Street',
      contractunitname: 'Unit A',
      incidentname: 'Pothole Repair',
      createdat: '2025-01-10T10:00:00Z',
      updatedat: '2025-01-10T10:00:00Z'
    },
    {
      ticketid: 2,
      ticketcode: 'TKT-002',
      contractnumber: 'CNT-002',
      amounttopay: 200.00,
      tickettype: 'spotting',
      daysoutstanding: 3,
      comment7d: 'Materials available',
      quantity: 1,
      address: '123 Main St',
      contractunitname: 'Unit B',
      incidentname: 'Crack Sealing',
      createdat: '2025-01-12T10:00:00Z',
      updatedat: '2025-01-12T10:00:00Z'
    }
  ],
  concrete: [
    {
      ticketid: 4,
      ticketcode: 'TKT-004',
      contractnumber: 'CNT-003',
      amounttopay: 300.00,
      tickettype: 'concrete',
      daysoutstanding: 7,
      comment7d: 'Ready for concrete pour',
      quantity: 1,
      address: '2837 N Froid Street',
      contractunitname: 'Unit C',
      incidentname: 'Sidewalk Repair',
      createdat: '2025-01-08T10:00:00Z',
      updatedat: '2025-01-08T10:00:00Z'
    }
  ],
  asphalt: [
    {
      ticketid: 8,
      ticketcode: 'TKT-008',
      contractnumber: 'CNT-004',
      amounttopay: 180.00,
      tickettype: 'asphalt',
      daysoutstanding: 2,
      comment7d: 'Ready for asphalt',
      quantity: 1,
      address: '2837 N Froid Street',
      contractunitname: 'Unit D',
      incidentname: 'Road Resurfacing',
      createdat: '2025-01-13T10:00:00Z',
      updatedat: '2025-01-13T10:00:00Z'
    }
  ]
};

// GET routes endpoints
app.get('/api/routes/spotting', (req, res) => {
  res.json({
    message: 'Spotting routes retrieved successfully',
    type: 'success',
    count: mockRoutes.spotting.length,
    routes: mockRoutes.spotting
  });
});

app.get('/api/routes/concrete', (req, res) => {
  res.json({
    message: 'Concrete routes retrieved successfully',
    type: 'success',
    count: mockRoutes.concrete.length,
    routes: mockRoutes.concrete
  });
});

app.get('/api/routes/asphalt', (req, res) => {
  res.json({
    message: 'Asphalt routes retrieved successfully',
    type: 'success',
    count: mockRoutes.asphalt.length,
    routes: mockRoutes.asphalt
  });
});

// GET ready tickets endpoints
app.get('/api/routes/tickets-ready/spotting', (req, res) => {
  res.json({
    message: 'Spot ready tickets retrieved successfully',
    type: 'success',
    count: mockReadyTickets.spotting.length,
    criteria: 'ready_for_spotting',
    tickets: mockReadyTickets.spotting
  });
});

app.get('/api/routes/tickets-ready/concrete', (req, res) => {
  res.json({
    message: 'Concrete ready tickets retrieved successfully',
    type: 'success',
    count: mockReadyTickets.concrete.length,
    criteria: 'ready_for_concrete',
    tickets: mockReadyTickets.concrete
  });
});

app.get('/api/routes/tickets-ready/asphalt', (req, res) => {
  res.json({
    message: 'Asphalt ready tickets retrieved successfully',
    type: 'success',
    count: mockReadyTickets.asphalt.length,
    criteria: 'ready_for_asphalt',
    tickets: mockReadyTickets.asphalt
  });
});

// POST route optimization endpoints
app.post('/api/routes/optimize/spotting', (req, res) => {
  const { startDate } = req.body;

  if (!startDate) {
    return res.status(400).json({
      message: 'Start date is required',
      type: 'error'
    });
  }

  // Simulate route optimization
  const newRoute = {
    routeId: Date.now(),
    routeCode: `SPT-${String(Date.now()).slice(-3)}`,
    type: 'spotting',
    startDate: startDate,
    endDate: null,
    encodedPolyline: 'new_encoded_polyline_' + Date.now(),
    totalDistance: Math.random() * 50 + 10,
    totalDuration: Math.random() * 300 + 120,
    optimizedOrder: [1, 2, 3],
    optimizationMetadata: {
      optimizationDate: new Date().toISOString(),
      totalWaypoints: 3,
      originAddress: '2837 N Froid Street',
      destinationAddress: '456 Oak Ave'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
    tickets: [
      { ticketId: Date.now(), ticketCode: 'TKT-NEW-1', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 150.00 },
      { ticketId: Date.now() + 1, ticketCode: 'TKT-NEW-2', address: '123 Main St', queue: 1, quantity: 1, amountToPay: 200.00 },
      { ticketId: Date.now() + 2, ticketCode: 'TKT-NEW-3', address: '456 Oak Ave', queue: 2, quantity: 1, amountToPay: 175.00 }
    ]
  };

  // Add to mock data
  mockRoutes.spotting.push(newRoute);

  res.json({
    message: 'Spotting route optimized successfully',
    type: 'success',
    route: newRoute
  });
});

app.post('/api/routes/optimize/concrete', (req, res) => {
  const { startDate } = req.body;

  if (!startDate) {
    return res.status(400).json({
      message: 'Start date is required',
      type: 'error'
    });
  }

  // Simulate route optimization
  const newRoute = {
    routeId: Date.now(),
    routeCode: `CON-${String(Date.now()).slice(-3)}`,
    type: 'concrete',
    startDate: startDate,
    endDate: null,
    encodedPolyline: 'new_encoded_polyline_' + Date.now(),
    totalDistance: Math.random() * 60 + 15,
    totalDuration: Math.random() * 400 + 180,
    optimizedOrder: [1, 2, 3, 4],
    optimizationMetadata: {
      optimizationDate: new Date().toISOString(),
      totalWaypoints: 4,
      originAddress: '2837 N Froid Street',
      destinationAddress: '789 Pine Ln'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
    tickets: [
      { ticketId: Date.now(), ticketCode: 'TKT-NEW-4', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 300.00 },
      { ticketId: Date.now() + 1, ticketCode: 'TKT-NEW-5', address: '123 Main St', queue: 1, quantity: 1, amountToPay: 250.00 },
      { ticketId: Date.now() + 2, ticketCode: 'TKT-NEW-6', address: '456 Oak Ave', queue: 2, quantity: 1, amountToPay: 275.00 },
      { ticketId: Date.now() + 3, ticketCode: 'TKT-NEW-7', address: '789 Pine Ln', queue: 3, quantity: 1, amountToPay: 225.00 }
    ]
  };

  // Add to mock data
  mockRoutes.concrete.push(newRoute);

  res.json({
    message: 'Concrete route optimized successfully',
    type: 'success',
    route: newRoute
  });
});

app.post('/api/routes/optimize/asphalt', (req, res) => {
  const { startDate } = req.body;

  if (!startDate) {
    return res.status(400).json({
      message: 'Start date is required',
      type: 'error'
    });
  }

  // Simulate route optimization
  const newRoute = {
    routeId: Date.now(),
    routeCode: `ASP-${String(Date.now()).slice(-3)}`,
    type: 'asphalt',
    startDate: startDate,
    endDate: null,
    encodedPolyline: 'new_encoded_polyline_' + Date.now(),
    totalDistance: Math.random() * 40 + 10,
    totalDuration: Math.random() * 250 + 120,
    optimizedOrder: [1, 2],
    optimizationMetadata: {
      optimizationDate: new Date().toISOString(),
      totalWaypoints: 2,
      originAddress: '2837 N Froid Street',
      destinationAddress: '101 Elm Rd'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 1,
    updatedBy: 1,
    tickets: [
      { ticketId: Date.now(), ticketCode: 'TKT-NEW-8', address: '2837 N Froid Street', queue: 0, quantity: 1, amountToPay: 180.00 },
      { ticketId: Date.now() + 1, ticketCode: 'TKT-NEW-9', address: '101 Elm Rd', queue: 1, quantity: 1, amountToPay: 220.00 }
    ]
  };

  // Add to mock data
  mockRoutes.asphalt.push(newRoute);

  res.json({
    message: 'Asphalt route optimized successfully',
    type: 'success',
    route: newRoute
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mock API server is running' });
});

app.listen(port, () => {
  console.log(`Mock API server running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/routes/spotting');
  console.log('  GET  /api/routes/concrete');
  console.log('  GET  /api/routes/asphalt');
  console.log('  GET  /api/routes/tickets-ready/spotting');
  console.log('  GET  /api/routes/tickets-ready/concrete');
  console.log('  GET  /api/routes/tickets-ready/asphalt');
  console.log('  POST /api/routes/optimize/spotting');
  console.log('  POST /api/routes/optimize/concrete');
  console.log('  POST /api/routes/optimize/asphalt');
  console.log('  GET  /api/health');
});

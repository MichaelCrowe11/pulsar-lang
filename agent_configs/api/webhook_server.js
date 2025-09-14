// Eleven Labs Agent Webhook Server
// Handles all webhook requests from agents

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Authentication middleware
const authenticateAgent = (req, res, next) => {
    const apiKey = req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey || apiKey !== process.env.DEALER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// ==================== DEALER LOGIC ENDPOINTS ====================

// Inventory Search
app.post('/api/inventory/search', authenticateAgent, async (req, res) => {
    const { make, model, year, max_price, min_price, body_style, fuel_type } = req.body;

    try {
        // Mock inventory data - replace with actual database query
        const inventory = [
            {
                vin: "1HGCM82633A123456",
                make: "Honda",
                model: "Accord",
                year: 2024,
                price: 28500,
                body_style: "sedan",
                fuel_type: "hybrid",
                color: "Silver",
                mileage: 10,
                status: "available",
                images: [
                    "https://inventory.dealer.com/honda-accord-1.jpg",
                    "https://inventory.dealer.com/honda-accord-2.jpg"
                ],
                features: [
                    "Apple CarPlay",
                    "Honda Sensing",
                    "Leather Seats",
                    "Sunroof"
                ]
            },
            {
                vin: "5YJ3E1EA5KF123789",
                make: "Tesla",
                model: "Model 3",
                year: 2024,
                price: 42000,
                body_style: "sedan",
                fuel_type: "electric",
                color: "Pearl White",
                mileage: 5,
                status: "available",
                range_miles: 330,
                images: [
                    "https://inventory.dealer.com/tesla-model3-1.jpg"
                ],
                features: [
                    "Autopilot",
                    "Premium Audio",
                    "Glass Roof"
                ]
            }
        ];

        // Filter based on search criteria
        let results = inventory;

        if (make) {
            results = results.filter(v => v.make.toLowerCase() === make.toLowerCase());
        }
        if (model) {
            results = results.filter(v => v.model.toLowerCase().includes(model.toLowerCase()));
        }
        if (year) {
            results = results.filter(v => v.year === year);
        }
        if (max_price) {
            results = results.filter(v => v.price <= max_price);
        }
        if (min_price) {
            results = results.filter(v => v.price >= min_price);
        }
        if (body_style) {
            results = results.filter(v => v.body_style === body_style);
        }
        if (fuel_type) {
            results = results.filter(v => v.fuel_type === fuel_type);
        }

        res.json({
            success: true,
            count: results.length,
            vehicles: results
        });

    } catch (error) {
        console.error('Inventory search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Schedule Test Drive
app.post('/api/appointments/schedule', authenticateAgent, async (req, res) => {
    const { customer_name, customer_phone, customer_email, vehicle_vin, preferred_date, preferred_time, notes } = req.body;

    try {
        // Generate appointment ID
        const appointmentId = uuidv4();

        // TODO: Save to database
        const appointment = {
            id: appointmentId,
            customer_name,
            customer_phone,
            customer_email,
            vehicle_vin,
            appointment_date: preferred_date,
            appointment_time: preferred_time,
            type: 'test_drive',
            status: 'confirmed',
            notes,
            created_at: new Date().toISOString()
        };

        // TODO: Send confirmation email/SMS

        res.json({
            success: true,
            appointment_id: appointmentId,
            confirmation_message: `Test drive scheduled for ${preferred_date} at ${preferred_time}`,
            appointment
        });

    } catch (error) {
        console.error('Appointment scheduling error:', error);
        res.status(500).json({ error: 'Failed to schedule appointment' });
    }
});

// Calculate Financing
app.post('/api/finance/calculate', authenticateAgent, async (req, res) => {
    const { vehicle_price, down_payment = 0, trade_in_value = 0, loan_term_months, credit_score = 'good', include_warranty = false } = req.body;

    try {
        // Interest rates based on credit score
        const interestRates = {
            excellent: 0.029,
            good: 0.045,
            fair: 0.069,
            poor: 0.125
        };

        const rate = interestRates[credit_score];
        const warrantyPrice = include_warranty ? 1500 : 0;

        // Calculate loan details
        const principal = vehicle_price - down_payment - trade_in_value + warrantyPrice;
        const monthlyRate = rate / 12;
        const numPayments = loan_term_months;

        // Monthly payment calculation
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                             (Math.pow(1 + monthlyRate, numPayments) - 1);

        const totalInterest = (monthlyPayment * numPayments) - principal;
        const totalCost = principal + totalInterest;

        res.json({
            success: true,
            financing_details: {
                vehicle_price,
                down_payment,
                trade_in_value,
                warranty_cost: warrantyPrice,
                loan_amount: principal,
                interest_rate: (rate * 100).toFixed(2) + '%',
                loan_term_months,
                monthly_payment: Math.round(monthlyPayment * 100) / 100,
                total_interest: Math.round(totalInterest * 100) / 100,
                total_cost: Math.round(totalCost * 100) / 100
            }
        });

    } catch (error) {
        console.error('Financing calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate financing' });
    }
});

// Trade-in Valuation
app.post('/api/tradein/evaluate', authenticateAgent, async (req, res) => {
    const { make, model, year, mileage, condition, vin } = req.body;

    try {
        // Mock valuation logic - replace with actual KBB/Black Book API
        const baseValues = {
            excellent: 1.0,
            good: 0.85,
            fair: 0.70,
            poor: 0.50
        };

        // Calculate depreciation
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        const depreciationRate = 0.15; // 15% per year
        const mileageDeduction = Math.max(0, (mileage - 12000) * 0.05); // $0.05 per mile over 12k/year

        // Base value calculation (mock)
        let baseValue = 30000; // Would come from pricing API
        baseValue *= Math.pow(1 - depreciationRate, age);
        baseValue *= baseValues[condition];
        baseValue -= mileageDeduction;

        const tradeInValue = Math.max(500, Math.round(baseValue)); // Minimum $500

        res.json({
            success: true,
            valuation: {
                make,
                model,
                year,
                mileage,
                condition,
                vin,
                trade_in_value: tradeInValue,
                retail_value: Math.round(tradeInValue * 1.2),
                valuation_date: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            }
        });

    } catch (error) {
        console.error('Trade-in valuation error:', error);
        res.status(500).json({ error: 'Failed to evaluate trade-in' });
    }
});

// ==================== RESEARCH AGENT ENDPOINTS ====================

// Data Analysis
app.post('/api/research/analyze', authenticateAgent, async (req, res) => {
    const { dataset, analysis_type, parameters } = req.body;

    try {
        // Mock analysis result
        const analysisId = uuidv4();

        const result = {
            analysis_id: analysisId,
            dataset,
            analysis_type,
            status: 'completed',
            results: {
                summary: "Analysis completed successfully",
                data_points: 1000,
                key_findings: [
                    "Significant correlation found",
                    "95% confidence interval established"
                ],
                visualization_url: `https://analytics.research.com/viz/${analysisId}`
            },
            completed_at: new Date().toISOString()
        };

        res.json({
            success: true,
            analysis: result
        });

    } catch (error) {
        console.error('Research analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// ==================== CRM INTEGRATION ====================

// Update CRM Lead
app.post('/api/crm/lead/update', authenticateAgent, async (req, res) => {
    const { lead_id, status, notes, next_action, vehicle_interest } = req.body;

    try {
        // TODO: Update actual CRM (Salesforce, HubSpot, etc.)

        const updatedLead = {
            lead_id: lead_id || uuidv4(),
            status,
            notes,
            next_action,
            vehicle_interest,
            last_updated: new Date().toISOString(),
            updated_by: 'eleven_labs_agent'
        };

        res.json({
            success: true,
            lead: updatedLead
        });

    } catch (error) {
        console.error('CRM update error:', error);
        res.status(500).json({ error: 'Failed to update CRM' });
    }
});

// ==================== AGENT ORCHESTRATION ====================

// Agent Transfer
app.post('/api/agents/transfer', authenticateAgent, async (req, res) => {
    const { source_agent_id, target_agent_id, conversation_context, customer_intent, priority_level } = req.body;

    try {
        const transferId = uuidv4();

        // Store transfer context in Redis/Database
        const transfer = {
            id: transferId,
            source_agent_id,
            target_agent_id,
            conversation_context,
            customer_intent,
            priority_level,
            created_at: new Date().toISOString()
        };

        // TODO: Notify target agent

        res.json({
            success: true,
            transfer_id: transferId,
            message: `Transfer initiated to ${target_agent_id}`
        });

    } catch (error) {
        console.error('Agent transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});

// Conversation State
app.put('/api/conversation/state', authenticateAgent, async (req, res) => {
    const { conversation_id, customer_profile, interaction_history, current_needs } = req.body;

    try {
        // Store in Redis or database
        const state = {
            conversation_id: conversation_id || uuidv4(),
            customer_profile,
            interaction_history,
            current_needs,
            updated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            state
        });

    } catch (error) {
        console.error('State update error:', error);
        res.status(500).json({ error: 'Failed to update state' });
    }
});

// ==================== MONITORING & ANALYTICS ====================

// Log Event
app.post('/api/analytics/event', async (req, res) => {
    const { event_type, agent_id, data } = req.body;

    try {
        const event = {
            id: uuidv4(),
            event_type,
            agent_id,
            data,
            timestamp: new Date().toISOString()
        };

        // TODO: Send to analytics platform (Mixpanel, Amplitude, etc.)
        console.log('Analytics Event:', event);

        res.json({ success: true, event_id: event.id });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log(`🔑 Using API Key: ${process.env.DEALER_API_KEY ? 'Configured' : 'Not Set'}`);
});
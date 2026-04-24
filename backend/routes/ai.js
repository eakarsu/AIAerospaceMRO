const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../db');

// Helper: check if API key is valid
function hasValidApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  return key && key !== 'your_openrouter_api_key_here';
}

// Helper: return mock response when no valid API key
function mockResponse(endpoint) {
  return `AI analysis requires a valid OpenRouter API key. Please add your key to the .env file.\n\n` +
    `This is a mock response for the "${endpoint}" endpoint. Configure OPENROUTER_API_KEY in your .env file to receive real AI-powered analysis.`;
}

// Helper: call OpenRouter AI
async function callAI(systemPrompt, userPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'AeroMRO Pro'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI API error');
  return data.choices[0].message.content;
}

// POST /repair-cost-estimate
router.post('/repair-cost-estimate', async (req, res) => {
  try {
    const { aircraft_type, maintenance_type, parts_needed, labor_hours, description } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('repair-cost-estimate'), request: req.body });
    }

    const systemPrompt = 'You are an aerospace MRO cost estimation expert. Provide detailed repair cost breakdowns including labor, parts, overhead, and total estimates. Format your response with clear sections: Summary, Labor Cost Breakdown, Parts Cost Breakdown, Additional Costs, Total Estimate, and Cost-Saving Recommendations. Use dollar amounts and be specific.';

    const userPrompt = `Please provide a repair cost estimate for the following:\n\n` +
      `Aircraft Type: ${aircraft_type || 'Not specified'}\n` +
      `Maintenance Type: ${maintenance_type || 'Not specified'}\n` +
      `Parts Needed: ${parts_needed || 'Not specified'}\n` +
      `Estimated Labor Hours: ${labor_hours || 'Not specified'}\n` +
      `Description: ${description || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Repair cost estimate error:', error);
    res.status(500).json({ error: 'Failed to generate repair cost estimate', details: error.message });
  }
});

// POST /downtime-prediction
router.post('/downtime-prediction', async (req, res) => {
  try {
    const { aircraft_type, aircraft_reg, maintenance_type, current_condition, flight_hours, last_maintenance_date } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('downtime-prediction'), request: req.body });
    }

    const systemPrompt = 'You are an aerospace maintenance downtime prediction specialist. Analyze the aircraft data and predict maintenance downtime. Format your response with: Current Assessment, Predicted Downtime Duration, Risk Factors, Scheduling Recommendations, and Impact Analysis. Be specific with time estimates.';

    const userPrompt = `Please predict maintenance downtime for the following aircraft:\n\n` +
      `Aircraft Type: ${aircraft_type || 'Not specified'}\n` +
      `Aircraft Registration: ${aircraft_reg || 'Not specified'}\n` +
      `Maintenance Type: ${maintenance_type || 'Not specified'}\n` +
      `Current Condition: ${current_condition || 'Not specified'}\n` +
      `Flight Hours: ${flight_hours || 'Not specified'}\n` +
      `Last Maintenance Date: ${last_maintenance_date || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Downtime prediction error:', error);
    res.status(500).json({ error: 'Failed to generate downtime prediction', details: error.message });
  }
});

// POST /compliance-check
router.post('/compliance-check', async (req, res) => {
  try {
    const { directive_number, aircraft_type, description, current_status } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('compliance-check'), request: req.body });
    }

    const systemPrompt = 'You are an FAA compliance expert for aerospace MRO operations. Analyze the compliance directive and provide detailed guidance. Format your response with: Directive Analysis, Compliance Requirements, Action Items, Timeline Recommendations, Documentation Requirements, and Risk Assessment if non-compliant.';

    const userPrompt = `Please analyze the following compliance directive:\n\n` +
      `Directive Number: ${directive_number || 'Not specified'}\n` +
      `Aircraft Type: ${aircraft_type || 'Not specified'}\n` +
      `Description: ${description || 'Not specified'}\n` +
      `Current Status: ${current_status || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to generate compliance check', details: error.message });
  }
});

// POST /parts-analysis
router.post('/parts-analysis', async (req, res) => {
  try {
    const { part_number, part_name, cycle_count, max_cycles, flight_hours, condition_status, installed_date } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('parts-analysis'), request: req.body });
    }

    const systemPrompt = 'You are an aerospace parts lifecycle analyst. Analyze the part data and provide lifecycle recommendations. Format your response with: Current Part Status, Remaining Useful Life, Risk Assessment, Maintenance Recommendations, Replacement Planning, and Cost Optimization Suggestions.';

    const userPrompt = `Please analyze the following aircraft part:\n\n` +
      `Part Number: ${part_number || 'Not specified'}\n` +
      `Part Name: ${part_name || 'Not specified'}\n` +
      `Cycle Count: ${cycle_count || 'Not specified'}\n` +
      `Max Cycles: ${max_cycles || 'Not specified'}\n` +
      `Flight Hours: ${flight_hours || 'Not specified'}\n` +
      `Condition Status: ${condition_status || 'Not specified'}\n` +
      `Installed Date: ${installed_date || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Parts analysis error:', error);
    res.status(500).json({ error: 'Failed to generate parts analysis', details: error.message });
  }
});

// POST /safety-analysis
router.post('/safety-analysis', async (req, res) => {
  try {
    const { incident_title, description, severity, aircraft_type, location } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('safety-analysis'), request: req.body });
    }

    const systemPrompt = 'You are an aviation safety analyst expert. Analyze the safety incident and provide detailed findings. Format your response with: Incident Classification, Root Cause Analysis, Contributing Factors, Safety Recommendations, Preventive Measures, and Regulatory Reporting Requirements.';

    const userPrompt = `Please analyze the following safety incident:\n\n` +
      `Incident Title: ${incident_title || 'Not specified'}\n` +
      `Description: ${description || 'Not specified'}\n` +
      `Severity: ${severity || 'Not specified'}\n` +
      `Aircraft Type: ${aircraft_type || 'Not specified'}\n` +
      `Location: ${location || 'Not specified'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Safety analysis error:', error);
    res.status(500).json({ error: 'Failed to generate safety analysis', details: error.message });
  }
});

// POST /fleet-optimization
router.post('/fleet-optimization', async (req, res) => {
  try {
    const { fleet_data } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('fleet-optimization'), request: req.body });
    }

    const systemPrompt = 'You are a fleet management optimization specialist for airlines and MRO organizations. Analyze the fleet data and provide optimization recommendations. Format your response with: Fleet Health Overview, Critical Issues, Maintenance Priority Queue, Resource Allocation Recommendations, Cost Optimization Opportunities, and 90-Day Action Plan.';

    const userPrompt = `Please analyze the following fleet data and provide optimization recommendations:\n\n${fleet_data || 'No fleet data provided'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Fleet optimization error:', error);
    res.status(500).json({ error: 'Failed to generate fleet optimization', details: error.message });
  }
});

// POST /mel-analysis
router.post('/mel-analysis', async (req, res) => {
  try {
    const { mel_number, title, category, aircraft_reg, description, operational_restriction, deferral_date, expiry_date } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('mel-analysis'), request: req.body });
    }

    const systemPrompt = 'You are an aviation MEL (Minimum Equipment List) specialist and dispatch reliability expert. Analyze the MEL deferral and provide detailed guidance. Format your response with: MEL Category Assessment, Operational Impact Analysis, Risk Evaluation, Rectification Priority, Dispatch Considerations, and Maintenance Planning Recommendations.';

    const userPrompt = `Analyze this MEL deferral item:\n\nMEL Number: ${mel_number || 'N/A'}\nTitle: ${title || 'N/A'}\nCategory: ${category || 'N/A'}\nAircraft: ${aircraft_reg || 'N/A'}\nDescription: ${description || 'N/A'}\nOperational Restriction: ${operational_restriction || 'None'}\nDeferral Date: ${deferral_date || 'N/A'}\nExpiry Date: ${expiry_date || 'N/A'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('MEL analysis error:', error);
    res.status(500).json({ error: 'Failed to generate MEL analysis', details: error.message });
  }
});

// POST /document-review
router.post('/document-review', async (req, res) => {
  try {
    const { document_number, title, document_type, revision, description, aircraft_type } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('document-review'), request: req.body });
    }

    const systemPrompt = 'You are an aerospace technical documentation specialist and quality auditor. Review the document information and provide analysis. Format your response with: Document Assessment, Compliance Status, Revision History Analysis, Distribution Recommendations, Gap Analysis, and Action Items for Next Review.';

    const userPrompt = `Review this aerospace document:\n\nDocument Number: ${document_number || 'N/A'}\nTitle: ${title || 'N/A'}\nType: ${document_type || 'N/A'}\nRevision: ${revision || 'N/A'}\nAircraft Type: ${aircraft_type || 'N/A'}\nDescription: ${description || 'N/A'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Document review error:', error);
    res.status(500).json({ error: 'Failed to generate document review', details: error.message });
  }
});

// POST /purchase-analysis
router.post('/purchase-analysis', async (req, res) => {
  try {
    const { po_number, vendor_name, total_amount, items_description, priority, aircraft_reg } = req.body;

    if (!hasValidApiKey()) {
      return res.json({ analysis: mockResponse('purchase-analysis'), request: req.body });
    }

    const systemPrompt = 'You are an aerospace procurement and supply chain specialist. Analyze the purchase order and provide insights. Format your response with: Order Assessment, Cost Analysis, Vendor Evaluation, Lead Time Considerations, Alternative Sourcing Options, and Budget Impact Summary.';

    const userPrompt = `Analyze this purchase order:\n\nPO Number: ${po_number || 'N/A'}\nVendor: ${vendor_name || 'N/A'}\nTotal Amount: $${total_amount || 0}\nItems: ${items_description || 'N/A'}\nPriority: ${priority || 'N/A'}\nAircraft: ${aircraft_reg || 'N/A'}`;

    const aiResponse = await callAI(systemPrompt, userPrompt);
    res.json({ analysis: aiResponse, request: req.body });
  } catch (error) {
    console.error('Purchase analysis error:', error);
    res.status(500).json({ error: 'Failed to generate purchase analysis', details: error.message });
  }
});

module.exports = router;

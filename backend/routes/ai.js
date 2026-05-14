const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../db');
const auth = require('../middleware/auth');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiter: 20 AI requests per user per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    return (req.user && req.user.id) ? `user_${req.user.id}` : ipKeyGenerator(req);
  },
  message: { error: 'Too many AI requests. Limit is 20 per hour.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply auth + rate limiter to all AI routes
router.use(auth);
router.use(aiRateLimiter);

// Ensure ai_results table exists (called once at startup)
async function ensureAiResultsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(100) NOT NULL,
        user_id INTEGER,
        request_payload JSONB,
        raw_response TEXT,
        parsed_result JSONB,
        model VARCHAR(100),
        tokens_used INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error('Failed to create ai_results table:', e.message);
  }
}
ensureAiResultsTable();

// Helper: robust JSON parser that handles markdown code fences
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

// Helper: check if API key is valid
function hasValidApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  return key && key !== 'your_openrouter_api_key_here';
}

// Helper: call OpenRouter AI with upgraded model
async function callAI(systemPrompt, userPrompt) {
  if (!hasValidApiKey()) {
    const err = new Error('AI service unavailable');
    err.code = 'AI_DISABLED';
    throw err;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3001',
      'X-Title': 'AeroMRO Pro'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'AI API error');
  return {
    content: data.choices[0].message.content,
    tokens: data.usage ? (data.usage.total_tokens || null) : null
  };
}

// Helper: persist AI result to database
async function persistAIResult(endpoint, userId, requestPayload, rawResponse, parsedResult, model, tokens) {
  try {
    await pool.query(
      `INSERT INTO ai_results (endpoint, user_id, request_payload, raw_response, parsed_result, model, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        endpoint,
        userId || null,
        JSON.stringify(requestPayload),
        rawResponse,
        parsedResult ? JSON.stringify(parsedResult) : null,
        model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        tokens || null
      ]
    );
  } catch (e) {
    console.error('Failed to persist AI result:', e.message);
  }
}

// Helper: handle validation errors
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// Shared validators
const aircraftTypeValidator = body('aircraft_type')
  .optional()
  .isLength({ max: 50 }).withMessage('aircraft_type max 50 chars')
  .matches(/^[a-zA-Z0-9\s\-\.\/]*$/).withMessage('aircraft_type must be alphanumeric');

const descriptionValidator = body('description')
  .optional()
  .isLength({ max: 2000 }).withMessage('description max 2000 chars');

const maintenanceTypeValidator = body('maintenance_type')
  .optional()
  .isIn(['inspection', 'repair', 'overhaul', 'modification', 'Inspection', 'Repair', 'Overhaul', 'Modification',
         'Scheduled Maintenance', 'Unscheduled', 'Annual Inspection', 'Major Repair'])
  .withMessage('maintenance_type must be a valid type');

// POST /repair-cost-estimate
router.post('/repair-cost-estimate',
  [aircraftTypeValidator, descriptionValidator, maintenanceTypeValidator],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { aircraft_type, maintenance_type, parts_needed, labor_hours, description } = req.body;

      const systemPrompt = `You are an aerospace MRO cost estimation expert. Analyze the repair details and return a structured JSON response with the following fields:
{
  "summary": "brief overview string",
  "labor_cost_breakdown": { "rate_per_hour": number, "estimated_hours": number, "total_labor": number },
  "parts_cost_breakdown": [{ "part": string, "unit_cost": number, "quantity": number, "total": number }],
  "additional_costs": [{ "item": string, "cost": number }],
  "total_estimate": number,
  "cost_saving_recommendations": [string],
  "confidence_level": "low|medium|high",
  "notes": string
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Estimate repair cost for:
Aircraft Type: ${aircraft_type || 'Not specified'}
Maintenance Type: ${maintenance_type || 'Not specified'}
Parts Needed: ${parts_needed || 'Not specified'}
Estimated Labor Hours: ${labor_hours || 'Not specified'}
Description: ${description || 'Not specified'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { summary: aiResult.content };

      await persistAIResult('/ai/repair-cost-estimate', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Repair cost estimate error:', error);
      res.status(500).json({ error: 'Failed to generate repair cost estimate', details: error.message });
    }
  }
);

// POST /downtime-prediction
router.post('/downtime-prediction',
  [aircraftTypeValidator, descriptionValidator, maintenanceTypeValidator],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { aircraft_type, aircraft_reg, maintenance_type, current_condition, flight_hours, last_maintenance_date } = req.body;

      const systemPrompt = `You are an aerospace maintenance downtime prediction specialist. Return structured JSON:
{
  "current_assessment": string,
  "predicted_downtime_hours": number,
  "predicted_downtime_days": number,
  "confidence_pct": number,
  "risk_factors": [string],
  "scheduling_recommendations": [string],
  "impact_analysis": string,
  "aog_risk_pct": number
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Predict maintenance downtime:
Aircraft Type: ${aircraft_type || 'Not specified'}
Aircraft Reg: ${aircraft_reg || 'Not specified'}
Maintenance Type: ${maintenance_type || 'Not specified'}
Current Condition: ${current_condition || 'Not specified'}
Flight Hours: ${flight_hours || 'Not specified'}
Last Maintenance Date: ${last_maintenance_date || 'Not specified'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { summary: aiResult.content };

      await persistAIResult('/ai/downtime-prediction', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Downtime prediction error:', error);
      res.status(500).json({ error: 'Failed to generate downtime prediction', details: error.message });
    }
  }
);

// POST /compliance-check
router.post('/compliance-check',
  [
    aircraftTypeValidator,
    descriptionValidator,
    body('directive_number').optional().isLength({ max: 50 }).withMessage('directive_number max 50 chars')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { directive_number, aircraft_type, description, current_status } = req.body;

      const systemPrompt = `You are an FAA/EASA compliance expert for aerospace MRO operations. Return structured JSON:
{
  "directive_analysis": string,
  "compliance_requirements": [string],
  "action_items": [{ "action": string, "priority": "critical|high|medium|low", "due_within_days": number }],
  "timeline_recommendations": string,
  "documentation_requirements": [string],
  "risk_if_non_compliant": string,
  "estimated_compliance_hours": number
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze compliance directive:
Directive Number: ${directive_number || 'Not specified'}
Aircraft Type: ${aircraft_type || 'Not specified'}
Description: ${description || 'Not specified'}
Current Status: ${current_status || 'Not specified'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { directive_analysis: aiResult.content };

      await persistAIResult('/ai/compliance-check', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Compliance check error:', error);
      res.status(500).json({ error: 'Failed to generate compliance check', details: error.message });
    }
  }
);

// POST /parts-analysis
router.post('/parts-analysis',
  [
    descriptionValidator,
    body('part_number').optional().isLength({ max: 50 }).withMessage('part_number max 50 chars'),
    body('cycle_count').optional().isNumeric().withMessage('cycle_count must be numeric'),
    body('max_cycles').optional().isNumeric().withMessage('max_cycles must be numeric'),
    body('flight_hours').optional().isNumeric().withMessage('flight_hours must be numeric')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { part_number, part_name, cycle_count, max_cycles, flight_hours, condition_status, installed_date } = req.body;

      const systemPrompt = `You are an aerospace parts lifecycle analyst. Return structured JSON:
{
  "current_status": string,
  "remaining_useful_life_pct": number,
  "estimated_remaining_cycles": number,
  "risk_assessment": "critical|high|medium|low",
  "risk_factors": [string],
  "maintenance_recommendations": [string],
  "replacement_planning": { "recommended_action": string, "urgency": string, "estimated_cost_usd": number },
  "cost_optimization_suggestions": [string]
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze aircraft part:
Part Number: ${part_number || 'Not specified'}
Part Name: ${part_name || 'Not specified'}
Cycle Count: ${cycle_count || 'Not specified'}
Max Cycles: ${max_cycles || 'Not specified'}
Flight Hours: ${flight_hours || 'Not specified'}
Condition Status: ${condition_status || 'Not specified'}
Installed Date: ${installed_date || 'Not specified'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { current_status: aiResult.content };

      await persistAIResult('/ai/parts-analysis', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Parts analysis error:', error);
      res.status(500).json({ error: 'Failed to generate parts analysis', details: error.message });
    }
  }
);

// POST /safety-analysis
router.post('/safety-analysis',
  [
    aircraftTypeValidator,
    descriptionValidator,
    body('severity').optional().isIn(['Minor', 'Moderate', 'Major', 'Critical', 'Catastrophic']).withMessage('Invalid severity level')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { incident_title, description, severity, aircraft_type, location } = req.body;

      const systemPrompt = `You are an aviation safety analyst expert. Return structured JSON:
{
  "incident_classification": string,
  "root_cause_analysis": string,
  "contributing_factors": [string],
  "safety_recommendations": [{ "recommendation": string, "priority": "immediate|short_term|long_term" }],
  "preventive_measures": [string],
  "regulatory_reporting_requirements": [string],
  "risk_score": number,
  "corrective_actions": [{ "action": string, "owner": string, "due_days": number }]
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze safety incident:
Incident Title: ${incident_title || 'Not specified'}
Description: ${description || 'Not specified'}
Severity: ${severity || 'Not specified'}
Aircraft Type: ${aircraft_type || 'Not specified'}
Location: ${location || 'Not specified'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { incident_classification: aiResult.content };

      await persistAIResult('/ai/safety-analysis', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Safety analysis error:', error);
      res.status(500).json({ error: 'Failed to generate safety analysis', details: error.message });
    }
  }
);

// POST /fleet-optimization
router.post('/fleet-optimization',
  [body('fleet_data').notEmpty().withMessage('fleet_data is required').isLength({ max: 5000 }).withMessage('fleet_data max 5000 chars')],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { fleet_data } = req.body;

      const systemPrompt = `You are a fleet management optimization specialist for airlines and MRO organizations. Return structured JSON:
{
  "fleet_health_overview": string,
  "critical_issues": [{ "aircraft": string, "issue": string, "urgency": "immediate|this_week|this_month" }],
  "maintenance_priority_queue": [{ "rank": number, "aircraft": string, "action": string, "reason": string }],
  "resource_allocation_recommendations": [string],
  "cost_optimization_opportunities": [{ "opportunity": string, "estimated_savings_usd": number }],
  "action_plan_90_days": [{ "week": number, "actions": [string] }],
  "overall_fleet_score": number
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze fleet data and provide optimization:\n\n${fleet_data}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { fleet_health_overview: aiResult.content };

      await persistAIResult('/ai/fleet-optimization', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Fleet optimization error:', error);
      res.status(500).json({ error: 'Failed to generate fleet optimization', details: error.message });
    }
  }
);

// POST /mel-analysis
router.post('/mel-analysis',
  [
    aircraftTypeValidator,
    descriptionValidator,
    body('category').optional().isIn(['A', 'B', 'C', 'D']).withMessage('MEL category must be A, B, C, or D')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { mel_number, title, category, aircraft_reg, description, operational_restriction, deferral_date, expiry_date } = req.body;

      const systemPrompt = `You are an aviation MEL specialist and dispatch reliability expert. Return structured JSON:
{
  "mel_category_assessment": string,
  "category_interval_days": number,
  "operational_impact_analysis": string,
  "risk_evaluation": "acceptable|elevated|high|unacceptable",
  "rectification_priority": "immediate|48h|72h|extended",
  "dispatch_considerations": [string],
  "maintenance_planning_recommendations": [string],
  "days_until_expiry": number,
  "expiry_urgent": boolean
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze MEL deferral:
MEL Number: ${mel_number || 'N/A'}
Title: ${title || 'N/A'}
Category: ${category || 'N/A'}
Aircraft: ${aircraft_reg || 'N/A'}
Description: ${description || 'N/A'}
Operational Restriction: ${operational_restriction || 'None'}
Deferral Date: ${deferral_date || 'N/A'}
Expiry Date: ${expiry_date || 'N/A'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { mel_category_assessment: aiResult.content };

      await persistAIResult('/ai/mel-analysis', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('MEL analysis error:', error);
      res.status(500).json({ error: 'Failed to generate MEL analysis', details: error.message });
    }
  }
);

// POST /document-review
router.post('/document-review',
  [
    aircraftTypeValidator,
    descriptionValidator,
    body('document_number').optional().isLength({ max: 50 }).withMessage('document_number max 50 chars')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { document_number, title, document_type, revision, description, aircraft_type } = req.body;

      const systemPrompt = `You are an aerospace technical documentation specialist and quality auditor. Return structured JSON:
{
  "document_assessment": string,
  "compliance_status": "compliant|non_compliant|review_needed",
  "revision_analysis": string,
  "distribution_recommendations": [string],
  "gap_analysis": [{ "gap": string, "severity": "critical|major|minor" }],
  "action_items_next_review": [{ "action": string, "due_months": number }],
  "overall_quality_score": number
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Review aerospace document:
Document Number: ${document_number || 'N/A'}
Title: ${title || 'N/A'}
Type: ${document_type || 'N/A'}
Revision: ${revision || 'N/A'}
Aircraft Type: ${aircraft_type || 'N/A'}
Description: ${description || 'N/A'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { document_assessment: aiResult.content };

      await persistAIResult('/ai/document-review', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Document review error:', error);
      res.status(500).json({ error: 'Failed to generate document review', details: error.message });
    }
  }
);

// POST /purchase-analysis
router.post('/purchase-analysis',
  [
    body('po_number').optional().isLength({ max: 50 }).withMessage('po_number max 50 chars'),
    body('vendor_name').optional().isLength({ max: 100 }).withMessage('vendor_name max 100 chars'),
    body('total_amount').optional().isNumeric().withMessage('total_amount must be numeric'),
    body('items_description').optional().isLength({ max: 2000 }).withMessage('items_description max 2000 chars')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { po_number, vendor_name, total_amount, items_description, priority, aircraft_reg } = req.body;

      const systemPrompt = `You are an aerospace procurement and supply chain specialist. Return structured JSON:
{
  "order_assessment": string,
  "cost_analysis": { "value_rating": "excellent|good|fair|poor", "market_comparison": string },
  "vendor_evaluation": { "reliability_score": number, "lead_time_concern": boolean, "notes": string },
  "lead_time_considerations": [string],
  "alternative_sourcing_options": [{ "option": string, "estimated_saving_pct": number }],
  "budget_impact_summary": string,
  "approval_recommendation": "approve|approve_with_conditions|reject",
  "approval_conditions": [string]
}
Return ONLY valid JSON, no markdown fences.`;

      const userPrompt = `Analyze purchase order:
PO Number: ${po_number || 'N/A'}
Vendor: ${vendor_name || 'N/A'}
Total Amount: $${total_amount || 0}
Items: ${items_description || 'N/A'}
Priority: ${priority || 'N/A'}
Aircraft: ${aircraft_reg || 'N/A'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { order_assessment: aiResult.content };

      await persistAIResult('/ai/purchase-analysis', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Purchase analysis error:', error);
      res.status(500).json({ error: 'Failed to generate purchase analysis', details: error.message });
    }
  }
);

// POST /predict-maintenance
router.post('/predict-maintenance',
  [
    body('aircraft_id').notEmpty().withMessage('aircraft_id is required').isLength({ max: 20 }).withMessage('aircraft_id max 20 chars'),
    body('lookahead_days').optional().isInt({ min: 1, max: 365 }).withMessage('lookahead_days must be 1-365')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { aircraft_id, lookahead_days = 90 } = req.body;

      await pool.query(`
        CREATE TABLE IF NOT EXISTS maintenance_predictions (
          id SERIAL PRIMARY KEY,
          aircraft_id TEXT NOT NULL,
          lookahead_days INT NOT NULL DEFAULT 90,
          predicted_maintenance_windows JSONB,
          parts_likely_to_fail JSONB,
          estimated_labor_cost NUMERIC,
          estimated_parts_cost NUMERIC,
          ai_analysis TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      const historyResult = await pool.query(
        `SELECT * FROM aircraft_maintenance WHERE aircraft_reg = $1 ORDER BY scheduled_date DESC LIMIT 20`,
        [aircraft_id]
      );

      let flightHoursInfo = 'Not available';
      try {
        const fleetResult = await pool.query(
          `SELECT * FROM fleet_health WHERE aircraft_reg = $1 LIMIT 1`,
          [aircraft_id]
        );
        if (fleetResult.rows.length > 0) {
          const f = fleetResult.rows[0];
          flightHoursInfo = `Total flight hours: ${f.total_flight_hours}, cycles: ${f.total_cycles}, health score: ${f.health_score}`;
        }
      } catch (e) { /* ignore */ }

      const history = historyResult.rows;
      const historyText = history.length > 0
        ? history.map(r =>
            `- Type: ${r.maintenance_type}, Date: ${r.scheduled_date}, Status: ${r.status}, ` +
            `Hours: ${r.estimated_hours || 'N/A'}, Priority: ${r.priority}, Description: ${r.description || 'N/A'}`
          ).join('\n')
        : 'No maintenance history found for this aircraft.';

      const systemPrompt = `You are an aerospace MRO downtime prediction specialist. Analyze maintenance history and return ONLY valid JSON (no markdown fences):
{
  "predicted_maintenance_windows": [{ "date": "YYYY-MM-DD", "type": string, "probability": number, "priority": "Critical|High|Medium|Low" }],
  "parts_likely_to_fail": [{ "part": string, "probability": number, "recommended_action": string }],
  "estimated_labor_cost": number,
  "estimated_parts_cost": number,
  "aog_risk_percentage": number,
  "summary": string,
  "preventive_actions": [string]
}`;

      const userPrompt = `Aircraft ID/Registration: ${aircraft_id}
Lookahead Period: ${lookahead_days} days
Fleet Health Data: ${flightHoursInfo}

Maintenance History (last 20 records):
${historyText}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsedPrediction = parseAIJson(aiResult.content) || { summary: aiResult.content };

      const saveResult = await pool.query(
        `INSERT INTO maintenance_predictions
         (aircraft_id, lookahead_days, predicted_maintenance_windows, parts_likely_to_fail,
          estimated_labor_cost, estimated_parts_cost, ai_analysis)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          aircraft_id,
          lookahead_days,
          JSON.stringify(parsedPrediction.predicted_maintenance_windows || []),
          JSON.stringify(parsedPrediction.parts_likely_to_fail || []),
          parsedPrediction.estimated_labor_cost || null,
          parsedPrediction.estimated_parts_cost || null,
          aiResult.content
        ]
      );

      await persistAIResult('/ai/predict-maintenance', req.user?.id, req.body, aiResult.content, parsedPrediction, null, aiResult.tokens);

      res.json({
        prediction: saveResult.rows[0],
        analysis: parsedPrediction,
        aircraft_id,
        maintenance_records_analyzed: history.length
      });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Predict maintenance error:', error);
      res.status(500).json({ error: 'Failed to generate maintenance prediction', details: error.message });
    }
  }
);

// POST /match-technician
router.post('/match-technician',
  [body('work_order_id').notEmpty().withMessage('work_order_id is required').isInt({ min: 1 }).withMessage('work_order_id must be a positive integer')],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { work_order_id } = req.body;

      const woResult = await pool.query('SELECT * FROM work_orders WHERE id = $1', [work_order_id]);
      if (woResult.rows.length === 0) {
        return res.status(404).json({ error: 'Work order not found' });
      }
      const workOrder = woResult.rows[0];

      const techResult = await pool.query(
        `SELECT id, name, specialization, license_type, certifications, rating, status, total_experience_years
         FROM technicians WHERE status = 'Active' ORDER BY rating DESC, total_experience_years DESC`
      );
      const technicians = techResult.rows;

      const techList = technicians.map(t =>
        `ID: ${t.id}, Name: ${t.name}, Specialization: ${t.specialization}, License: ${t.license_type}, ` +
        `Certs: ${Array.isArray(t.certifications) ? t.certifications.join(', ') : t.certifications || 'None'}, ` +
        `Rating: ${t.rating}, Experience: ${t.total_experience_years || 'N/A'} years`
      ).join('\n');

      const systemPrompt = `You are an aerospace MRO workforce management expert. Return ONLY valid JSON (no markdown fences):
{
  "recommended_technician_id": number,
  "recommended_technician_name": string,
  "match_score": number,
  "reasoning": string,
  "key_qualifications": [string],
  "alternative_technicians": [{ "id": number, "name": string, "match_score": number, "reasoning": string }]
}`;

      const userPrompt = `Work Order:
ID: ${workOrder.id}, Title: ${workOrder.title}, Aircraft: ${workOrder.aircraft_reg}
Maintenance Type: ${workOrder.maintenance_type}, Priority: ${workOrder.priority}
Description: ${workOrder.description || 'N/A'}, Est. Hours: ${workOrder.estimated_hours || 'N/A'}

Available Active Technicians:
${techList || 'No active technicians found'}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsedMatch = parseAIJson(aiResult.content) || { reasoning: aiResult.content };

      await persistAIResult('/ai/match-technician', req.user?.id, req.body, aiResult.content, parsedMatch, null, aiResult.tokens);

      res.json({
        work_order: workOrder,
        match: parsedMatch,
        technicians_evaluated: technicians.length
      });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Match technician error:', error);
      res.status(500).json({ error: 'Failed to match technician', details: error.message });
    }
  }
);

// POST /anomaly-detect – NEW: sensor telemetry anomaly detection
router.post('/anomaly-detect',
  [
    body('aircraft_reg').notEmpty().withMessage('aircraft_reg is required').isLength({ max: 20 }),
    body('sensor_readings').notEmpty().withMessage('sensor_readings is required')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { aircraft_reg, sensor_readings, system_type } = req.body;

      const systemPrompt = `You are an aerospace engine and systems health monitoring expert specializing in anomaly detection. Return ONLY valid JSON (no markdown fences):
{
  "anomaly_detected": boolean,
  "severity": "none|low|medium|high|critical",
  "affected_system": string,
  "anomalies": [{ "parameter": string, "observed_value": string, "expected_range": string, "deviation_pct": number, "concern": string }],
  "recommended_action": string,
  "aog_risk": boolean,
  "maintenance_urgency": "none|routine|urgent|immediate",
  "confidence_pct": number,
  "notes": string
}`;

      const userPrompt = `Aircraft: ${aircraft_reg}
System Type: ${system_type || 'General'}
Sensor Readings:
${typeof sensor_readings === 'string' ? sensor_readings : JSON.stringify(sensor_readings, null, 2)}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { anomaly_detected: false, notes: aiResult.content };

      await persistAIResult('/ai/anomaly-detect', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, aircraft_reg });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Anomaly detect error:', error);
      res.status(500).json({ error: 'Failed to run anomaly detection', details: error.message });
    }
  }
);

// POST /optimize-shifts – NEW: AI shift coverage optimizer
router.post('/optimize-shifts',
  [
    body('start_date').notEmpty().withMessage('start_date is required').isISO8601().withMessage('start_date must be a valid date'),
    body('end_date').notEmpty().withMessage('end_date is required').isISO8601().withMessage('end_date must be a valid date')
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { start_date, end_date } = req.body;

      // Fetch upcoming work orders
      const woResult = await pool.query(
        `SELECT id, title, aircraft_reg, maintenance_type, priority, estimated_hours, assigned_to, start_date, target_completion
         FROM work_orders
         WHERE status NOT IN ('Completed', 'Cancelled')
           AND (start_date BETWEEN $1 AND $2 OR target_completion BETWEEN $1 AND $2 OR start_date IS NULL)
         ORDER BY priority DESC, start_date ASC
         LIMIT 30`,
        [start_date, end_date]
      );

      // Fetch scheduled shifts
      let shiftsResult = { rows: [] };
      try {
        shiftsResult = await pool.query(
          `SELECT * FROM shift_scheduling WHERE shift_date BETWEEN $1 AND $2 ORDER BY shift_date, shift_start`,
          [start_date, end_date]
        );
      } catch (e) { /* table may differ */ }

      const workOrdersText = woResult.rows.map(wo =>
        `WO#${wo.id}: ${wo.title} | Aircraft: ${wo.aircraft_reg} | Type: ${wo.maintenance_type} | Priority: ${wo.priority} | Est Hours: ${wo.estimated_hours || 'N/A'}`
      ).join('\n') || 'No upcoming work orders';

      const shiftsText = shiftsResult.rows.map(s =>
        `${s.shift_date}: ${s.technician_name || s.employee_name || 'Unknown'} | ${s.shift_type || s.shift_name || 'Shift'} | ${s.shift_start}-${s.shift_end}`
      ).join('\n') || 'No shifts scheduled';

      const systemPrompt = `You are an aerospace MRO shift and workforce optimization specialist. Return ONLY valid JSON (no markdown fences):
{
  "coverage_gaps": [{ "date": string, "gap_description": string, "affected_work_orders": [string], "severity": "critical|high|medium|low" }],
  "recommended_shift_adjustments": [{ "action": string, "date": string, "reason": string, "priority": "high|medium|low" }],
  "overall_coverage_score": number,
  "staffing_adequacy": "adequate|understaffed|overstaffed",
  "key_risks": [string],
  "optimization_summary": string
}`;

      const userPrompt = `Analyze shift coverage for period ${start_date} to ${end_date}:

Upcoming Work Orders:
${workOrdersText}

Current Shift Schedule:
${shiftsText}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { optimization_summary: aiResult.content };

      await persistAIResult('/ai/optimize-shifts', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);

      res.json({ analysis: parsed, raw: aiResult.content, period: { start_date, end_date } });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED' });
      }
      console.error('Optimize shifts error:', error);
      res.status(500).json({ error: 'Failed to optimize shifts', details: error.message });
    }
  }
);

// POST /training-path – AI training path / upskilling recommendation for technicians
// PRODUCT-DECISION: Use simple skill-gap signal — recent assignment categories from work_orders
// joined to technicians, plus optional `target_role` & `current_skills` in body. No external skill matrix.
// Required env: OPENROUTER_API_KEY (returns 503 if missing).
router.post('/training-path',
  [
    body('technician_id').optional().isInt(),
    body('target_role').optional().isLength({ max: 200 }),
    body('current_skills').optional().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { technician_id, target_role, current_skills } = req.body;
      let techRow = null;
      let recentWorkText = 'No recent work history available';
      if (technician_id) {
        try {
          const t = await pool.query('SELECT * FROM technicians WHERE id=$1', [technician_id]);
          techRow = t.rows[0] || null;
        } catch (e) { /* ignore */ }
        try {
          const wo = await pool.query(
            `SELECT id, title, maintenance_type, aircraft_reg, status FROM work_orders WHERE assigned_to=$1 ORDER BY id DESC LIMIT 15`,
            [technician_id]
          );
          if (wo.rows.length) {
            recentWorkText = wo.rows.map(r => `WO#${r.id}: ${r.title} | ${r.maintenance_type} | ${r.aircraft_reg} | ${r.status}`).join('\n');
          }
        } catch (e) { /* ignore */ }
      }

      const systemPrompt = `You are an aerospace MRO workforce development specialist. Recommend a personalized training / upskilling path. Return ONLY valid JSON (no markdown fences):
{
  "summary": string,
  "current_level": "junior|mid|senior|expert",
  "skill_gaps": [{ "skill": string, "current_proficiency": "none|basic|intermediate|advanced", "target_proficiency": "intermediate|advanced|expert", "priority": "high|medium|low" }],
  "recommended_courses": [{ "name": string, "provider": string, "duration_hours": number, "rationale": string, "sequence_order": number }],
  "recommended_certifications": [{ "name": string, "issuing_body": string, "value": "high|medium|low" }],
  "estimated_completion_months": number,
  "milestones": [{ "month": number, "achievement": string }],
  "risks": [string]
}`;
      const userPrompt = `Build a training path for technician.
Technician: ${techRow ? JSON.stringify({ id: techRow.id, name: techRow.name, level: techRow.level || techRow.role, certifications: techRow.certifications, specializations: techRow.specializations }) : 'Not specified'}
Target Role: ${target_role || 'Not specified — infer from current trajectory'}
Self-reported Current Skills: ${current_skills || 'Not specified'}

Recent Work Orders Assigned:
${recentWorkText}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { summary: aiResult.content };
      await persistAIResult('/ai/training-path', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);
      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED', missing: 'OPENROUTER_API_KEY' });
      }
      console.error('Training path error:', error);
      res.status(500).json({ error: 'Failed to generate training path', details: error.message });
    }
  }
);

// POST /fleet-reallocation – AI cross-fleet asset reallocation advisor (additive only — no solver)
// PRODUCT-DECISION: This is advisory only (LLM-recommended reallocation moves), NOT a heavy
// optimization solver. Pulls from `work_orders` + `technicians` + (best-effort) inventory tables.
router.post('/fleet-reallocation',
  [
    body('priority_threshold').optional().isIn(['low','medium','high','critical','Low','Medium','High','Critical']),
    body('horizon_days').optional().isInt({ min: 1, max: 90 })
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;
    try {
      const { priority_threshold, horizon_days } = req.body;
      const horizon = horizon_days || 14;

      let woText = '';
      try {
        const wo = await pool.query(
          `SELECT id, title, aircraft_reg, maintenance_type, priority, status, estimated_hours, assigned_to
           FROM work_orders WHERE status NOT IN ('Completed','Cancelled') ORDER BY priority DESC, id DESC LIMIT 25`
        );
        woText = wo.rows.map(r => `WO#${r.id}: ${r.title} | ${r.aircraft_reg} | ${r.maintenance_type} | priority=${r.priority} | hours=${r.estimated_hours} | tech=${r.assigned_to}`).join('\n') || 'None';
      } catch (e) { woText = 'work_orders table unavailable'; }

      let techText = '';
      try {
        const t = await pool.query(`SELECT id, name, level, specializations, certifications FROM technicians LIMIT 25`);
        techText = t.rows.map(r => `Tech#${r.id}: ${r.name} | level=${r.level} | spec=${r.specializations} | cert=${r.certifications}`).join('\n') || 'None';
      } catch (e) { techText = 'technicians table unavailable'; }

      let invText = '';
      try {
        const inv = await pool.query(`SELECT part_number, description, quantity_on_hand, location FROM inventory ORDER BY quantity_on_hand DESC LIMIT 20`);
        invText = inv.rows.map(r => `${r.part_number}: ${r.description} | qty=${r.quantity_on_hand} | loc=${r.location}`).join('\n') || 'None';
      } catch (e) { invText = 'inventory table unavailable'; }

      const systemPrompt = `You are an aerospace MRO cross-fleet asset reallocation advisor. Recommend technician/parts/hangar moves to balance workload across fleet. Return ONLY valid JSON (no markdown fences):
{
  "summary": string,
  "moves": [{ "asset_type": "technician|part|hangar_slot", "asset_id": string, "from": string, "to": string, "reason": string, "priority": "high|medium|low", "expected_benefit": string }],
  "bottlenecks": [{ "location": string, "issue": string, "severity": "high|medium|low" }],
  "expected_throughput_gain_pct": number,
  "risks": [string],
  "horizon_days": number
}`;
      const userPrompt = `Recommend cross-fleet reallocation.
Priority Threshold: ${priority_threshold || 'all'}
Horizon (days): ${horizon}

Open Work Orders:
${woText}

Technicians:
${techText}

Inventory Snapshot:
${invText}`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      const parsed = parseAIJson(aiResult.content) || { summary: aiResult.content };
      await persistAIResult('/ai/fleet-reallocation', req.user?.id, req.body, aiResult.content, parsed, null, aiResult.tokens);
      res.json({ analysis: parsed, raw: aiResult.content, request: req.body });
    } catch (error) {
      if (error.code === 'AI_DISABLED') {
        return res.status(503).json({ error: 'AI service unavailable', code: 'AI_DISABLED', missing: 'OPENROUTER_API_KEY' });
      }
      console.error('Fleet reallocation error:', error);
      res.status(500).json({ error: 'Failed to generate reallocation plan', details: error.message });
    }
  }
);

// GET /history – retrieve past AI results for current user
router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const endpoint = req.query.endpoint || null;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (endpoint) {
      whereClause += ` AND endpoint = $${paramIdx++}`;
      params.push(endpoint);
    }

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM ai_results ${whereClause}`, params);
    const total = countResult.rows[0].total;

    params.push(limit);
    params.push(offset);
    const result = await pool.query(
      `SELECT id, endpoint, user_id, parsed_result, model, tokens_used, created_at FROM ai_results ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    res.json({
      records: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('AI history error:', error);
    res.status(500).json({ error: 'Failed to fetch AI history', details: error.message });
  }
});

module.exports = router;

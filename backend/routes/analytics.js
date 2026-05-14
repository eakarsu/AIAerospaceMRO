const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const pool = require('../db');
const auth = require('../middleware/auth');

// Apply auth to all analytics routes
router.use(auth);

// Robust JSON parser
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

// Helper: call OpenRouter AI with upgraded model
async function callAI(systemPrompt, userPrompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === 'your_openrouter_api_key_here') {
    const err = new Error('AI service unavailable');
    err.code = 'AI_DISABLED';
    throw err;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
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

// Helper: persist AI result
async function persistAIResult(endpoint, userId, requestPayload, rawResponse, parsedResult, tokens) {
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
        process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        tokens || null
      ]
    );
  } catch (e) {
    // ai_results table may not be created yet; non-fatal
    console.error('Failed to persist AI result:', e.message);
  }
}

// GET /component-reliability
router.get('/component-reliability', async (req, res) => {
  try {
    const aggregateResult = await pool.query(`
      SELECT
        maintenance_type AS component_type,
        COUNT(*) AS total_events,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed_events,
        COUNT(*) FILTER (WHERE priority = 'Critical' OR priority = 'High') AS failure_count,
        ROUND(AVG(estimated_hours)::numeric, 2) AS avg_estimated_hours,
        MIN(scheduled_date) AS first_event,
        MAX(scheduled_date) AS last_event
      FROM aircraft_maintenance
      GROUP BY maintenance_type
      ORDER BY failure_count DESC, total_events DESC
    `);

    let costData = [];
    try {
      const costResult = await pool.query(`
        SELECT
          maintenance_type AS component_type,
          ROUND(AVG(labor_cost + COALESCE(parts_cost, 0))::numeric, 2) AS avg_cost_per_event,
          ROUND(SUM(labor_cost + COALESCE(parts_cost, 0))::numeric, 2) AS total_cost
        FROM work_orders
        WHERE labor_cost IS NOT NULL
        GROUP BY maintenance_type
      `);
      costData = costResult.rows;
    } catch (e) {}

    const components = aggregateResult.rows;
    const costMap = {};
    costData.forEach(c => { costMap[c.component_type] = c; });
    const enrichedComponents = components.map(c => ({
      ...c,
      avg_cost_per_event: costMap[c.component_type]?.avg_cost_per_event || null,
      total_cost: costMap[c.component_type]?.total_cost || null
    }));

    const componentText = enrichedComponents.map(c =>
      `Component Type: ${c.component_type}, Total Events: ${c.total_events}, ` +
      `Failure Count (High/Critical): ${c.failure_count}, Avg Hours: ${c.avg_estimated_hours || 'N/A'}, ` +
      `Avg Cost/Event: ${c.avg_cost_per_event ? '$' + c.avg_cost_per_event : 'N/A'}, ` +
      `Total Cost: ${c.total_cost ? '$' + c.total_cost : 'N/A'}`
    ).join('\n');

    let reliabilityRisks = null;
    let rawAiAnalysis = null;

    try {
      const systemPrompt = `You are an aerospace MRO reliability engineering expert. Analyze component maintenance data and return ONLY valid JSON (no markdown fences):
{
  "top_3_risks": [{ "component_type": string, "risk_level": "critical|high|medium", "failure_probability_pct": number, "primary_risk_factor": string, "recommended_action": string }],
  "overall_fleet_reliability_score": number,
  "key_findings": [string],
  "cost_impact_summary": string,
  "improvement_priorities": [string]
}`;

      const userPrompt = `Analyze component reliability data:
${componentText || 'No component data available'}

Identify top 3 highest-risk components with actionable recommendations.`;

      const aiResult = await callAI(systemPrompt, userPrompt);
      rawAiAnalysis = aiResult.content;
      reliabilityRisks = parseAIJson(aiResult.content) || { summary: aiResult.content };

      await persistAIResult('/analytics/component-reliability', req.user?.id, { componentText }, rawAiAnalysis, reliabilityRisks, aiResult.tokens);
    } catch (aiError) {
      if (aiError.code !== 'AI_DISABLED') {
        console.error('AI analysis error for component reliability:', aiError);
      }
    }

    res.json({
      components: enrichedComponents,
      ai_reliability_analysis: reliabilityRisks,
      ai_available: reliabilityRisks !== null,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Component reliability error:', error);
    res.status(500).json({ error: 'Failed to generate component reliability scorecard', details: error.message });
  }
});

// GET /fleet-summary – overall fleet analytics with AI insights
router.get('/fleet-summary', async (req, res) => {
  try {
    const fleetStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_aircraft,
        ROUND(AVG(health_score)::numeric, 1) AS avg_health_score,
        COUNT(*) FILTER (WHERE health_score < 50)::int AS critical_aircraft,
        COUNT(*) FILTER (WHERE health_score BETWEEN 50 AND 70)::int AS warning_aircraft,
        COUNT(*) FILTER (WHERE health_score > 70)::int AS healthy_aircraft,
        COALESCE(SUM(total_flight_hours), 0)::numeric AS total_fleet_hours
      FROM fleet_health
    `);

    const woStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total_work_orders,
        COUNT(*) FILTER (WHERE status = 'Open')::int AS open_wo,
        COUNT(*) FILTER (WHERE priority = 'AOG' OR priority = 'Critical')::int AS critical_wo,
        COALESCE(SUM(labor_cost + COALESCE(parts_cost, 0)), 0)::numeric AS total_maintenance_cost
      FROM work_orders
    `);

    const complianceStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status != 'Completed' AND due_date < NOW())::int AS overdue
      FROM compliance_records
    `);

    res.json({
      fleet: fleetStats.rows[0],
      work_orders: woStats.rows[0],
      compliance: complianceStats.rows[0],
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fleet summary error:', error);
    res.status(500).json({ error: 'Failed to fetch fleet summary', details: error.message });
  }
});

// GET /aog-alerts – aircraft with critical health scores or AOG work orders
router.get('/aog-alerts', async (req, res) => {
  try {
    const criticalFleet = await pool.query(
      `SELECT * FROM fleet_health WHERE health_score < 50 ORDER BY health_score ASC`
    );
    const aogWorkOrders = await pool.query(
      `SELECT * FROM work_orders WHERE priority = 'AOG' AND status NOT IN ('Completed', 'Cancelled') ORDER BY created_at DESC`
    );
    const criticalCompliance = await pool.query(
      `SELECT * FROM compliance_records WHERE status != 'Completed' AND due_date < NOW() ORDER BY due_date ASC LIMIT 10`
    );
    const expiringMEL = await pool.query(
      `SELECT * FROM mel_items WHERE expiry_date IS NOT NULL AND expiry_date < NOW() + INTERVAL '7 days' AND status != 'Rectified' ORDER BY expiry_date ASC LIMIT 10`
    ).catch(() => ({ rows: [] }));

    res.json({
      critical_aircraft: criticalFleet.rows,
      aog_work_orders: aogWorkOrders.rows,
      overdue_compliance: criticalCompliance.rows,
      expiring_mel: expiringMEL.rows,
      total_alerts: criticalFleet.rowCount + aogWorkOrders.rowCount + criticalCompliance.rowCount + expiringMEL.rows.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('AOG alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch AOG alerts', details: error.message });
  }
});

module.exports = router;

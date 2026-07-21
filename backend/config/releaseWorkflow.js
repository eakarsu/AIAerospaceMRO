'use strict';

module.exports = {
  table: 'mro_release_workflows',
  initialStatus: 'intake',
  statuses: ['intake', 'work_planned', 'inspection_complete', 'release_pending', 'released', 'grounded'],
  editableStatuses: ['intake', 'work_planned', 'inspection_complete'],
  transitions: {
    intake: ['work_planned', 'grounded'], work_planned: ['inspection_complete', 'grounded'],
    inspection_complete: ['work_planned', 'release_pending', 'grounded'],
    release_pending: ['inspection_complete', 'released', 'grounded'], released: ['grounded'], grounded: ['work_planned'],
  },
  approvalStatuses: ['released'],
  approverRoles: ['release_authority', 'quality_manager', 'admin'],
  evidenceRoles: ['integration', 'inspector', 'quality_manager', 'release_authority', 'admin'],
  syncRoles: ['integration', 'admin'],
  rolesByStatus: { released: ['release_authority', 'admin'] },
  requiredFields: ['assetId', 'configurationVersion', 'utilizationSnapshot', 'workOrderReference', 'inspectionFinding'],
  requiredEvidence: ['approved_manual', 'asset_configuration', 'part_traceability', 'inspection_record'],
  deterministicChecks: [
    { code: 'OPEN_FINDINGS_ZERO', test: (p) => Number.isInteger(p.openFindings) && p.openFindings === 0 },
    { code: 'PARTS_TRACEABLE', test: (p) => p.partsTraceable === true },
    { code: 'MODEL_ADVISORY_ONLY', test: (p) => p.modelOutputTrusted !== true },
  ],
  providers: ['mro_erp', 'technical_publications', 'parts_traceability', 'sensor_feed'],
  providerEnv: {
    mro_erp: 'MRO_ERP_API_URL', technical_publications: 'TECH_PUBS_API_URL',
    parts_traceability: 'PARTS_TRACE_API_URL', sensor_feed: 'SENSOR_FEED_API_URL',
  },
};

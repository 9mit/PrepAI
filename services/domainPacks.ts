export interface DomainPack {
  id: string;
  label: string;
  plannerHints: string;
  scoringFocus: string;
  followUpStrategy: string;
  rubricBullets: string[];
}

export const DOMAIN_PACKS: DomainPack[] = [
  {
    id: 'consulting',
    label: 'Consulting',
    plannerHints: 'Case structure, MECE, market sizing, recommendation clarity, client communication.',
    scoringFocus: 'Structured thinking, hypothesis-driven approach, quantified recommendations.',
    followUpStrategy: 'Probe framework choice, assumptions, and sensitivity to changed inputs.',
    rubricBullets: ['Clear structure', 'Logical math', 'Actionable recommendation', 'Client-ready communication'],
  },
  {
    id: 'sales',
    label: 'Sales',
    plannerHints: 'Discovery, objection handling, pipeline, closing, stakeholder mapping.',
    scoringFocus: 'Customer empathy, commercial judgment, outcome ownership.',
    followUpStrategy: 'Ask for specific deal examples, metrics, and recovery from losses.',
    rubricBullets: ['Discovery quality', 'Objection handling', 'Metrics', 'Relationship building'],
  },
  {
    id: 'operations',
    label: 'Operations',
    plannerHints: 'Process design, throughput, bottlenecks, KPIs, continuous improvement.',
    scoringFocus: 'Operational rigor, root-cause analysis, scalable processes.',
    followUpStrategy: 'Dig into metrics, trade-offs, and cross-team coordination.',
    rubricBullets: ['Process clarity', 'KPI literacy', 'Root cause', 'Scalability'],
  },
  {
    id: 'supply_chain',
    label: 'Supply Chain',
    plannerHints: 'Sourcing, inventory, logistics, risk, demand planning.',
    scoringFocus: 'End-to-end visibility, risk mitigation, cost vs service trade-offs.',
    followUpStrategy: 'Challenge with disruption scenarios and inventory policy choices.',
    rubricBullets: ['End-to-end view', 'Risk planning', 'Cost/service balance', 'Vendor management'],
  },
  {
    id: 'data_analytics',
    label: 'Data Analytics',
    plannerHints: 'Metrics definition, experimentation, storytelling with data, SQL/BI fluency.',
    scoringFocus: 'Analytical rigor, actionable insights, stakeholder communication.',
    followUpStrategy: 'Ask how they chose metrics, validated data, and drove decisions.',
    rubricBullets: ['Metric design', 'Insight quality', 'Validation', 'Decision impact'],
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity',
    plannerHints: 'Threat models, controls, incident response, zero trust, compliance.',
    scoringFocus: 'Risk prioritization, practical controls, clear incident narrative.',
    followUpStrategy: 'Probe detection, containment, lessons learned, and residual risk.',
    rubricBullets: ['Threat modeling', 'Controls', 'Incident response', 'Risk communication'],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    plannerHints: 'Architecture, cost, reliability, migration, IaC, multi-region.',
    scoringFocus: 'Architecture trade-offs, reliability, cost awareness.',
    followUpStrategy: 'Challenge failure modes, cost spikes, and operational ownership.',
    rubricBullets: ['Architecture', 'Reliability', 'Cost', 'Ops ownership'],
  },
  {
    id: 'uiux',
    label: 'UI/UX',
    plannerHints: 'User research, flows, usability, design systems, accessibility.',
    scoringFocus: 'User-centered reasoning, trade-offs, measurable UX outcomes.',
    followUpStrategy: 'Ask for research methods, iteration cycles, and success metrics.',
    rubricBullets: ['Research', 'Usability', 'Accessibility', 'Outcome metrics'],
  },
  {
    id: 'devops',
    label: 'DevOps',
    plannerHints: 'CI/CD, observability, SRE, deployments, incident culture.',
    scoringFocus: 'Delivery speed with safety, automation, postmortems.',
    followUpStrategy: 'Probe incident stories, tooling choices, and toil reduction.',
    rubricBullets: ['CI/CD', 'Observability', 'Incident culture', 'Automation'],
  },
  {
    id: 'aiml',
    label: 'AI/ML',
    plannerHints: 'Problem framing, data quality, model evaluation, MLOps, ethics.',
    scoringFocus: 'Business-aligned ML, evaluation rigor, production readiness.',
    followUpStrategy: 'Ask about metrics, bias, drift, and failure cases.',
    rubricBullets: ['Problem framing', 'Evaluation', 'Production ML', 'Ethics/bias'],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    plannerHints: 'Patient outcomes, compliance, workflows, clinical stakeholders.',
    scoringFocus: 'Safety, privacy, cross-functional delivery in regulated settings.',
    followUpStrategy: 'Probe compliance constraints and impact on patients/clinicians.',
    rubricBullets: ['Patient impact', 'Compliance', 'Workflow fit', 'Stakeholder alignment'],
  },
  {
    id: 'legal',
    label: 'Legal',
    plannerHints: 'Issue spotting, risk advice, negotiation, clear counsel to business.',
    scoringFocus: 'Analytic precision, practical risk framing, communication.',
    followUpStrategy: 'Challenge with conflicting business pressures and ambiguity.',
    rubricBullets: ['Issue spotting', 'Risk framing', 'Clarity', 'Business partnership'],
  },
  {
    id: 'government',
    label: 'Government',
    plannerHints: 'Policy, public accountability, procurement, multi-stakeholder delivery.',
    scoringFocus: 'Public value, process integrity, stakeholder management.',
    followUpStrategy: 'Ask about constraints, transparency, and trade-offs under scrutiny.',
    rubricBullets: ['Public value', 'Accountability', 'Process', 'Stakeholders'],
  },
  {
    id: 'founder',
    label: 'Startup Founder',
    plannerHints: 'Vision, GTM, fundraising narrative, hiring, prioritization under scarcity.',
    scoringFocus: 'Ownership, learning velocity, prioritization, resilience.',
    followUpStrategy: 'Probe pivots, resource constraints, and hard people decisions.',
    rubricBullets: ['Vision', 'Prioritization', 'Learning speed', 'People decisions'],
  },
  {
    id: 'customer_success',
    label: 'Customer Success',
    plannerHints: 'Onboarding, retention, expansion, health scores, escalation.',
    scoringFocus: 'Customer outcomes, retention levers, cross-functional advocacy.',
    followUpStrategy: 'Ask for churn saves, expansion stories, and early-warning signals.',
    rubricBullets: ['Retention', 'Expansion', 'Health signals', 'Advocacy'],
  },
];

/** Map legacy interview field ids to a default domain pack. */
export const FIELD_TO_PACK: Record<string, string> = {
  technology: 'cloud',
  business: 'consulting',
  finance: 'consulting',
  marketing: 'sales',
  hr: 'customer_success',
  other: 'operations',
};

export function getDomainPack(id: string | undefined | null): DomainPack | undefined {
  if (!id) return undefined;
  return DOMAIN_PACKS.find((p) => p.id === id);
}

export function buildDomainPackPromptBlock(pack: DomainPack | undefined): string {
  if (!pack) return '';
  return `DOMAIN PACK (${pack.label}):
Planner: ${pack.plannerHints}
Scoring focus: ${pack.scoringFocus}
Follow-up strategy: ${pack.followUpStrategy}
Rubric: ${pack.rubricBullets.join('; ')}`;
}

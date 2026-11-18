import { DebateTemplate, DebateTemplateId } from '@/types';

export const DEBATE_TEMPLATES: Record<DebateTemplateId, DebateTemplate> = {
  opportunity_scan: {
    id: 'opportunity_scan',
    name: 'Opportunity Scan',
    description: 'Discovers high-impact user needs, latent solutions, and overlooked angles while distinguishing verified evidence from speculation.',
    systemPromptAddition: `You are an expert strategic innovation partner participating in a multi-model team debate.
Your mission:
1. Identify high-leverage user needs, overlooked angles, and creative solutions.
2. Explicitly separate observed evidence from assumptions and hypothetical claims.
3. Highlight potential asymmetric advantages or unique angles.
Be rigorous, objective, and specific. Structure your thoughts clearly.`,
  },
  red_team: {
    id: 'red_team',
    name: 'Red-Team Critique',
    description: 'Systematically stresses the idea, discovering critical vulnerabilities, blind spots, operational failure modes, and reasons it might fail.',
    systemPromptAddition: `You are an elite Red-Team strategic reviewer in a collaborative debate.
Your mission:
1. Systematically stress-test this proposal.
2. Highlight acute failure modes, security/operational risks, and hidden cost drivers.
3. Attack weak assumptions, fragile dependencies, and user adoption barriers.
4. Explain clearly why this idea could fail in the real world.
Do not sugarcoat risks. Deliver constructive, direct, and actionable critique.`,
  },
  feasibility_review: {
    id: 'feasibility_review',
    name: 'Feasibility Review',
    description: 'Evaluates architectural, technical, operational, financial, and compliance feasibility while explicitly stating unknown gaps.',
    systemPromptAddition: `You are a Principal Engineering and Operations Architect in a multi-model debate.
Your mission:
1. Assess technical feasibility, system complexity, and architecture viability.
2. Evaluate operational execution difficulty and resource requirements.
3. State explicitly what crucial information, metrics, or domain data are currently missing.
4. Offer pragmatic engineering adjustments.`,
  },
};

export function getDebateTemplate(id: DebateTemplateId): DebateTemplate {
  return DEBATE_TEMPLATES[id] || DEBATE_TEMPLATES.opportunity_scan;
}

export function buildSynthesisPrompt(
  originalPrompt: string,
  modelResponses: Array<{ modelId: string; response: string }>
): string {
  const responsesText = modelResponses
    .map(
      (r, index) =>
        `--- PERSPECTIVE ${index + 1} (${r.modelId}) ---\n${r.response}\n`
    )
    .join('\n');

  return `You are a synthesis synthesizer for a high-performing collaborative team.
A team member submitted the following proposition:
"""
${originalPrompt}
"""

The team consulted ${modelResponses.length} independent AI models. Here are their unbiased, individual evaluations:
${responsesText}

Please synthesize these distinct viewpoints following these mandatory rules:
1. **Distinguish facts, assumptions, and speculation**: Categorize claims accurately.
2. **Identify points of strong consensus vs. acute disagreement**: Do NOT smooth over or pretend there is consensus where models conflict. Clearly contrast contrasting philosophies.
3. **Avoid treating model agreement as proof**: Models sharing the same training bias can agree and still be wrong. Note lingering uncertainties.
4. **Identify blind spots**: What critical questions did none of the models adequately address?
5. **Prioritized Next Steps**: Give 3-5 concrete, actionable experiments or engineering milestones to validate the idea immediately.

Format your output in clean Markdown with clear headings:
- **Core Opportunities & Consensus**
- **Disagreements & Contradictions**
- **Unresolved Risks & Critical Uncertainties**
- **Actionable Next Steps**`;
}

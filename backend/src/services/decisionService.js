// Server-side decision logic. Mirrors (and extends) the frontend's
// DecisionEngine + DecisionTool components, so we can tweak rules
// without redeploying the frontend.

const suggestions = {
  pcm: {
    top: 'Focus on NIT/IIT prep. Top branches await you. Build projects simultaneously.',
    mid: 'Target Delhi colleges + Tier 1 state colleges. Engineering + data is your edge.',
    low: 'Choose colleges with strong placement culture. Choose branch wisely — consider CS over ECE.',
  },
  pcb: {
    top: 'AIIMS / top government college is likely. Prepare for high competition.',
    mid: 'Private med college or strong government college. Both paths viable.',
    low: 'Focus on college culture & hospital tie-ups. Career planning is crucial.',
  },
  commerce: {
    top: 'DU or Bombay colleges. CA/CS + degree combo recommended.',
    mid: 'Focus on specialization: Finance, Analytics, or Taxation.',
    low: 'Choose colleges with strong placement network. Skill-building is essential.',
  },
};

const thresholds = {
  pcm: { top: 5000, mid: 50000 },
  pcb: { top: 1000, mid: 10000 },
  commerce: { top: 500, mid: 5000 },
};

function bucketFor(stream, rank) {
  const t = thresholds[stream];
  if (rank < t.top) return 'top';
  if (rank < t.mid) return 'mid';
  return 'low';
}

function riskFor(rank) {
  if (rank > 100000) return 'High';
  if (rank > 30000) return 'Medium';
  return 'Low';
}

export function getDecision({ stream, rank, confusion }) {
  const bucket = bucketFor(stream, rank);
  let direction = suggestions[stream][bucket];

  // Layer in confusion-aware overrides
  if (confusion && /branch/i.test(confusion)) {
    direction = 'Prioritise branch-fit over college brand. ' + direction;
  }
  if (confusion && /(parent|family|pressure)/i.test(confusion)) {
    direction += ' We can also help you frame this conversation with your family.';
  }

  return {
    stream,
    rank,
    bucket,                   // 'top' | 'mid' | 'low'
    risk: riskFor(rank),      // 'Low' | 'Medium' | 'High'
    direction,
    nextStep: 'Talk to a senior from a target college for a 20-min clarity call.',
  };
}

import { PACES, QUIZ, TRACKS } from '../../content/site/courses'

/* Scores the track finder. `answers` holds the picked option index per
   question. The first three answers score Security-First Engineer (dev)
   against Secure Builder Accelerator (change); ties go to dev. The last
   answer sets the pace. The match label comes from the score gap. */
export function scoreQuiz(answers, quiz = QUIZ) {
  const score = { dev: 0, change: 0 }
  quiz.forEach((question, i) => {
    const option = question.opts[answers[i]]
    if (!option?.s) return
    score.dev += option.s.dev || 0
    score.change += option.s.change || 0
  })
  const key = score.dev >= score.change ? 'dev' : 'change'
  const gap = Math.abs(score.dev - score.change)
  const total = Math.max(1, score.dev + score.change)
  const devPct = Math.round((score.dev / total) * 100)
  const paceOption = quiz.at(-1).opts[answers[quiz.length - 1]]
  const pace = paceOption?.pace ?? 'standard'
  const { label, total: length, perModule } = PACES[pace]

  const why = []
  quiz.forEach((question, i) => {
    const option = question.opts[answers[i]]
    if (option?.s && (option.s[key] || 0) > 0 && option.why)
      why.push(option.why)
  })
  why.push(
    `You picked the ${label} pace: about ${length}, ${perModule} per module.`
  )

  return {
    key,
    score,
    gap,
    pace,
    devPct,
    changePct: 100 - devPct,
    matchLabel:
      gap >= 4 ? 'Strong match' : gap >= 2 ? 'Good match' : 'Close call',
    close: gap < 2,
    why,
    track: TRACKS[key],
  }
}

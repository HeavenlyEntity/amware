/* The Red Flags scorer's verdict, from the board's logic. Two fails is the
   line the checklist PDF itself draws. Pure, so the marks can stay in the
   page's state and never leave it.

   `flags` holds one 'pass', 'fail' or null per clause. */
export function contractVerdict(flags) {
  const fails = flags.filter((flag) => flag === 'fail').length
  const checked = flags.filter(Boolean).length
  const left = flags.length - checked
  const counts = { fails, checked }

  if (checked === 0) {
    return {
      title: 'Start with clause 1',
      copy: 'Mark each clause pass or fail. Nothing you mark here is saved or sent.',
      tone: 'idle',
      ...counts,
    }
  }
  if (fails >= 2) {
    return {
      title: 'Renegotiate before you sign',
      copy: 'Two or more fails is the line. Send the shop the green-flag wording for each one.',
      tone: 'bad',
      ...counts,
    }
  }
  if (fails === 1) {
    return {
      title: 'One clause to fix',
      copy: left
        ? 'Keep going. One fail is worth raising before you sign.'
        : 'Raise it with the shop before you sign. The rest reads well.',
      tone: 'idle',
      ...counts,
    }
  }
  return {
    title: left ? 'Clean so far' : 'All seven read well',
    copy: left
      ? `${left} left to check.`
      : 'This contract passes all seven checks.',
    tone: 'ok',
    ...counts,
  }
}

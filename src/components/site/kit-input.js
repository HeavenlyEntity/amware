/* The kit pages' text field: the page's card colour, a 50px row, and the
   teal focus ring from styles/kit.css. Shared by the GitHub field and the
   fields that sit beside it (the free claim's email).

   No border colour here. accessibility.css holds every input border at
   #71717a with !important, for 3:1 contrast, and kit.css overrides that only
   for focus, an account found (`data-found`) and `aria-invalid`. */
export const KIT_INPUT =
  'amw-kit-input box-border w-full min-h-[50px] rounded-md border bg-[var(--amw-card)] px-3.5 py-3 font-sans text-[15px] text-[var(--amw-ink)] placeholder:text-zinc-500'

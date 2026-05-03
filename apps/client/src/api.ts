import type { Click, ClickInput } from '@anc/shared';

/** Fire-and-forget POST. Logs failures but never throws. */
export function postClick(input: ClickInput): Promise<Click | null> {
  return fetch('/api/clicks', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.warn('[api] postClick failed', res.status, await res.text());
        return null;
      }
      return (await res.json()) as Click;
    })
    .catch((err) => {
      console.warn('[api] postClick error', err);
      return null;
    });
}

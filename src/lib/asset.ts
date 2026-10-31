/** Public URL of a file in `public/`, prefixed with the deploy base path (empty locally, `/linas-tats` on GitHub Pages). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;

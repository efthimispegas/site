/** Decode lossless sidecars with the browser's native streaming implementation.
 * An opaque .gz.bin URL also survives hosts/tunnels that strip binary HTTP encoding.
 * Older browsers/hosts use the original asset. No renderer or asset conversion.
 */
export async function fetchModelBytes(
  url,
  { signal, fetcher = fetch, decompress = globalThis.DecompressionStream } = {},
) {
  const options = { signal, priority: 'low' };
  if (decompress) {
    try {
      const response = await fetcher(url + '.gz.bin', options);
      if (!response.ok || !response.body)
        throw Error('Compressed model unavailable');
      return await new globalThis.Response(
        response.body.pipeThrough(new decompress('gzip')),
      ).arrayBuffer();
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  const response = await fetcher(url, options);
  if (!response.ok) throw Error('Transport model unavailable');
  return response.arrayBuffer();
}

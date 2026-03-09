const SUPABASE_STORAGE_PUBLIC_SEGMENT = '/storage/v1/object/public/';

interface SupabaseTransformOptions {
  width?: number;
  quality?: number;
}

export function getOptimizedSupabaseImageUrl(
  sourceUrl: string | null | undefined,
  options: SupabaseTransformOptions = {},
): string {
  if (!sourceUrl) {
    return '';
  }

  if (!sourceUrl.includes(SUPABASE_STORAGE_PUBLIC_SEGMENT)) {
    return sourceUrl;
  }

  const width = options.width ?? 400;
  const quality = options.quality ?? 75;

  try {
    const url = new URL(sourceUrl);
    url.searchParams.set('width', String(width));
    url.searchParams.set('quality', String(quality));
    return url.toString();
  } catch {
    const separator = sourceUrl.includes('?') ? '&' : '?';
    return `${sourceUrl}${separator}width=${width}&quality=${quality}`;
  }
}

"use client";

import { useState, useRef, useMemo, useEffect, useDeferredValue } from "react";
import type { FetchMetadataResult, UrlPreviewItem } from "@/app/types";
import { normalizeBareUrls, expandUrlPattern } from "@/app/types";
import { tryOEmbedPreview, hasOEmbedProvider } from "@/app/lib/oembed";

interface UrlPreview {
  url: string;
  loading: boolean;
  data: FetchMetadataResult | null;
  error: string | null;
  presetId: string;
  fetchHint?: string;
}

interface UseUrlPreviewsOptions {
  urlInput: string;
  presetId: string;
  destination: string;
  fetchMetadata: (
    url: string,
    opts: { preset_id: string; output_dir: string }
  ) => Promise<FetchMetadataResult>;
  fastFetchMetadata: (url: string) => Promise<FetchMetadataResult | null>;
}

export function useUrlPreviews({
  urlInput,
  presetId,
  destination,
  fetchMetadata,
  fastFetchMetadata,
}: UseUrlPreviewsOptions) {
  const [urlPreviews, setUrlPreviews] = useState<Map<string, UrlPreview>>(
    new Map()
  );
  const fetchedUrlsRef = useRef<Set<string>>(new Set());
  const qualitiesFetchingRef = useRef<Set<string>>(new Set());
  const [selectedQualityPerUrl, setSelectedQualityPerUrl] = useState<
    Map<string, string>
  >(new Map());

  const deferredUrlInput = useDeferredValue(urlInput);

  const { extractedUrls, rangeGroups } = useMemo(() => {
    if (!deferredUrlInput.trim()) {
      return {
        extractedUrls: [] as string[],
        rangeGroups: [] as { pattern: string; urls: string[] }[],
      };
    }

    const normalized = normalizeBareUrls(deferredUrlInput);
    const tokens = normalized.match(/https?:\/\/[^\s]+/g) ?? [];
    const seen = new Set<string>();
    const urls: string[] = [];
    const ranges: { pattern: string; urls: string[] }[] = [];

    for (const token of tokens) {
      const trimmed = token.trim();
      const expanded = expandUrlPattern(trimmed);

      if (expanded.length > 1) {
        const unique = expanded.filter((u) => !seen.has(u));
        unique.forEach((u) => {
          seen.add(u);
          urls.push(u);
        });
        if (unique.length > 0) ranges.push({ pattern: trimmed, urls: unique });
      } else {
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      }
    }

    return { extractedUrls: urls, rangeGroups: ranges };
  }, [deferredUrlInput]);

  const rangeExpandedSet = useMemo(
    () => new Set(rangeGroups.flatMap((g) => g.urls)),
    [rangeGroups]
  );

  const allPreviews = useMemo((): UrlPreviewItem[] => {
    return extractedUrls
      .filter((url) => !rangeExpandedSet.has(url))
      .map((url) => {
        const p = urlPreviews.get(url);
        return p
          ? {
              url: p.url,
              loading: p.loading,
              data: p.data,
              error: p.error,
              qualitiesLoading: qualitiesFetchingRef.current.has(url),
              fetchHint: p.fetchHint,
            }
          : {
              url,
              loading: false,
              data: null,
              error: null,
              qualitiesLoading: false,
            };
      });
  }, [extractedUrls, urlPreviews, rangeExpandedSet]);

  const previewData =
    allPreviews.length === 1 && rangeGroups.length === 0
      ? allPreviews[0].data
      : null;
  const previewError =
    allPreviews.length === 1 && rangeGroups.length === 0
      ? allPreviews[0].error
      : null;
  const previewLoading = allPreviews.some((p) => p.loading);

  const fetchPreviewForUrl = async (url: string) => {
    if (fetchedUrlsRef.current.has(url)) return;
    fetchedUrlsRef.current.add(url);

    setUrlPreviews((prev) => {
      const next = new Map(prev);
      next.set(url, {
        url,
        loading: true,
        data: null,
        error: null,
        presetId,
      });
      return next;
    });

    try {
      if (hasOEmbedProvider(url)) {
        const oembed = await tryOEmbedPreview(url);
        if (oembed) {
          setUrlPreviews((prev) => {
            const next = new Map(prev);
            next.set(url, {
              url,
              loading: false,
              data: oembed,
              error: null,
              presetId,
            });
            return next;
          });

          qualitiesFetchingRef.current.add(url);
          fetchMetadata(url, { preset_id: presetId, output_dir: destination })
            .then((fullMeta) => {
              qualitiesFetchingRef.current.delete(url);
              setUrlPreviews((prev) => {
                const next = new Map(prev);
                next.set(url, {
                  url,
                  loading: false,
                  data: fullMeta,
                  error: null,
                  presetId,
                });
                return next;
              });
            })
            .catch(() => {
              qualitiesFetchingRef.current.delete(url);
            });
          return;
        }
      }

      const meta = await fetchMetadata(url, {
        preset_id: presetId,
        output_dir: destination,
      });

      setUrlPreviews((prev) => {
        const next = new Map(prev);
        next.set(url, {
          url,
          loading: false,
          data: meta,
          error: null,
          presetId,
        });
        return next;
      });
    } catch (e) {
      setUrlPreviews((prev) => {
        const next = new Map(prev);
        next.set(url, {
          url,
          loading: false,
          data: null,
          error: String(e),
          presetId,
        });
        return next;
      });
    }
  };

  useEffect(() => {
    for (const url of extractedUrls) {
      if (!rangeExpandedSet.has(url) && !fetchedUrlsRef.current.has(url)) {
        fetchPreviewForUrl(url);
      }
    }
  }, [extractedUrls, rangeExpandedSet]);

  const clearPreviews = () => {
    setUrlPreviews(new Map());
    fetchedUrlsRef.current.clear();
    qualitiesFetchingRef.current.clear();
    setSelectedQualityPerUrl(new Map());
  };

  return {
    extractedUrls,
    rangeGroups,
    rangeExpandedSet,
    allPreviews,
    previewData,
    previewError,
    previewLoading,
    selectedQualityPerUrl,
    setSelectedQualityPerUrl,
    clearPreviews,
  };
}

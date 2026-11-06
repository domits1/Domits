import { useCallback, useEffect, useRef, useState } from "react";
import { fetchReviewQueue } from "../services/propertyReviewApi";

const PAGE_SIZE = 20;

const cardId = (card) => card?.property?.id;

const mergeCards = (current, incoming) => {
  const seen = new Set(current.map(cardId));
  const added = [];
  incoming.forEach((card) => {
    const id = cardId(card);
    if (!id || seen.has(id)) return;
    seen.add(id);
    added.push(card);
  });
  return [...current, ...added];
};

function usePropertyReviewQueue() {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const controllerRef = useRef(null);
  const busyRef = useRef(false);

  const loadPage = useCallback(async (cursor) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const isFirstPage = !cursor;
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;

    setError(null);
    setLoadMoreError(null);
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    try {
      const page = await fetchReviewQueue({ cursor, limit: PAGE_SIZE, signal });
      if (signal.aborted) return;
      setItems((current) => mergeCards(current, page.properties));
      setNextCursor(page.nextCursor);
    } catch (failure) {
      if (signal.aborted) return;
      if (isFirstPage) setError(failure);
      else setLoadMoreError(failure);
    } finally {
      if (controllerRef.current === controller) busyRef.current = false;
      if (!signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPage(undefined);
    return () => {
      controllerRef.current?.abort();
      busyRef.current = false;
    };
  }, [loadPage]);

  const retry = useCallback(() => loadPage(undefined), [loadPage]);

  const loadMore = useCallback(() => {
    if (nextCursor) return loadPage(nextCursor);
    return Promise.resolve();
  }, [loadPage, nextCursor]);

  return { items, nextCursor, loading, loadingMore, error, loadMoreError, loadMore, retry };
}

export default usePropertyReviewQueue;

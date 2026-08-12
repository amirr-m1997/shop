import { useEffect, useRef, useState } from 'react';

export const useDebouncedValue = (value, delay = 400, onCommit) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // React 18 batches these updates, so consumers can reset related state
      // (such as pagination) in the same render as the debounced value.
      onCommitRef.current?.(value);
      setDebouncedValue(value);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};

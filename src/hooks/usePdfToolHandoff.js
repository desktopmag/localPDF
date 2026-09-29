import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getToolHandoffFile } from '@/lib/toolHandoff';

/** Apply a PDF staged from "Continue with another tool" when this tool mounts. */
export function usePdfToolHandoff(toolSlug, onReceive) {
  const location = useLocation();
  const onReceiveRef = useRef(onReceive);
  onReceiveRef.current = onReceive;

  useLayoutEffect(() => {
    if (location.state?.fromToolHandoff !== toolSlug) return;
    const file = getToolHandoffFile(toolSlug);
    if (file) onReceiveRef.current(file);
  }, [toolSlug, location.state?.fromToolHandoff]);
}

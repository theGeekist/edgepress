import { useMemo, useState } from 'react';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function shallowEqual(a, b) {
  const left = isPlainObject(a) ? a : {};
  const right = isPlainObject(b) ? b : {};
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

export function useDirtyFormState(initialValues = {}) {
  const [baseline, setBaseline] = useState(() => (isPlainObject(initialValues) ? initialValues : {}));
  const [values, setValues] = useState(() => (isPlainObject(initialValues) ? initialValues : {}));

  const dirtyMap = useMemo(() => {
    const map = {};
    const keys = new Set([...Object.keys(baseline), ...Object.keys(values)]);
    for (const key of keys) {
      map[key] = baseline[key] !== values[key];
    }
    return map;
  }, [baseline, values]);

  const isDirty = useMemo(() => Object.values(dirtyMap).some(Boolean), [dirtyMap]);

  function setField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function patch(nextPatch = {}) {
    setValues((prev) => ({ ...prev, ...(isPlainObject(nextPatch) ? nextPatch : {}) }));
  }

  function reset(nextBaseline = baseline) {
    const normalized = isPlainObject(nextBaseline) ? nextBaseline : {};
    setBaseline(normalized);
    setValues(normalized);
  }

  function markSaved(nextValues = values) {
    const normalized = isPlainObject(nextValues) ? nextValues : {};
    setBaseline(normalized);
    setValues(normalized);
  }

  return {
    values,
    isDirty,
    dirtyMap,
    setField,
    patch,
    reset,
    markSaved,
    isUnchanged: shallowEqual(values, baseline)
  };
}

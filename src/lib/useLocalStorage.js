import { useEffect, useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return initialValue;
    }

    try {
      return JSON.parse(storedValue);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

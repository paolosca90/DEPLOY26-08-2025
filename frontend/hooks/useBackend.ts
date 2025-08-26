import backend from "~backend/client";

// Returns the backend client for making API calls.
export function useBackend() {
  return backend;
}

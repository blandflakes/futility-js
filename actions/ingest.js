export function startLoading() {
  return { type: "START_LOADING" };
}

export function stopLoading() {
  return { type: "STOP_LOADING" };
}

export function setAppState(newState) {
  return { type: "SET_APP_STATE", state: newState };
}

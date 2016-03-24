export function startLoading() {
  return { type: "START_LOADING" };
}

export function stopLoading() {
  return { type: "STOP_LOADING" };
}

export function addGenomes(genomeMaps) {
  return { type: "ADD_GENOMES", genomeMaps: genomeMaps };
}

export function removeGenome(name) {
  return { type: "REMOVE_GENOME", name: name };
}

export function addDataSets(dataSets) {
  return { type: "ADD_DATA_SETS", dataSets: dataSets };
}

export function removeDataSet(name) {
  return { type: "REMOVE_DATA_SET", name: name };
}

export function setAppState(newState) {
  return { type: "SET_APP_STATE", state: newState };
}

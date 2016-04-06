export function startLoading() {
  return { type: "START_LOADING" };
}

export function stopLoading() {
  return { type: "STOP_LOADING" };
}

export function addGenome(genomeMap) {
  return { type: "ADD_GENOME", genomeMap: genomeMap };
}

export function removeGenome(name) {
  return { type: "REMOVE_GENOME", name: name };
}

export function addDataSet(dataSet) {
  return { type: "ADD_DATA_SET", dataSet: dataSet };
}

export function removeDataSet(name) {
  return { type: "REMOVE_DATA_SET", name: name };
}

export function setAppState(newState) {
  return { type: "SET_APP_STATE", state: newState };
}

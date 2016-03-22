
export function resetDisplayedDataSets() {
  return { type: "RESET_DISPLAYED_DATA_SETS" };
}

// We want some state to persist across tabs
export function hangState(fieldName, value) {
  return { type: "HANG_STATE", fieldName: fieldName, value: value };
}

export function displayDataSet(dataSetName) {
  return { type: "DISPLAY_DATA_SET", name: dataSetName };
}

export function removeDisplayedDataSet(dataSetName) {
  return { type: "REMOVE_DISPLAYED_DATA_SET", name: dataSetName };
}

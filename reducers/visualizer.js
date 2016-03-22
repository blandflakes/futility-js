import { assoc } from 'lib/func';

const initialState = {
  visibleDataSetNames: [],
  scales: null,
  maxPosition: 0,
  selectedGenomeName: null,
  zoom: null
};

export function visualize(state = initialState, action) {
  switch(action.type) {
    case "RESET_DISPLAYED_DATA_SETS":
      return initialState;
    case "HANG_STATE":
      // Let's only do this for things we know
      if (state.hasOwnProperty(action.fieldName)) {
        return assoc(state, action.fieldName, action.value);
      }
      else {
        window.console.warn("Unknown property: " + action.fieldName + ", ignoring.");
        return state;
      }
    case "DISPLAY_DATA_SET":
      return assoc(state, "visibleDataSetNames", state.visibleDataSetNames.concat([action.name]));
    case "REMOVE_DISPLAYED_DATA_SET":
      return assoc(state, "visibleDataSetNames", state.visibleDataSetNames.filter(function(setName) { return setName !== action.name; }));
    default:
      return state;
  }
}

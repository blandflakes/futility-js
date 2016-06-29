import { assoc, assocAll, dissoc, dissocAll, merge } from 'lib/func';

const initialState = {
  loading: false,
  genomes: {},
  // name -> {name: String, genomeName: String}
  controls: {},
  // name -> {name: String, controlName: String}
  experiments:{}
};

export function ingest(state = initialState, action) {
  switch (action.type) {
    case "START_LOADING":
      return assoc(state, "loading", true);
    case "STOP_LOADING":
      return assoc(state, "loading", false);
    case "SET_APP_STATE":
      var newState = dissoc(action.state, "version");
      return merge(state, newState);
    default:
      return state;
  }
}

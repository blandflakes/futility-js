import { assoc, assocAll, dissoc, dissocAll, merge } from 'lib/func';

const initialState = {
  loading: false,
  genomes: {},
  dataSets: {}
};

export function ingest(state = initialState, action) {
  switch (action.type) {
    case "START_LOADING":
      return assoc(state, "loading", true);
    case "STOP_LOADING":
      return assoc(state, "loading", false);
    case "ADD_GENOMES":
      var genomeMaps = action.genomeMaps;
      var genomeKeys = genomeMaps.map(function(genomeMap) { return genomeMap.name; });
      var previousGenomes = state.genomes;
      return assoc(state, "genomes", assocAll(previousGenomes, genomeKeys, genomeMaps));
    case "REMOVE_GENOME":
      var genomeName = action.name;
      var dataSets = state.dataSets;
      var dataSetNamesToRemove = new Set(Object.keys(dataSets).filter(function(name) {
        return dataSets[name].genomeName === genomeName;
      }));
      var newGenomes = dissoc(state.genomes, genomeName);
      var newDataSets = dissocAll(dataSets, dataSetNamesToRemove);
      return assocAll(state, ["genomes", "dataSets"], [newGenomes, newDataSets]);
    case "ADD_DATA_SETS":
      var newDataSets = action.dataSets;
      var newKeys = newDataSets.map(function(dataSet) { return dataSet.name; });
      return assoc(state, "dataSets", assocAll(state.dataSets, newKeys, newDataSets));
    case "REMOVE_DATA_SET":
      var dataSet = state.dataSets[action.name];
      var setNamesToRemove;
      if (dataSet.type === "control") {
        // Have to get all related experiments
        setNamesToRemove = new Set(Object.keys(state.dataSets).filter(function(dataSetName) {
          var candidateSet = state.dataSets[dataSetName];
          return candidateSet.type === "experiment" && candidateSet.controlName === dataSet.name;
        }));
      }
      else {
        setNamesToRemove = new Set();
      }
      setNamesToRemove.add(dataSet.name);
      var newDataSets = dissocAll(state.dataSets, setNamesToRemove);
      return assoc(state, "dataSets", newDataSets);
    case "SET_APP_STATE":
      var newState = dissoc(action.state, "version");
      return merge(state, newState);
    default:
      return state;
  }
}

import { assoc, assocAll, dissoc, dissocAll } from 'lib/func';

// Create namespaces functions for manipulating loaded data
export function dataSetActions(component) {
  var self = component;
  // Functions for manipulating loaded data
  return {
    addGenomes: function(genomeMaps) {
      var genomeKeys = genomeMaps.map(function(genomeMap) { return genomeMap.name; });
      self.setState({ genomes: assocAll(self.state.genomes, genomeKeys, genomeMaps), loading: false });
    },
    removeGenome: function(genomeName) {
      var controls = self.state.controls;
      var controlsToRemove = new Set(Object.keys(controls).filter(function(controlName) {
        return controls[controlName].genomeName === genomeName;
      }));
      var experiments = self.state.experiments;
      var experimentsToRemove = new Set(Object.keys(experiments).filter(function(experimentName) {
        return experiments[experimentName].genomeName === genomeName;
      }));
      self.setState({ genomes: dissoc(self.state.genomes, genomeName), controls: dissocAll(controls, controlsToRemove), experiments: dissocAll(experiments, experimentsToRemove) });
    },
    addControls: function(controlDatum) {
      var controlKeys = controlDatum.map(function(controlData) { return controlData.name; });
      self.setState({ controls: assocAll(self.state.controls, controlKeys, controlDatum), loading: false });
    },
    removeControl: function(controlName) {
      var experimentsToRemove = new Set(Object.keys(self.state.experiments).filter(function(experimentName) {
        return self.state.experiments[experimentName].controlName === controlName;
      }.bind(self)));
      self.setState({ controls: dissoc(self.state.controls, controlName), experiments: dissocAll(self.state.experiments, experimentsToRemove) });
    },
    addExperiments: function(experimentDatum) {
      var experimentKeys = experimentDatum.map(function(experimentData) { return experimentData.name; });
      self.setState({ experiments: assocAll(self.state.experiments, experimentKeys, experimentDatum), loading: false});
    },
    removeExperiment: function(experimentName) {
      self.setState({ experiments: dissoc(self.state.experiments, experimentName) });
    },
    setIsLoading: function(isLoading) {
      self.setState({ loading: isLoading });
    }
  };
}

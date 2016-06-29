import React from 'react';
import Griddle from 'griddle-react';
import Loader from 'react-loader';
import { connect } from 'react-redux';
import { startLoading, stopLoading } from '../actions/ingest';
import { queryGenome, queryFeatures } from 'lib/data';
import { assoc, assocAll } from 'lib/func';

const mapStateToProps = function(state) {
  return {
    loading: state.loading,
    genomeNames: Object.keys(state.genomes),
    experiments: state.experiments
  };
}

const mapDispatchToProps = function(dispatch) {
  return {
    startLoading: function() { dispatch(startLoading()); },
    stopLoading: function() { dispatch(stopLoading()); }
  };
}

// Set up some formatters
function formattedDecimal(precision) {
  return React.createClass({
    render: function() {
      return <span>{this.props.data.toFixed(precision)}</span>;
    }
  });
}

function formattedExponential(precision) {
  return React.createClass({
    render: function() {
      return <span>{this.props.data .toExponential(precision)}</span>;
    }
  });
}

var DecimalFormatter = formattedDecimal(5);
var ExponentialFormatter = formattedExponential(3);
var RoundToIntFormatter = formattedDecimal(0);

var state = null;

export var FitnessTable = connect(mapStateToProps, mapDispatchToProps)(React.createClass({
  updateStateToProps: function(state) {
    var newSelectedGenome = state.selectedGenome;
    var newSelectedGeneName = state.selectedGeneName;
    var newLoadedFeatures = state.loadedFeatures;
    // If the genome has been removed, unselect everything
    if (state.selectedGenome) {
      if (!this.props.genomeNames.includes(state.selectedGenome.name)) {
        newSelectedGenome = null;
        newSelectedGeneName = null;
        newLoadedFeatures = null;
      }
      // Ok, the genome is still valid. How about the gene?
      else {
        if (state.selectedGeneName && !state.selectedGenome.geneMap[state.selectedGeneName]) {
          newSelectedGeneName = null;
          newLoadedFeatures = null;
        }
      }
    }
    // Finally, remove any loaded experiments that were removed
    if (newLoadedFeatures) {
      newLoadedFeatures = newLoadedFeatures.filter(function(featureList) {
        return this.props.experiments[featureList[":condition"]];
      }.bind(this));
    }
    return assocAll(state, ["selectedGenome", "selectedGeneName", "loadedFeatures"], [newSelectedGenome, newSelectedGeneName, newLoadedFeatures]);
  },
  getInitialState: function() {
    if (state) {
      return this.updateStateToProps(state);
    }
    else {
      return { selectedGenome: null, selectedGeneName: null, loadedFeatures: null };
    }
  },
  componentWillUnmount: function() {
    state = this.state;
  },
  updateSelectedGenome: function(e) {
    var newGenomeName = e.target.value;
    if (this.state.selectedGenome && this.state.selectedGenome.name === newGenomeName) {
      return;
    }
    this.props.startLoading();
    queryGenome(newGenomeName, function(newGenome) {
      this.setState({ selectedGenome: newGenome, selectedGeneName: null, loadedFeatures: null });
      this.props.stopLoading();
    }.bind(this), function(errorMessage) {
      alert("Couldn't load genome: " + errorMessage);
      this.props.stopLoading();
    });
  },
  updateSelectedGeneName: function(e) {
    var geneName = e.target.value;
    this.props.startLoading();
    queryFeatures(this.state.selectedGenome.name, geneName, function(features) {
      this.setState({ selectedGeneName: geneName, loadedFeatures: features });
      this.props.stopLoading();
    }.bind(this), function(errorMessage) {
      alert("Error loading gene '" + geneName + "': " + errorMessage);
      this.props.stopLoading();
    }.bind(this));
  },
  render: function() {
    var genomeOptions = this.props.genomeNames.map(function(genomeName) {
      return <option value={genomeName} key={genomeName}>{genomeName}</option>;
    });
    var geneOptions;
    if (this.state.selectedGenome) {
      geneOptions = Object.keys(this.state.selectedGenome.geneMap).sort().map(function(geneName) {
        return <option value={geneName} key={geneName}>{geneName}</option>;
      });
    }
    else {
      geneOptions = null;
    }
    var experimentFeatures = this.state.loadedFeatures;
    return (
      <Loader loaded={!this.props.loading}>
        <div>
          <select value={this.state.selectedGenome && this.state.selectedGenome.name} onChange={this.updateSelectedGenome} defaultValue="NONE_SELECTED" >
            { !this.state.selectedGenome && <option value="NONE_SELECTED" disabled="disabled">Select a genome</option> }
            {genomeOptions}
          </select>
          <select value={this.state.selectedGeneName} onChange={this.updateSelectedGeneName} defaultValue="NONE_SELECTED" >
            { !this.state.selectedGeneName && <option value="NONE_SELECTED" disabled="disabled">Select a gene</option> }
            {geneOptions}
          </select>
          { experimentFeatures &&
            <Griddle results={experimentFeatures}
              showSettings={true}
              noDataMessage={"Import experiments and select a genome and gene."}
              resultsPerPage={100}
              initialSort={"condition"}
              columnMetadata={
                [ { columnName: ":condition", displayName: "Condition", order: 0 },
                  { columnName: ":num_ta_sites", displayName: "Number of TA Sites", order: 1 },
                  { columnName: ":gene_length", displayName: "Length of Gene", order: 2 },
                  { columnName: ":num_control_reads", displayName: "Raw # Sequence Reads Control", order: 3, customComponent: RoundToIntFormatter },
                  { columnName: ":num_experiment_reads", displayName: "Raw # Sequence Reads Experiment", order: 4, customComponent: RoundToIntFormatter },
                  { columnName: ":modified_ratio", displayName: "Modified Ratio", order: 5, customComponent: DecimalFormatter },
                  { columnName: ":p", displayName: "Corrected p-value", order: 6, customComponent: ExponentialFormatter },
                  { columnName: ":essentiality_index", displayName: "Essentiality Index", order: 7, customComponent: DecimalFormatter },
                  { columnName: ":fitness", displayName: "Normalized Fitness", order: 8, customComponent: DecimalFormatter }]}
            /> }
        </div>
      </Loader>
    );
  }
}));

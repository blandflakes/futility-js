import React from 'react';
import Griddle from 'griddle-react';
import { connect } from 'react-redux';
import { assoc, assocAll } from 'lib/func';

const mapStateToProps = function(state) {
  return {
    genomes: state.genomes,
    genomeNames: Object.keys(state.genomes),
    experiments: Object.values(state.dataSets).filter(function(dataSet) { return dataSet.type === "experiment"; })
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
export var FitnessTable = connect(mapStateToProps)(React.createClass({
  updateStateToProps: function(state) {
    var newSelectedGenomeName = state.selectedGenomeName;
    var newSelectedGeneName = state.selectedGeneName;
    // If the genome has been removed, unselect everything
    if (state.selectedGenomeName) {
      if (!this.props.genomes[state.selectedGenomeName]) {
        newSelectedGenomeName = null;
        newSelectedGeneName = null;
      }
      // Ok, the genome is still valid. How about the gene?
      else {
        if (state.selectedGeneName && !this.props.genomes[state.selectedGenomeName].geneMap[state.selectedGeneName]) {
          newSelectedGeneName = null;
        }
      }
    }
    return assocAll(state, ["selectedGenomeName", "selectedGeneName"], [newSelectedGenomeName, newSelectedGeneName]);
  },
  getInitialState: function() {
    if (state) {
      return this.updateStateToProps(state);
    }
    else {
      return { selectedGenomeName: null, selectedGeneName: null };
    }
  },
  componentWillUnmount: function() {
    state = this.state;
  },
  updateSelectedGenomeName: function(e) {
    this.setState({ selectedGenomeName: e.target.value });
  },
  updateSelectedGeneName: function(e) {
    this.setState({ selectedGeneName: e.target.value });
  },
  render: function() {
    var genomeOptions = this.props.genomeNames.map(function(genomeName) {
      return <option value={genomeName} key={genomeName}>{genomeName}</option>;
    });
    var geneOptions;
    if (this.state.selectedGenomeName) {
      geneOptions = Object.keys(this.props.genomes[this.state.selectedGenomeName].geneMap).sort().map(function(geneName) {
        return <option value={geneName} key={geneName}>{geneName}</option>;
      });
    }
    else {
      geneOptions = null;
    }
    var experimentFeatures;
    if (this.state.selectedGeneName) {
      experimentFeatures = this.props.experiments.map(function(experiment) {
        var features = experiment.geneFeatureMeasurements[this.state.selectedGeneName];
        return assoc(features, "condition", experiment.name);
      }.bind(this));
    }
    else {
      experimentFeatures = null;
    }
    return (
      <div>
        <select value={this.state.selectedGenomeName} onChange={this.updateSelectedGenomeName} defaultValue="NONE_SELECTED" >
          { !this.state.selectedGenomeName && <option value="NONE_SELECTED" disabled="disabled">Select a Genome</option> }
          {genomeOptions}
        </select>
        <select value={this.state.selectedGeneName} onChange={this.updateSelectedGeneName} defaultValue="NONE_SELECTED" >
          { !this.state.selectedGeneName && <option value="NONE_SELECTED" disabled="disabled">Select a Gene</option> }
          {geneOptions}
        </select>
        { experimentFeatures &&
          <Griddle results={experimentFeatures}
            showSettings={true}
            noDataMessage={"Import experiments and select a genome and gene."}
            resultsPerPage={100}
            initialSort={"condition"}
            columnMetadata={
              [ { columnName: "condition", displayName: "Condition", order: 0 },
                { columnName: "numTASites", displayName: "Number of TA Sites", order: 1 },
                { columnName: "geneLength", displayName: "Length of Gene", order: 2 },
                { columnName: "numControlReads", displayName: "Raw # Sequence Reads Control", order: 3, customComponent: RoundToIntFormatter },
                { columnName: "numExperimentReads", displayName: "Raw # Sequence Reads Experiment", order: 4, customComponent: RoundToIntFormatter },
                { columnName: "modifiedRatio", displayName: "Modified Ratio", order: 5, customComponent: DecimalFormatter },
                { columnName: "p", displayName: "Corrected p-value", order: 6, customComponent: ExponentialFormatter },
                { columnName: "essentialityIndex", displayName: "Essentiality Index", order: 7, customComponent: DecimalFormatter },
                { columnName: "fitness", displayName: "Normalized Fitness", order: 8, customComponent: DecimalFormatter }]}
          /> }
      </div>
    );
  }
}));

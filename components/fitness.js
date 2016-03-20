import React from 'react';
import Griddle from 'griddle-react';
import { assoc } from 'lib/func';

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

export var FitnessTable = React.createClass({
  getInitialState: function() {
    return { selectedGenome: null, selectedGene: null };
  },
  updateSelectedGenome: function(e) {
    this.setState({ selectedGenome: this.props.genomes[e.target.value] });
  },
  componentWillReceiveProps: function(nextProps) {
    if (this.state.selectedGenome && !nextProps.genomes[this.state.selectedGenome.name]) {
      this.setState(getInitialState());
    }
    // Could also have the genome but not the gene
    if (this.state.selectedGene && !this.state.selectedGenome.map[this.state.selectedGene.name]) {
      this.setState({ selectedGene: null });
    }
  },
  updateSelectedGene: function(e) {
    var geneName = e.target.value;
    this.setState({ selectedGene: this.state.selectedGenome.map[geneName] });
  },
  render: function() {
    var genomeOptions = Object.keys(this.props.genomes).map(function(genomeName) {
      return <option value={genomeName} key={genomeName}>{genomeName}</option>;
    });
    var geneOptions;
    if (this.state.selectedGenome) {
      geneOptions = Object.keys(this.state.selectedGenome.map).map(function(geneName) {
        return <option value={geneName} key={geneName}>{geneName}</option>;
      });
    }
    else {
      geneOptions = null;
    }
    var experimentFeatures;
    if (this.state.selectedGene) {
      var geneName = this.state.selectedGene.name;
      experimentFeatures = Object.values(this.props.experiments).map(function(experiment) {
        var features = experiment.features[geneName];
        return assoc(features, "condition", experiment.name);
      });
    }
    else {
      experimentFeatures = null;
    }
    return (
      <div>
        <select value={this.state.selectedGenome && this.state.selectedGenome.name} onChange={this.updateSelectedGenome} defaultValue="NONE_SELECTED" >
          { !this.state.selectedGenome && <option value="NONE_SELECTED" disabled="disabled">Select a Genome</option> }
          {genomeOptions}
        </select>
        <select value={this.state.selectedGene && this.state.selectedGene.name} onChange={this.updateSelectedGene} defaultValue="NONE_SELECTED" >
          { !this.state.selectedGene && <option value="NONE_SELECTED" disabled="disabled">Select a Gene</option> }
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
                { columnName: "TASites", displayName: "Number of TA Sites", order: 1 },
                { columnName: "geneLength", displayName: "Length of Gene", order: 2 },
                { columnName: "controlReads", displayName: "Raw # Sequence Reads Control", order: 3 },
                { columnName: "experimentReads", displayName: "Raw # Sequence Reads Experiment", order: 4 },
                { columnName: "correctedRatio", displayName: "Modified Ratio", order: 5, customComponent: DecimalFormatter },
                { columnName: "p", displayName: "Corrected p-value", order: 6, customComponent: ExponentialFormatter },
                { columnName: "index", displayName: "Essentiality Index", order: 7, customComponent: DecimalFormatter },
                { columnName: "fitness", displayName: "Normalized Fitness", order: 8, customComponent: DecimalFormatter }]}
          /> }
      </div>
    );
  }
});

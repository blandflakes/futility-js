import React from 'react';
import Loader from 'react-loader';
import d3 from 'd3';
import { connect } from 'react-redux';

import { startLoading, stopLoading } from '../actions/ingest';
import { queryGenome, queryControlMeasurements, queryExperimentMeasurements } from 'lib/data';
import { assoc, assocAll, dissoc, dissocAll } from 'lib/func';

const mapStateToProps = function(state) {
  return {
    loading: state.loading,
    genomeNames: Object.keys(state.genomes),
    controls: state.controls,
    experiments: state.experiments,
    dataSetNames: Object.keys(state.controls).concat(Object.keys(state.experiments))
  };
}

const mapDispatchToProps = function(dispatch) {
  return {
    startLoading: function() { dispatch(startLoading()); },
    stopLoading: function() { dispatch(stopLoading()); }
  };
}

/*
 * Props:
 * scale: d3 scale object
 * translate: transform attribute for placing the axis
 */
var Axis = React.createClass({
  componentDidMount: function() {
    this.renderAxis();
  },
  componentDidUpdate: function() {
    this.renderAxis();
  },
  renderAxis: function() {
    var node = this.refs.axis;
    var axis = d3.svg.axis().orient(this.props.orient).scale(this.props.scale);
    d3.select(node).call(axis);
  },
  render: function() {
    return <g className="axis" ref="axis" transform={this.props.translate} />;
  }
});

/* Properties:
 * width: total width of the graph portion (not including margins)
 * height: total height of the graph portion (not including margins)
 * margin: margin object with top, left, right, bottom fields
 * scales: object of {x: y} d3 scales
 * visibleData: [{start, end, reads}]
 * visibleLabels: [{start, end, height}]
 * TODO: Why hardcoded 25 and 35 for axis offsets
 */
var GenomeGraph = React.createClass({
  addZoom: function() {
    var node = this.refs.svg;
    d3.select(node).call(this.props.zoom);
  },
  componentDidMount: function() {
    this.addZoom();
  },
  componentDidUpdate: function() {
    this.addZoom();
  },
  render: function() {
    var xScale = this.props.scales.x;
    var yScale = this.props.scales.y;
    var margin = this.props.margin;
    var graphTranslate = "translate(" + margin.left + "," + margin.top + ")";
    var bars = this.props.visibleMappings.map(function(readMapping) {
      return <rect y={ Math.max(yScale(readMapping.reads), 0) } x={ xScale(readMapping.start)} key={readMapping.start}
                   height={ this.props.height - Math.max(yScale(readMapping.reads), 0) }
                   width={ xScale(readMapping.end) - xScale(readMapping.start) }
                   fill={ readMapping.color }/>;
    }.bind(this));
    var labels = this.props.visibleLabels.map(function(labelMapping) {
      return (
        <g className="label" transform={"translate(" + Math.max(xScale(labelMapping.start), 0) + ",0)"} key={labelMapping.name}>
          <rect width={xScale(labelMapping.end) - Math.max(xScale(labelMapping.start), 0)} height={20} >
          </rect>
          <text x={0} y={15}>
            {labelMapping.name}
          </text>
        </g>
      );
    });
    return (
      <div className="genomeGraph">
        <svg width={this.props.width + this.props.margin.left + this.props.margin.right}
             height={this.props.height + this.props.margin.top + this.props.margin.bottom}
             ref="svg" >
          <g transform={graphTranslate}>
            <Axis translate={"translate(0," + this.props.height + ")"} orient="bottom" scale={xScale} />
            <text x={this.props.width / 2} y={this.props.height + 35} style={{textAnchor: "middle"}}>Position in genome</text>
            <Axis orient="left" scale={yScale} />
            <text transform="rotate(-90)" x={0 - this.props.height / 2} y={0 - 40} style={{textAnchor: "middle"}}>Number of reads</text>
            {bars}
          </g>
        </svg>
        <svg width={this.props.width + this.props.margin.left + this.props.margin.right} height={20} >
          <g transform={"translate(" + this.props.margin.left + ",0)"}>
            {labels}
          </g>
        </svg>
      </div>
    );
  }
});

function exists(item) { return item !== null && item !== undefined; }

function range(start, end) {
  var arr = Array(end - start + 1);
  for (var i = start; i <= end; ++i) {
    arr[i - start] = i;
  }
  return arr;
}

function visibleItems(mapping, index, scale) {
  var left, right;
  left = scale.domain()[0];
  right = scale.domain()[1];
  // We create a set because there are nearly guaranteed to be duplicates. Using the start position to determine uniqueness.
  // On the left side, we truncate the position because a gene at the previous position may extend to the
  // current position, and we want to catch it.
  // On the right side, we truncate, because if we are between genes, the last whole number position will either
  // be a read that extends to the next position or not.
  var allInRange = range(Math.trunc(left), Math.trunc(right)).map(function(indexIndex) { return mapping[index[indexIndex]]; }).filter(exists);
  var encounteredStarts = new Set();
  var inRange = [];
  for (var i = 0; i < allInRange.length; ++i) {
    var candidate = allInRange[i];
    if (!encounteredStarts.has(candidate.start)) {
      encounteredStarts.add(candidate.start);
      inRange.push(candidate);
    }
  }
  return inRange;
}

var state = null;

function bindZoom(zoom, self) {
  zoom.on("zoom", function() {
    var xScale = this.state.scales.x;
    var yScale = this.state.scales.y;
    if (xScale.domain()[0] < 0) {
      window.console.log("Detected panning visualization too far to the right. Resetting x domain to [0, width].");
      zoom.translate([zoom.translate()[0] - xScale(0) + xScale.range()[0], zoom.translate()[1]]);
      window.console.log("x domain: " + xScale.domain());
    }
    else if (xScale.domain()[1] > this.state.maxPosition) {
      window.console.log("Detected panning visualization too far to the left. Resetting x domain to [longestMapLength, longestMapLength - width]");
      zoom.translate([zoom.translate()[0] - xScale(this.state.maxPosition) + xScale.range()[1], zoom.translate()[1]]);
      window.console.log("x domain: " + xScale.domain());
    }
    // We never translate the y domain, but we will scale the height.
    yScale.domain([0, this.readCeiling / zoom.scale()]);
    this.forceUpdate();
  }.bind(self));
  return zoom;
}

export var GenomeVisualizer = connect(mapStateToProps, mapDispatchToProps)(React.createClass({
  width: 1000,
  height: 250,
  margin: { top: 10, right: 20, bottom: 50, left: 50 },
  readCeiling: 1000,
  getInitialState: function() {
    if (state) {
      return this.updateStateToProps(state);
    }
    else {
      var xScale = d3.scale.linear().domain([0, this.width]).range([0, this.width]);
      var yScale = d3.scale.linear().domain([0, this.readCeiling]).range([this.height, 0]);
      var zoom = d3.behavior.zoom().x(xScale).scaleExtent([1, 10]);
      bindZoom(zoom, this);
      return { selectedDataSetName: null, positionalInput: "", scales: { x: xScale, y: yScale }, maxPosition: 0, zoom: zoom,
               selectedGenome: null, displayedDataSets: {}};
    }
  },
  updateStateToProps: function(state) {
    var newSelectedGenome = state.selectedGenome;
    var newSelectedDataSetName = state.selectedDataSetName;
    var newDisplayedDataSets;
    // If our genome disappeared, get rid of the local state that depends on it
    if (state.selectedGenome && !this.props.genomeNames.includes(state.selectedGenome.name)) {
      newSelectedGenome = null;
      newSelectedDataSetName = null;
      displayedDataSets = {};
    }
    // Could have just lost the data set we had selected
    else if (state.selectedDataSetName && !this.props.dataSetNames.includes(state.selectedDataSetName)) {
      newSelectedDataSetName = null;
    }
    // Also, need to filter out any data sets that no longer exist
    var dataSetsToRemove = Object.keys(state.displayedDataSets).filter(function(dataSetName) {
      return !this.props.dataSetNames.includes(dataSetName);
    }.bind(this));
    var newDisplayedDataSets = dissocAll(state.displayedDataSets, new Set(dataSetsToRemove));
    // Zoom must be rebound, as "this" has changed if we're remounting.
    var zoom = state.zoom;
    bindZoom(zoom, this);
    return assocAll(state, ["selectedGenome", "selectedDataSetName", "displayedDataSets", "zoom"],
                    [newSelectedGenome, newSelectedDataSetName, newDisplayedDataSets, zoom]);
  },
  componentWillUnmount: function() {
    state = this.state;
  },
  updateSelectedGenome: function(e) {
    var newGenomeName = e.target.value;
    if (this.state.selectedGenome && this.state.selectedGenome.name === newGenomeName) {
      return;
    }
    if (this.state.selectedGenome) {
      if (Object.keys(this.state.displayedDataSets).length > 0) {
        var result = confirm("Change genome and remove all displayed maps?");
        if (!result) { return; }
      }
    }
    this.props.startLoading();
    queryGenome(newGenomeName, function(newGenome) {
      this.setState({ selectedGenome: newGenome, displayedDataSets: {} });
      this.props.stopLoading();
    }.bind(this), function(errorMessage) {
      alert("Couldn't load genome: " + errorMessage);
      this.props.stopLoading();
    });
  },
  updateSelectedDataSetName: function(e) {
    this.setState({ selectedDataSetName: e.target.value });
  },
  updatePositionalInput: function(e) {
    this.setState({ positionalInput: e.target.value });
  },
  panToPosition: function(e) {
    // If this came from a form, don't allow the event to submit.
    if (e) { e.preventDefault(); }
    var target = this.state.positionalInput;
    var targetIndex;
    if (isNaN(target)) {
      // Hopefully a string label.
      var map = this.state.selectedGenome.geneMap;
      var label = map[target];
      if (exists(label)) {
        targetIndex = (label.start + label.end) / 2;
      }
      else {
        alert("Couldn't find a genome named '" + target + "'");
        return;
      }
    }
    else {
      targetIndex = parseInt(target);
      if (targetIndex > this.state.maxPosition) {
        alert("Target index is greater than the size of the genome!");
        return;
      }
      if (targetIndex < 0) {
        alert("Can't pan to a negative index!");
        return;
      }
    }
    this.state.zoom.translate([this.state.zoom.scale() * (0 - targetIndex), 0]);
    this.forceUpdate();
  },
  selectedDataSetAlreadyDisplayed: function() {
    return this.state.displayedDataSets[this.state.selectedDataSetName];
  },
  dataSetCallback: function(loadedDataSet) {
    var newMaxPosition = Math.max(this.state.maxPosition, loadedDataSet.stats.maxPosition);
    var newDataSets = assoc(this.state.displayedDataSets, loadedDataSet.name, loadedDataSet);
    this.setState({ maxPosition: newMaxPosition, displayedDataSets: newDataSets });
    this.props.stopLoading();
  },
  dataSetError: function(errorMessage) {
    alert("Unable to load data set: " + errorMessage);
    this.props.stopLoading();
  },
  addDataSet: function() {
    this.props.startLoading();
    if (this.props.controls[this.state.selectedDataSetName]) {
      queryControlMeasurements(this.state.selectedDataSetName, this.dataSetCallback, this.dataSetError);
    }
    else {
      queryExperimentMeasurements(this.state.selectedDataSetName, this.dataSetCallback, this.dataSetError);
    }
  },
  removeDisplayedDataSet: function(nameToRemove) {
    this.setState({ displayedDataSets: dissoc(this.state.displayedDataSets, nameToRemove) });
  },
  render: function() {
    var genomeOptions = this.props.genomeNames.sort().map(function(genomeName) {
      return <option value={genomeName} key={genomeName}>{genomeName}</option>;
    });
    var availableDataSets;
    if (this.state.selectedGenome) {
      availableDataSets = this.props.dataSetNames.filter(function(dataSetName) {
        var dataSet = this.props.controls[dataSetName] || this.props.experiments[dataSetName];
        return dataSet.genomeName === this.state.selectedGenome.name;
      }.bind(this));
    }
    else {
      availableDataSets = [];
    }
    var mapOptions = availableDataSets.sort().map(function(dataSetName) {
      return <option value={dataSetName} key={dataSetName}>{dataSetName}</option>;
    });
    var graphs = Object.values(this.state.displayedDataSets).map(function(displayedSet) {
      var visibleMappings = visibleItems(displayedSet.rawData, displayedSet.index, this.state.scales.x);
      var genome = this.state.selectedGenome;
      var visibleLabels = visibleItems(genome.geneMap, genome.index, this.state.scales.x);
      var removeHandler = function() { this.removeDisplayedDataSet(displayedSet.name); }.bind(this);
      return (
        <div className="graphContainer" key={displayedSet.name}>
          <div className="graphHeader">
            <span>{displayedSet.name}</span>
            <button onClick={removeHandler}>Remove this graph</button>
          </div>
          <GenomeGraph scales={this.state.scales} width={this.width} height={this.height} margin={this.margin}
            visibleMappings={visibleMappings} zoom={this.state.zoom} visibleLabels={visibleLabels} />
        </div>
      );
    }.bind(this));
    return (
      <Loader loaded={!this.props.loading}>
        <div>
          <div className="controlPanel">
            <div className="selectorDiv">
              <select value={this.state.selectedGenome && this.state.selectedGenome.name} onChange={this.updateSelectedGenome} defaultValue="NONE_SELECTED" >
                { !this.state.selectedGenome && <option value="NONE_SELECTED" disabled="disabled">Select a genome</option> }
                {genomeOptions}
              </select>
              <select onChange={this.updateSelectedDataSetName} className="dataSetNameSelector" defaultValue="NONE_SELECTED" >
                { !this.state.selectedDataSetName && <option value="NONE_SELECTED" disabled="disabled">Select a data set</option> }
                {mapOptions}
              </select>
              <button disabled={!this.state.selectedDataSetName || this.selectedDataSetAlreadyDisplayed()} onClick={this.addDataSet}>Add!</button>
            </div>
            <div className="navigationDiv">
              <span>Enter a gene or position: </span>
              <form className="panForm" onSubmit={this.panToPosition}>
                <input type="text" onChange={this.updatePositionalInput} />
                <button disabled={this.state.positionalInput.length === 0} onClick={this.panToPosition}>Pan</button>
              </form>
            </div>
            <div className="insertionMaps">
              {graphs}
            </div>
          </div>
        </div>
      </Loader>
    );
  }
}));

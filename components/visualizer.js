import React from 'react';
import d3 from 'd3';

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
 * TODO: Why hardcoded 25 and 30 for axis offsets
 */
var GenomeGraph = React.createClass({
  render: function() {
    var xScale = this.props.scales.x;
    var yScale = this.props.scales.y;
    var margin = this.props.margin;
    var graphTranslate = "translate(" + margin.left + "," + margin.top + ")";
    var bars = this.props.visibleMappings.map(function(readMapping) {
      return <rect y={ Math.max(yScale(readMapping.reads), 0) } x={ xScale(readMapping.start) }
                   height={ this.props.height - Math.max(yScale(readMapping.reads), 0) }
                   width={ xScale(readMapping.end) - xScale(readMapping.start) }
                   fill={ readMapping.color }/>;
    }.bind(this));
    return (
      <div className="genomeGraph">
        <svg width={this.props.width + this.props.margin.left + this.props.margin.right}
             height={this.props.height + this.props.margin.top + this.props.margin.bottom}>
          <g transform={graphTranslate}>
            <Axis translate={"translate(0," + this.props.height + ")"} orient="bottom" scale={xScale} />
            <text x={this.props.width / 2} y={this.props.height + 30} style={{textAnchor: "middle"}}>Position in genome</text>
            <Axis orient="left" scale={yScale} />
            <text transform="rotate(-90)" x={0 - this.props.height / 2} y={0 - 40} style={{textAnchor: "middle"}}>Number of reads</text>
            {bars}
          </g>
        </svg>
      </div>
    );
  }
});

function exists(item) { return item !== null && item !== undefined; }

function visibleItems(mappings, scale) {
  var left, right;
  left = scale.domain()[0];
  right = scale.domain()[1];
  // We create a set because there are nearly guaranteed to be duplicates.
  // On the left side, we truncate the position because a gene at the previous position may extend to the
  // current position, and we want to catch it.
  // On the right side, we truncate, because if we are between genes, the last whole number position will either
  // be a read that extends to the next position or not.
  var inRange = new Set(mappings.slice(Math.trunc(left), Math.trunc(right)).filter(exists));
  return Array.from(inRange);
}

export var GenomeVisualizer = React.createClass({
  width: 1000,
  height: 250,
  margin: { top: 10, right: 20, bottom: 50, left: 50 },
  readCeiling: 1000,
  getInitialState: function() {
    var xScale = d3.scale.linear().domain([0, this.width]).range([0, this.width]);
    var yScale = d3.scale.linear().domain([0, this.readCeiling]).range([this.height, 0]);
    return { selectedInsertionMapName: null, positionalInput: "",
             scales: { x: xScale, y: yScale } };
  },
  updatePositionalInput: function(e) {
    this.setState({ positionalInput: e.target.value });
  },
  panToPosition: function() {
    window.console.log("Should pan to: " + this.state.positionalInput);
  },
  updateSelectedInsertionMap: function(e) {
    this.setState({ selectedInsertionMapName: e.target.value });
  },
  addInsertionMap: function() {
    this.props.displayInsertionMap(this.state.selectedInsertionMapName);
  },
  render: function() {
    var mapOptions = this.props.displayableMapNames.sort().map(function(mapName) {
      return <option value={mapName}>{mapName}</option>;
    });
    var graphs = this.props.displayedInsertionMaps.map(function(displayedMap) {
      var visibleMappings = visibleItems(displayedMap.heightMappings, this.state.scales.x);
      // displayed map is... what? { heightMappings, name, genomeName... }
      return (
        <div className="graphContainer">
          <div className="graphHeader">
            <span>{displayedMap.name}</span>
            <button onclick={this.props.removeDisplayedMap}>Remove this graph</button>
          </div>
          <GenomeGraph scales={this.state.scales} width={this.width} height={this.height} margin={this.margin}
            visibleMappings={visibleMappings} />
        </div>
      );
    }.bind(this));
    return (
      <div>
        <div className="controlPanel">
          <div className="selectorDiv">
            <select onChange={this.updateSelectedInsertionMap} className="insertionMapSelector">
              { !this.state.selectedInsertionMapName && <option selected="true" disabled="disabled"></option> }
              {mapOptions}
            </select>
            <button disabled={!this.state.selectedInsertionMapName} onClick={this.addInsertionMap}>Add!</button>
          </div>
          <div className="navigationDiv">
            <span>Enter a gene or position: </span>
            <input type="text" onChange={this.updatePositionalInput} />
            <button onClick={this.panToPosition}>Pan</button>
          </div>
          <div className="insertionMaps">
            {graphs}
          </div>
        </div>
      </div>
    );
  }
});

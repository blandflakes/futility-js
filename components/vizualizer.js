import React from 'react';


export var GenomeVizualizer = React.createClass({
  getInitialState: function() {
    return { selectedInsertionMapName: null, positionalInput: "" };
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
      return <h1>{displayedMap.name}</h1>
    });
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

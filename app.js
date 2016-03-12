import React from 'react';
import ReactDOM from 'react-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { dataSetActions } from 'actions/ingest';
import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVizualizer } from 'components/vizualizer';
import { merge } from 'lib/func';

var App = React.createClass({
  // TODO add a "loading" state
  getInitialState: function() {
    return {
      genomes: {}, controls: {}, experiments: {},
      displayedInsertionMaps: [],
      loading: false
    };
  },
  displayInsertionMap: function(insertionMapName) {
    var mapToAdd;
    if (this.state.controls[insertionMapName]) {
      mapToAdd = this.state.controls[insertionMapName];
    }
    else if (this.state.experiments[insertionMapName]) {
      mapToAdd = this.state.experiments[insertionMapName];
    }
    else {
      alert("No data set found with name: " + insertionMapName);
      return;
    }
    this.setState({ displayedInsertionMaps: this.state.displayedInsertionMaps.concat([mapToAdd]) });
  },
  render: function() {
    var displayableMapNames = Object.keys(this.state.controls).concat(Object.keys(this.state.experiments));
    return (
      <Tabs>
        <TabList>
          <Tab>Genome Viewer</Tab>
          <Tab>Fitness Table</Tab>
          <Tab>Data Management</Tab>
        </TabList>
        <TabPanel>
          <GenomeVizualizer genomes={this.state.genomes} displayableMapNames={displayableMapNames}
            displayedInsertionMaps={this.state.displayedInsertionMaps} displayInsertionMap={this.displayInsertionMap}
            loading={this.state.loading} />
        </TabPanel>
        <TabPanel>
          <FitnessTable genomes={this.state.genomes} experiments={this.state.experiments} />
        </TabPanel>
        <TabPanel>
          <IngestDataInterface genomes={this.state.genomes} controls={this.state.controls}
            experiments={this.state.experiments} actions={dataSetActions(this)} loading={this.state.loading} />
        </TabPanel>
      </Tabs>
    );
  }
});
ReactDOM.render(
    <App />,
    document.getElementById('app')
);

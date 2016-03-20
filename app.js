import React from 'react';
import ReactDOM from 'react-dom';

import Loader from 'react-loader';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { dataSetActions } from 'actions/ingest';

import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVisualizer } from 'components/visualizer';

import { assoc, merge } from 'lib/func';

var App = React.createClass({
  getInitialState: function() {
    return {
      genomes: {}, controls: {}, experiments: {},
      displayedInsertionMaps: {},
      loading: false
    };
  },
  displayInsertionMap: function(insertionMap) {
    this.setState({ displayedInsertionMaps: assoc(this.state.displayedInsertionMaps, insertionMap.name, insertionMap) });
  },
  removeDisplayedMap: function(nameOfMapToRemove) {
    this.setState({ displayedInsertionMaps: dissoc(this.state.displayedInsertionMaps, nameOfMapToRemove) });
  },
  resetDisplayedMaps: function() {
    this.setState({ displayedInsertionMaps: {} });
  },
  render: function() {
    return (
      <Tabs>
        <TabList>
          <Tab>Genome Viewer</Tab>
          <Tab>Fitness Table</Tab>
          <Tab>Data Management</Tab>
        </TabList>
        <TabPanel>
          <GenomeVisualizer genomes={this.state.genomes} controls={this.state.controls} experiments={this.state.experiments}
            displayedInsertionMaps={this.state.displayedInsertionMaps} displayInsertionMap={this.displayInsertionMap}
            removeDisplayedMap={this.removeDisplayedMap} loading={this.state.loading} resetDisplayedMaps={this.resetDisplayedMaps} />
        </TabPanel>
        <TabPanel>
          <FitnessTable genomes={this.state.genomes} experiments={this.state.experiments} />
        </TabPanel>
        <TabPanel>
          <Loader loaded={!this.state.loading}>
            <IngestDataInterface genomes={this.state.genomes} controls={this.state.controls}
              experiments={this.state.experiments} actions={dataSetActions(this)} loading={this.state.loading} />
          </Loader>
        </TabPanel>
      </Tabs>
    );
  }
});
ReactDOM.render(
    <App />,
    document.getElementById('app')
);

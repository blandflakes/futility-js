import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { ingest } from 'reducers/ingest';
import { visualize } from 'reducers/visualizer.js';

import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVisualizer } from 'components/visualizer';

var reducers = combineReducers({ingest, visualize});
var store = createStore(reducers);

var App = React.createClass({
  render: function() {
    return (
      <Provider store={store} >
        <Tabs>
          <TabList>
            <Tab>Data Management</Tab>
            <Tab>Genome Viewer</Tab>
            <Tab>Fitness Table</Tab>
          </TabList>
          <TabPanel>
            <IngestDataInterface />
          </TabPanel>
          <TabPanel>
            <GenomeVisualizer />
          </TabPanel>
          <TabPanel>
            <FitnessTable />
          </TabPanel>
        </Tabs>
      </Provider>
    );
  }
});
ReactDOM.render(
    <App />,
    document.getElementById('app')
);

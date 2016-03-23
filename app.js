import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { ingest } from 'reducers/ingest';

import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVisualizer } from 'components/visualizer';

var store = createStore(ingest);

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

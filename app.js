import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { createStore } from 'redux';
import { ingest } from 'reducers/ingest';

import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVisualizer } from 'components/visualizer';
import { HelpInterface } from 'components/help';

const store = createStore(ingest);

var App = React.createClass({
  render: function() {
    return (
      <Provider store={store} >
        <Tabs>
          <TabList>
            <Tab>Data Management</Tab>
            <Tab>Genome Viewer</Tab>
            <Tab>Fitness Table</Tab>
            <Tab>Help</Tab>
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
          <TabPanel>
            <HelpInterface />
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

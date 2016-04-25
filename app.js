import React from 'react';
import ReactDOM from 'react-dom';

import { Provider, connect } from 'react-redux';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import { createStore } from 'redux';
import { ingest } from 'reducers/ingest';
import { startLoading, stopLoading, setAppState } from 'actions/ingest';

import { FitnessTable } from 'components/fitness';
import { IngestDataInterface } from 'components/ingest';
import { GenomeVisualizer } from 'components/visualizer';
import { HelpInterface } from 'components/help';

import { querySession } from 'lib/data';

const store = createStore(ingest);

const mapStateToProps = function(state) {
  return {
    loading: state.loading
  };
};

const mapDispatchToProps = function(dispatch) {
  return {
    startLoading: function() { dispatch(startLoading()); },
    stopLoading: function() { dispatch(stopLoading()); },
    setAppState: function(newState) { dispatch(setAppState(newState)); }
  };
};

var App = connect(mapStateToProps, mapDispatchToProps)(React.createClass({
  componentDidMount: function() {
    this.props.startLoading();
    querySession(function(data) {
      this.props.setAppState(data);
      this.props.stopLoading();
    }.bind(this),
    function(errorMessage) {
      alert("Failed to query session from server: " + errorMessage);
      this.props.stopLoading();
    }.bind(this));
  },
  render: function() {
    return (
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
    );
  }
}));

var ReduxWrapper = React.createClass({
  render: function() {
    return (
      <Provider store={store} >
        <App />
      </Provider>
    );
  }
});

ReactDOM.render(
  <ReduxWrapper />,
  document.getElementById('app')
);

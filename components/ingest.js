import React from 'react';
import Loader from 'react-loader';
import { connect } from 'react-redux';
import { startLoading, stopLoading, setAppState } from '../actions/ingest';
import { basename, readTextFile } from 'lib/files';
import { analyzeGenome, analyzeControl, analyzeExperiment } from 'lib/analysis';
import { removeControl, removeExperiment, removeGenome, restoreSession, saveSession  } from 'lib/data';

const WORK_DELAY_MS = 0;

const mapStateToProps = function(state) {
  return {
    loading: state.loading,
    genomeNames: state.genomes,
    controls: state.controls,
    controlNames: Object.keys(state.controls),
    experiments: state.experiments,
    experimentNames: Object.keys(state.experiments),
    allDataSetNames: Object.keys(state.controls).concat(Object.keys(state.experiments)).sort()
  };
}

const mapDispatchToProps = function(dispatch) {
  return {
    startLoading: function() { dispatch(startLoading()); },
    stopLoading: function() { dispatch(stopLoading()); },
    setAppState: function(newState) { dispatch(setAppState(newState)); }
  };
}

// properties:
// readyToImport: external conditions required for import are satisfied
// importFilesCallback: function to call once we've decided to import these files
// extensions: string of exceptions to put in 'accept'
// [filenameValidator]: called with each filename. Returns {pass: boolean, reason: "Can't overwrite..."}. If not present, no validation is done.
// [buttonLabel]: label for the button. If not provided, will be "Import"
var FilesUploader = React.createClass({
  getInitialState: function() {
    return { selectedFiles: [] };
  },
  updateSelectedFiles: function(e) {
    var fileList = e.target.files;
    var fileArray = [];
    for (var i = 0; i < fileList.length; ++i) {
      fileArray.push(fileList[i]);
    }
    this.setState({ selectedFiles: fileArray });
  },
  importFiles: function() {
    var files = this.state.selectedFiles;
    if (this.props.filenameValidator) {
      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var result = this.props.filenameValidator(file.name);
        if (!result.pass) {
          alert("Cannot import file '" + file.name + "': " + result.reason);
          return;
        }
      }
    }
    this.props.importFilesCallback(files);
  },
  render: function() {
    var buttonLabel = this.props.buttonLabel || "Import";
    return (
      <div className="textFilesImporter">
        <input type="file" onChange={this.updateSelectedFiles} multiple accept={this.props.extensions} />
        <button onClick={this.importFiles} disabled={!this.props.readyToImport || (this.state.selectedFiles.length === 0) }>{buttonLabel}</button>
      </div>
    );
  }
});

var GenomeUploader = React.createClass({
  validateGenomeName: function(filename) {
    var genomeName = basename(filename);
    if (this.props.genomeNames.includes(genomeName)) {
      return { pass: false, reason: "Cannot overwrite genome with name '" + genomeName + "'" };
    }
    return { pass: true };
  },
  importHelper: function(genomeFiles) {
    if (genomeFiles.length === 0) {
      this.props.stopLoading();
    }
    else {
      var next = genomeFiles.shift();
      var name = basename(next.name);
      setTimeout(function() {
        analyzeGenome(name, next, function(updatedState) {
          this.props.setAppState(updatedState);
          this.importHelper(genomeFiles);
        }.bind(this),
        function(error) {
          alert("Error handling '" + name + "': " + error + ". Aborting import here.");
          this.props.stopLoading();
        }.bind(this));
      }.bind(this), WORK_DELAY_MS);
    }
  },
  importGenomes: function(genomeFiles) {
    this.props.startLoading();
    this.importHelper(genomeFiles);
  },
  render: function() {
    return (
      <div className="genomeUploader">
        <h2>Import New Genome:</h2>
        <FilesUploader readyToImport={true} filenameValidator={this.validateGenomeName} importFilesCallback={this.importGenomes} extensions=".tsv" buttonLabel="Import Genome" />
      </div>
    );
  }
});


var ControlUploader = React.createClass({
  getInitialState: function() {
    return { selectedGenomeName: null };
  },
  componentWillReceiveProps: function(nextProps) {
    // Just reset the selected genome if it's been removed
    if (this.state.selectedGenomeName && !nextProps.genomeNames.includes(this.state.selectedGenomeName)) {
      this.setState({ selectedGenomeName: null});
    }
  },
  validateControlName: function(filename) {
    var controlName = basename(filename);
    if (this.props.allDataSetNames.includes(controlName)) {
      return { pass: false, reason: "Cannot overwrite data set with name '" + controlName + "'"};
    }
    return { pass: true };
  },
  updateSelectedGenomeName: function(e) {
    this.setState({ selectedGenomeName: e.target.value });
  },
  importHelper: function(genomeName, controlFiles) {
    if (controlFiles.length === 0) {
      this.props.stopLoading();
    }
    else {
      var next = controlFiles.shift();
      var name = basename(next.name);
      setTimeout(function() {
        analyzeControl(name, genomeName, next, function(updatedState) {
          this.props.setAppState(updatedState);
          this.importHelper(genomeName, controlFiles);
        }.bind(this),
        function(error) {
          alert("Error handling '" + name + "': " + error + ". Aborting import here.");
          this.props.stopLoading();
        }.bind(this));
      }.bind(this), WORK_DELAY_MS);
    }
  },
  importControls: function(controlFiles) {
    this.props.startLoading();
    this.importHelper(this.state.selectedGenomeName, controlFiles);
  },
  render: function() {
    var genomeOptions = this.props.genomeNames.sort().map(function(genomeName) {
      return <option value={genomeName} key={genomeName}>{genomeName}</option>;
    });
    return (
      <div className="controlUploader">
        <h2>Import New Control:</h2>
        <span>Genome: </span>
        <select value={this.state.selectedGenomeName} onChange={this.updateSelectedGenomeName} defaultValue="NONE_SELECTED" >
          { !this.state.selectedGenomeName && <option value="NONE_SELECTED" disabled="disabled">Select a genome</option> }
          {genomeOptions}
        </select>
        <br />
        <span>Select a control file:</span>
        <br />
        <FilesUploader readyToImport={this.state.selectedGenomeName} filenameValidator={this.validateControlName} importFilesCallback={this.importControls} extensions=".igv" buttonLabel="Import Controls"/>
      </div>
    );
  }
});


var ExperimentUploader = React.createClass({
  getInitialState: function() {
    return { selectedControlName: null };
  },
  componentWillReceiveProps: function(nextProps) {
    if (this.state.selectedControlName && !nextProps.controlNames.includes(this.state.selectedControlName)) {
      this.setState({ selectedControlName: null });
    }
  },
  updateSelectedControlName: function(e) {
    this.setState({ selectedControlName: e.target.value });
  },
  validateExperimentName: function(filename) {
    var experimentName = basename(filename);
    if (this.props.allDataSetNames.includes(experimentName)) {
      return { pass: false, reason: "Cannot overwrite data set with name '" + experimentName + "'"};
    }
    return { pass: true };
  },
  importHelper: function(genomeName, controlName, experimentFiles) {
    if (experimentFiles.length === 0) {
      this.props.stopLoading();
    }
    else {
      var next = experimentFiles.shift();
      var name = basename(next.name);
      setTimeout(function() {
        analyzeExperiment(name, genomeName, controlName, next, function(updatedState) {
          this.props.setAppState(updatedState);
          this.importHelper(genomeName, controlName, experimentFiles);
        }.bind(this),
        function(error) {
          alert("Error handling '" + name + "': " + error + ". Aborting import here.");
          this.props.stopLoading();
        }.bind(this));
      }.bind(this), WORK_DELAY_MS);
    }
  },
  importExperiments: function(experimentFiles) {
    this.props.startLoading();
    var control = this.props.controls[this.state.selectedControlName];
    this.importHelper(control.genomeName, control.name, experimentFiles);
  },
  render: function() {
    var controlOptions = this.props.controlNames.sort().map(function(controlName) {
      return <option value={controlName} key={controlName}>{controlName}</option>;
    });
    return (
      <div className="experimentUploader">
        <h2>Import Experiments:</h2>
        <span>Control file: </span>
        <select value={this.state.selectedControlName} onChange={this.updateSelectedControlName} defaultValue="NONE_SELECTED" >
          { !this.state.selectedControlName && <option value="NONE_SELECTED" disabled="disabled">Select a control file</option> }
          {controlOptions}
        </select>
        <br />
        <span>Select experiment files: </span>
        <br />
        <FilesUploader readyToImport={this.state.selectedControlName} filenameValidator={this.validateExperimentName} importFilesCallback={this.importExperiments} extensions=".igv" buttonLabel="Import Data"/>
      </div>
    );
  }
});


var DataViewer = React.createClass({
  removalCallback: function(newAppState) {
    this.props.setAppState(newAppState);
  },
  removalErrorHandler: function(errorMessage) {
    alert("Unable to remove data: " + errorMessage);
  },
  render: function() {
    var genomeRows = this.props.genomeNames.map(function(genomeName) {
      var boundRemoveGenome = function() { removeGenome(genomeName, this.removalCallback, this.removalErrorHandler); }.bind(this);
      return <tr key={genomeName}><td>{genomeName}</td><td><button onClick={boundRemoveGenome}>Remove</button></td></tr>;
    }.bind(this));
    var controlRows = this.props.controlNames.map(function(controlName) {
      var boundRemoveControl = function() { removeControl(controlName, this.props.setAppState, this.removalErrorHandler); }.bind(this);
      return <tr key={controlName}><td>{controlName}</td><td>{this.props.controls[controlName].genomeName}</td><td><button onClick={boundRemoveControl}>Remove</button></td></tr>;
    }.bind(this));
    var experimentRows = this.props.experimentNames.map(function(experimentName) {
      var boundRemoveExperiment = function() { removeExperiment(experimentName, this.props.setAppState, this.removalErrorHandler); }.bind(this);
      return <tr key={experimentName}><td>{experimentName}</td><td>{this.props.experiments[experimentName].controlName}</td><td><button onClick={boundRemoveExperiment}>Remove</button></td></tr>;
    }.bind(this));
    return (
      <div className="viewData">
        <h2>Loaded Genomes</h2>
        <p>This table shows all existing genome maps - they are used in calculating features and displaying
          labels in the visualizer. Note that if you remove a genome, it will remove all controls and therefore
          all experiments evaluated with that genome.</p>
        <table className="ingest">
          <tbody>
            <tr>
              <th>Name:</th>
            </tr>
            {genomeRows}
          </tbody>
        </table>
        <h2>Loaded Controls</h2>
        <p>This table shows all existing controls. These are used to normalize experiment files when we
          ingest them for analysis. Note that if you remove a control, it will remove all experiments
          normalized with that control.</p>
        <table className="ingest">
          <tbody>
            <tr>
              <th>Name:</th>
              <th>Linked Genome:</th>
            </tr>
            {controlRows}
          </tbody>
        </table>
        <h2>Loaded Experiments</h2>
        <p>This table shows all imported experiment files, with the control they were normalized against.
          You may remove any experiments that are no longer useful.</p>
        <table className="ingest">
          <tbody>
            <tr>
              <th>Name:</th>
              <th>Control used:</th>
            </tr>
            {experimentRows}
          </tbody>
        </table>
      </div>
    );
  }
});


export const IngestDataInterface = connect(mapStateToProps, mapDispatchToProps)(React.createClass({
  getInitialState: function() {
    return { importFilepath: "" };
  },
  updateImportFilepath: function(e) {
    this.setState({ importFilepath: e.target.value });
  },
  importState: function() {
    this.props.startLoading();
    restoreSession(this.state.importFilepath, function(newState) {
      this.setState({ importFilepath: "" });
      this.props.setAppState(newState);
      this.props.stopLoading();
    }.bind(this), function(errorMessage) {
      alert("Error restoring session: " + errorMessage);
    }.bind(this));
  },
  exportState: function() {
    this.props.startLoading();
    saveSession(function(data) {
      alert("Session saved to file with path: " + data.path);
      this.props.stopLoading();
    }.bind(this), function(errorMessage) {
      alert("Error saving session: " + errorMessage);
      this.props.stopLoading();
    }.bind(this));
  },
  render: function() {
    return (
      <Loader loaded={!this.props.loading}>
        <div>
          <div className="importSlashExport">
            <h1>Import/Export State</h1>
            <p>Use these options to import state (load previously analyzed sessions) or to export the current state to a file. Note that due to
              memory limitations in the browser, we'll return a filepath pointing to the session that you should keep somewhere safe, and take that filepath
              to restore the session.</p>
            <h2>Import</h2>
            <input className="importFilepathInput" placeholder="Path to session file" value={this.state.importFilepath} onChange={this.updateImportFilepath} />
            <button className="importButton" onClick={this.importState} disabled={!this.state.importFilepath}>Import State</button>
            <h2>Export</h2>
            <button className="exportButton" onClick={this.exportState}>Export State</button>
          </div>
          <div className="ingestData">
            <h1>Analyze Data Sets</h1>
            <GenomeUploader genomeNames={this.props.genomeNames} setAppState={this.props.setAppState}
              startLoading={this.props.startLoading} stopLoading={this.props.stopLoading}
              />
            <ControlUploader genomeNames={this.props.genomeNames} setAppState={this.props.setAppState}
              startLoading={this.props.startLoading} stopLoading={this.props.stopLoading} allDataSetNames={this.props.allDataSetNames}
              />
            <br />
            <ExperimentUploader addDataSet={this.props.addDataSet} genomeNames={this.props.genomeNames}
              controlNames={this.props.controlNames} controls={this.props.controls} startLoading={this.props.startLoading} stopLoading={this.props.stopLoading}
              allDataSetNames={this.props.allDataSetNames} setAppState={this.props.setAppState}
              />
          </div>
          <DataViewer genomeNames={this.props.genomeNames} controls={this.props.controls} experiments={this.props.experiments}
            controlNames={this.props.controlNames} experimentNames={this.props.experimentNames} setAppState={this.props.setAppState} />
        </div>
      </Loader>
    );
  }
}));


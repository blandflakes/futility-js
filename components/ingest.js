import React from 'react';
import Loader from 'react-loader';
import { connect } from 'react-redux';
import { addDataSets, addGenomes, startLoading, stopLoading, removeDataSet, removeGenome, setAppState } from '../actions/ingest';
import { basename, readTextFile } from 'lib/files';
import { analyzeGenome, analyzeControl, analyzeExperiment } from 'lib/analysis';


const mapStateToProps = function(state) {
  return {
    loading: state.loading,
    genomes: state.genomes,
    dataSets: state.dataSets,
    genomeNames: Object.keys(state.genomes),
    controlNames: Object.keys(state.dataSets).filter(function(dataSetName) { return state.dataSets[dataSetName].type === "control"; }),
    experimentNames: Object.keys(state.dataSets).filter(function(dataSetName) { return state.dataSets[dataSetName].type === "experiment"; })
  };
}

const mapDispatchToProps = function(dispatch) {
  return {
    startLoading: function() { dispatch(startLoading()); },
    stopLoading: function() { dispatch(stopLoading()); },
    addGenomes: function(genomeMaps) { dispatch(addGenomes(genomeMaps)); },
    removeGenome: function(name) { dispatch(removeGenome(name)); },
    addDataSets: function(dataSets) { dispatch(addDataSets(dataSets)); },
    removeDataSet: function(name) { dispatch(removeDataSet(name)); },
    setAppState: function(newState) { dispatch(setAppState(newState)); }
  };
}

// properties:
// readyToImport: external conditions required for import are satisfied
// textFilesCallback: function to call once text files have been imported (called on a list of {name: "", text: ""} objects)
// extensions: string of exceptions to put in 'accept'
// [filenameValidator]: called with just the filenames. Allows rejection based on name alone, before we've attempted to load data. Same return as dataValidator
// [dataValidator]: called with ({name: "name", text: "data"). Returns {pass: boolean, reason: "Can't overwrite..."}. If not present, no validation is done.
// [buttonLabel]: label for the button. If not provided, will be "Import"
var TextFilesUploader = React.createClass({
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
    var readFilePromises = files.map(function(file) { return readTextFile(file); });
    Promise.all(readFilePromises).then(function(readTextObjects) {
      if (this.props.dataValidator) {
        for (var i = 0; i < readTextObjects.length; ++i) {
          var readTextObject = readTextObjects[i];
          var result = this.props.dataValidator(readTextObject);
          if (!result.pass) {
            alert("Cannot handle data in file '" + readTextObject.name + "': " + result.reason);
            return;
          }
        }
      }
      this.props.textFilesCallback(readTextObjects);
    }.bind(this));
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

function asyncImportTask(textObjects, analysisCallback, importCallback) {
  this.props.startLoading();
  setTimeout(function() {
    var promises = textObjects.map(analysisCallback);
    Promise.all(promises).then(function(data) {
      importCallback(data);
      this.props.stopLoading();
    }.bind(this),
    function(error) {
      alert("Import failed: " + JSON.stringify(error));
      this.props.stopLoading();
    }.bind(this));
  }.bind(this), 0);
}

var GenomeUploader = React.createClass({
  asyncImportTask: asyncImportTask,
  validateGenomeName: function(filename) {
    var genomeName = basename(filename);
    if (this.props.genomes[genomeName]) {
      return { pass: false, reason: "Cannot overwrite genome with name '" + genomeName + "'" };
    }
    return { pass: true };
  },
  importGenomes: function(genomeTexts) {
    this.asyncImportTask(genomeTexts, function(textObject) { return analyzeGenome(basename(textObject.name), textObject.text); },
                    this.props.addGenomes);
  },
  render: function() {
    return (
      <div className="genomeUploader">
        <h2>Import New Genome:</h2>
        <TextFilesUploader readyToImport={true} filenameValidator={this.validateGenomeName} textFilesCallback={this.importGenomes} extensions=".tsv" buttonLabel="Import Genome" />
      </div>
    );
  }
});


var ControlUploader = React.createClass({
  asyncImportTask: asyncImportTask,
  getInitialState: function() {
    return { selectedGenomeName: null };
  },
  componentWillReceiveProps: function(nextProps) {
    // Just reset the selected genome if it's been removed
    if (this.state.selectedGenomeName && !nextProps.genomes[this.state.selectedGenomeName]) {
      this.setState({ selectedGenomeName: null});
    }
  },
  validateControlName: function(filename) {
    var controlName = basename(filename);
    if (this.props.dataSets[controlName]) {
      return { pass: false, reason: "Cannot overwrite data set with name '" + controlName + "'"};
    }
    return { pass: true };
  },
  updateSelectedGenomeName: function(e) {
    this.setState({ selectedGenomeName: e.target.value });
  },
  importControls: function(controlTexts) {
    var genomeName = this.state.selectedGenomeName;
    this.asyncImportTask(controlTexts, function(textObject) { return analyzeControl(basename(textObject.name), genomeName, textObject.text); },
                         this.props.addDataSets);
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
        <TextFilesUploader readyToImport={this.state.selectedGenomeName} filenameValidator={this.validateControlName} textFilesCallback={this.importControls} extensions=".igv" buttonLabel="Import Controls"/>
      </div>
    );
  }
});


var ExperimentUploader = React.createClass({
  asyncImportTask: asyncImportTask,
  getInitialState: function() {
    return { selectedControlName: null };
  },
  componentWillReceiveProps: function(nextProps) {
    if (this.state.selectedControlName && !nextProps.controlNames.include(this.state.selectedControlName)) {
      this.setState({ selectedControlName: null });
    }
  },
  updateSelectedControlName: function(e) {
    this.setState({ selectedControlName: e.target.value });
  },
  validateExperimentName: function(filename) {
    var experimentName = basename(filename);
    if (this.props.dataSets[experimentName]) {
      return { pass: false, reason: "Cannot overwrite data set with name '" + experimentName + "'"};
    }
    return { pass: true };
  },
  importExperiments: function(experimentTexts) {
    var control = this.props.dataSets[this.state.selectedControlName];
    var genome = this.props.genomes[control.genomeName];
    this.asyncImportTask(experimentTexts, function(textObject) { return analyzeExperiment(basename(textObject.name), genome, control, textObject.text); },
                         this.props.addDataSets);
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
        <TextFilesUploader readyToImport={this.state.selectedControlName} filenameValidator={this.validateExperimentName} textFilesCallback={this.importExperiments} extensions=".igv" buttonLabel="Import Data"/>
      </div>
    );
  }
});


var DataViewer = React.createClass({
  render: function() {
    var genomeRows = this.props.genomeNames.map(function(genomeName) {
      var boundRemoveGenome = this.props.removeGenome.bind(this, genomeName);
      return <tr key={genomeName}><td>{genomeName}</td><td><button onClick={boundRemoveGenome}>Remove</button></td></tr>;
    }.bind(this));
    var controlRows = this.props.controlNames.map(function(controlName) {
      var boundRemoveControl = this.props.removeDataSet.bind(this, controlName);
      return <tr key={controlName}><td>{controlName}</td><td>{this.props.dataSets[controlName].genomeName}</td><td><button onClick={boundRemoveControl}>Remove</button></td></tr>;
    }.bind(this));
    var experimentRows = this.props.experimentNames.map(function(experimentName) {
      var boundRemoveExperiment = this.props.removeDataSet.bind(this, experimentName);
      return <tr key={experimentName}><td>{experimentName}</td><td>{this.props.dataSets[experimentName].controlName}</td><td><button onClick={boundRemoveExperiment}>Remove</button></td></tr>;
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
    return { selectedImportFile: null };
  },
  updateSelectedImportFile: function(e) {
    this.setState({ selectedImportFile: e.target.files[0] });
  },
  importState: function() {
    this.props.startLoading();
    setTimeout(function() {
      readTextFile(this.state.selectedImportFile).then(function(textObject) {
        this.props.setAppState(JSON.parse(textObject.text));
        this.setState({ selectedImportFile: null });
        this.props.stopLoading();
      }.bind(this),
      function(error) {
        alert("Error importing state: " + error);
        this.setState({ selectedImportFile: null });
        this.props.stopLoading();
      }.bind(this));
    }.bind(this), 0);
  },
  exportState: function() {
    this.props.startLoading();
    setTimeout(function() {
      var contents = JSON.stringify({
        version: "1.0",
        genomes: this.props.genomes,
        dataSets: this.props.dataSets
      });
      var a = document.createElement("a");
      var file = new Blob([contents], { type: "application/json" });
      a.href = URL.createObjectURL(file);
      a.download = "futility.json";
      this.props.stopLoading();
      a.click();
    }.bind(this), 0);
  },
  render: function() {
    return (
      <div>
        <Loader loaded={!this.props.loading}>
          <div className="importSlashExport">
            <h1>Import/Export State</h1>
            <p>Use these options to import state (load previously analyzed sessions) or to export the current state to a file.</p>
            <h2>Import</h2>
            <input type="file" onChange={this.updateSelectedImportFile} accept=".json" />
            <button className="importButton" onClick={this.importState} disabled={!this.state.selectedImportFile}>Import State</button>
            <h2>Export</h2>
            <button className="exportButton" onClick={this.exportState}>Export State</button>
          </div>
          <div className="ingestData">
            <h1>Analyze Data Sets</h1>
            <GenomeUploader addGenomes={this.props.addGenomes} genomes={this.props.genomes}
              startLoading={this.props.startLoading} stopLoading={this.props.stopLoading}
              />
            <ControlUploader addDataSets={this.props.addDataSets} genomeNames={this.props.genomeNames}
              startLoading={this.props.startLoading} stopLoading={this.props.stopLoading} dataSets={this.props.dataSets}
              />
            <br />
            <ExperimentUploader addDataSets={this.props.addDataSets} genomes={this.props.genomes}
              controlNames={this.props.controlNames} startLoading={this.props.startLoading} stopLoading={this.props.stopLoading}
              dataSets={this.props.dataSets}
              />
          </div>
          <DataViewer genomeNames={this.props.genomeNames} controlNames={this.props.controlNames} dataSets={this.props.dataSets}
            experimentNames={this.props.experimentNames} removeGenome={this.props.removeGenome}
            removeDataSet={this.props.removeDataSet} />
        </Loader>
      </div>
    );
  }
}));


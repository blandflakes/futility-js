import React from 'react';
import { basename, readTextFile } from 'lib/files';
import { analyzeGenome, analyzeControl, analyzeExperiment } from 'lib/analysis';


function fileArray(filesObj) {
  var fileArray = []
  for (var i = 0; i < filesObj.length; ++i) {
    fileArray.push(fileList[i]);
  }
  return fileArray;
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


var GenomeUploader = React.createClass({
  validateGenomeName: function(filename) {
    var genomeName = basename(filename);
    if (this.props.genomes[genomeName]) {
      return { pass: false, reason: "Cannot overwrite genome with name '" + genomeName + "'" };
    }
    return { pass: true };
  },
  importGenomes: function(genomeTexts) {
    this.props.setIsLoading(true);
    var genomePromises = genomeTexts.map(function(readTextObject) {
      return analyzeGenome(basename(readTextObject.name), readTextObject.text);
    });
    Promise.all(genomePromises).then(function(genomes) {
      this.props.addGenomes(genomes);
      this.props.setIsLoading(false);
    }.bind(this),
    function(error) {
      alert("Failed to load genomes: " + error);
      this.props.setIsLoading(false);
    }.bind(this));
  },
  render: function() {
    return (
      <div className="genomeUploader">
        <h2>Import New Genome:</h2>
        <TextFilesUploader readyToImport={!this.props.loading} filenameValidator={this.validateGenomeName} textFilesCallback={this.importGenomes} extensions=".tsv" buttonLabel="Import Genome" />
      </div>
    );
  }
});


var ControlUploader = React.createClass({
  getInitialState: function() {
    return { selectedGenome: null };
  },
  componentWillReceiveProps: function(nextProps) {
    // Just reset the selected genome if it's been removed
    if (this.state.selectedGenome && !nextProps.genomes[this.state.selectedGenome.name]) {
      this.setState({ selectedGenome: null});
    }
  },
  validateControlName: function(filename) {
    var controlName = basename(filename);
    if (this.props.controls[controlName]) {
      return { pass: false, reason: "Cannot overwrite control with name '" + controlName + "'" };
    }
    else if (this.props.experiments[controlName]) {
      return { pass: false, reason: "Experiment already exists with name '" + controlName + "'" };
    }
    return { pass: true };
  },
  updateSelectedGenome: function(e) {
    this.setState({ selectedGenome: this.props.genomes[e.target.value] });
  },
  importControls: function(controlTexts) {
    this.props.setIsLoading(true);
    var genome = this.state.selectedGenome;
    var controlPromises = controlTexts.map(function(readTextObject) {
      return analyzeControl(basename(readTextObject.name), genome.name, readTextObject.text);
    });
    Promise.all(controlPromises).then(function(controls) {
      this.props.addControls(controls);
      this.props.setIsLoading(false);
    }.bind(this),
    function(error) {
      alert("Error loading controls: " + error);
      this.props.setIsLoading(false);
    }.bind(this));
  },
  render: function() {
    var genomeOptions = Object.keys(this.props.genomes).sort().map(function(genomeName) {
      return <option value={genomeName}>{genomeName}</option>;
    });
    return (
      <div className="controlUploader">
        <h2>Import New Control:</h2>
        <span>Select a genome: </span>
        <select value={this.state.selectedGenome && this.state.selectedGenome.name} onChange={this.updateSelectedGenome}>
          { !this.state.selectedGenome && <option selected="true" disabled="disabled"></option> }
          {genomeOptions}
        </select>
        <br />
        <span>Select a control file:</span>
        <br />
        <TextFilesUploader readyToImport={!this.props.loading && this.state.selectedGenome} filenameValidator={this.validateControlName} textFilesCallback={this.importControls} extensions=".igv" buttonLabel="Import Controls"/>
      </div>
    );
  }
});


var ExperimentUploader = React.createClass({
  getInitialState: function() {
    return { selectedControl: null };
  },
  componentWillReceiveProps: function(nextProps) {
    if (this.state.selectedControl && !nextProps.controls[this.state.selectedControl.name]) {
      this.setState({ selectedControl: null });
    }
  },
  updateSelectedControl: function(e) {
    this.setState({ selectedControl: this.props.controls[e.target.value] });
  },
  validateExperimentName: function(filename) {
    var experimentName = basename(filename);
    if (this.props.experiments[experimentName]) {
      return { pass: false, reason: "Cannot overwrite experiment with name '" + experimentName + "'" };
    }
    else if (this.props.controls[experimentName]) {
      return { pass: false, reason: "Control already exists with name '" + experimentName + "'" };
    }
    return { pass: true };
  },
  importExperiments: function(experimentTexts) {
    this.props.setIsLoading(true);
    var control = this.state.selectedControl;
    var genome = this.props.genomes[control.genomeName];
    var experimentPromises = experimentTexts.map(function(readTextObject) {
      return analyzeExperiment(basename(readTextObject.name), genome, control, readTextObject.text);
    });
    Promise.all(experimentPromises).then(function(experiments) {
      this.props.addExperiments(experiments);
      this.props.setIsLoading(false);
    }.bind(this),
    function(error) {
      alert("Error loading experiments: " + error)
      this.props.setIsLoading(false);
    }.bind(this));
  },
  render: function() {
    var controlOptions = Object.keys(this.props.controls).sort().map(function(controlName) {
      return <option value={controlName}>{controlName}</option>;
    });
    return (
      <div className="experimentUploader">
        <h2>Import Experiments:</h2>
        <span>Select a control file: </span>
        <select value={this.state.selectedControl && this.state.selectedControl.name} onChange={this.updateSelectedControl}>
          { !this.state.selectedControl && <option selected="true" disabled="disabled"></option> }
          {controlOptions}
        </select>
        <br />
        <span>Select experiment files: </span>
        <br />
        <TextFilesUploader readyToImport={!this.props.loading && this.state.selectedControl} filenameValidator={this.validateExperimentName} textFilesCallback={this.importExperiments} extensions=".igv" buttonLabel="Import Data"/>
      </div>
    );
  }
});


var DataViewer = React.createClass({
  render: function() {
    var genomeRows = Object.keys(this.props.genomes).map(function(genomeName) {
      var boundRemoveGenome = this.props.removeGenome.bind(this, genomeName);
      return <tr><td>{genomeName}</td><td><button onClick={boundRemoveGenome}>Remove</button></td></tr>;
    }.bind(this));
    var controls = this.props.controls;
    var controlRows = Object.keys(controls).map(function(controlName) {
      var boundRemoveControl = this.props.removeControl.bind(this, controlName);
      return <tr><td>{controlName}</td><td>{controls[controlName].genomeName}</td><td><button onClick={boundRemoveControl}>Remove</button></td></tr>;
    }.bind(this));
    var experiments = this.props.experiments;
    var experimentRows = Object.keys(experiments).map(function(experimentName) {
      var boundRemoveExperiment = this.props.removeExperiment.bind(this, experimentName);
      return <tr><td>{experimentName}</td><td>{experiments[experimentName].controlName}</td><td><button onClick={boundRemoveExperiment}>Remove</button></td></tr>;
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


export var IngestDataInterface = React.createClass({
  render: function() {
    return (
      <div>
        <div className="ingestData">
          <h1>Manage Data Sets</h1>
          { this.props.loading && <h2>Please wait, loading...</h2> }
          <GenomeUploader addGenomes={this.props.actions.addGenomes} genomes={this.props.genomes}
            loading={this.props.loading} setIsLoading={this.props.actions.setIsLoading} />
          <ControlUploader addControls={this.props.actions.addControls} genomes={this.props.genomes}
            controls={this.props.controls} experiments={this.props.experiments} loading={this.props.loading}
            setIsLoading={this.props.actions.setIsLoading} />
          <br />
          <ExperimentUploader addExperiments={this.props.actions.addExperiments} genomes={this.props.genomes}
            controls={this.props.controls} experiments={this.props.experiments} loading={this.props.loading}
            setIsLoading={this.props.actions.setIsLoading} />
        </div>
        <DataViewer genomes={this.props.genomes} controls={this.props.controls}
          experiments={this.props.experiments} removeGenome={this.props.actions.removeGenome}
          removeControl={this.props.actions.removeControl} removeExperiment={this.props.actions.removeExperiment} />
      </div>
    );
  }
});

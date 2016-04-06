import d3 from 'd3';

// Doing this external to the worker because it needs D3 for the scale, and getting that into the worker is hell on earth.
// Good thing we figured out the red threshold while we were building the mappings.
function tagColors(heightListing, stats) {
  window.console.log("About to tag mappings with color.");
  var colorScale = d3.scale.linear().domain([1, stats.redThreshold]).clamp(true);
  colorScale.domain([0, 0.5, 1].map(colorScale.invert));
  colorScale.range(["blue", "red"]);
  for (var i = 0; i < heightListing.length; ++i) {
    var listing = heightListing[i];
    if (listing && !listing.color) {
      listing.color = colorScale(listing.reads);
    }
  }
}

var webWorker = null;

function getWorker() {
  if (window.Worker) {
    if (!webWorker) {
      webWorker = new Worker('workers/analysis.js');
    }
    return webWorker;
  }
  throw "Worker isn't supported in this browser. We won't be able to perform any analysis.";
}

export function analyzeGenome(name, text, ingestionCallback, errorCallback) {
  var worker = getWorker();
  worker.onmessage = function(e) {
    window.console.log("Got result back from worker.");
    ingestionCallback(e.data);
  };
  worker.onerror = function(e) {
    errorCallback(e.message);
  };
  worker.postMessage({ action: "GENOME", payload: { name: name, text: text } });
}

export function analyzeControl(name, genomeName, text, ingestionCallback, errorCallback) {
  var worker = getWorker();
  worker.onmessage = function(e) {
    window.console.log("Got result back from worker.");
    // But wait, tag with colors.
    tagColors(e.data.heightMappings, e.data.stats);
    ingestionCallback(e.data);
  };
  worker.onerror = function(e) {
    errorCallback(e.message);
  };
  worker.postMessage({ action: "CONTROL", payload: { name: name, genomeName: genomeName, text: text } });
}

export function analyzeExperiment(name, genome, control, text, ingestionCallback, errorCallback) {
  var worker = getWorker();
  worker.onmessage = function(e) {
    window.console.log("Got result back from worker.");
    // But wait, tag with colors.
    tagColors(e.data.heightMappings, e.data.stats);
    ingestionCallback(e.data);
  };
  worker.onerror = function(e) {
    errorCallback(e.message);
  };
  worker.postMessage({ action: "EXPERIMENT", payload: { name: name, genome: genome, control: control, text: text } });
}

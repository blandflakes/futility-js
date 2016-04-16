import $ from 'jquery';
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

function submitWork(formData, success, error) {
  $.ajax({
    url: '/analyze',
    type: 'POST',
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    success: success,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function analyzeGenome(name, file, ingestionCallback, errorCallback) {
  var formData = new FormData();
  formData.append('analysisType', 'GENOME');
  formData.append('name', name);
  formData.append('file', file);
  submitWork(formData, ingestionCallback, errorCallback);
}

export function analyzeControl(name, genomeName, file, ingestionCallback, errorCallback) {
  var formData = new FormData();
  formData.append('analysisType', 'CONTROL');
  formData.append('name', name);
  formData.append('genomeName', genomeName);
  formData.append('file', file);
  submitWork(formData, function(data) {
    // But wait, tag with colors.
    tagColors(data.sequenceMeasurements.rawData, data.sequenceMeasurements.stats);
    ingestionCallback(data);
  }, errorCallback);
}

export function analyzeExperiment(name, genome, control, file, ingestionCallback, errorCallback) {
  var formData = new FormData();
  formData.append('analysisType', 'EXPERIMENT');
  formData.append('name', name);
  formData.append('genome', JSON.stringify(genome));
  formData.append('control', JSON.stringify(control));
  formData.append('file', file);
  submitWork(formData, function(data) {
    // But wait, tag with colors.
    tagColors(data.sequenceMeasurements.rawData, data.sequenceMeasurements.stats);
    ingestionCallback(data);
  }, errorCallback);
}

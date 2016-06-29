import $ from 'jquery';
import d3 from 'd3';

// Doing this here because we use a d3 scale for it. Would make sense to put it server-side or cache the results
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

function removeData(name, type, success, error) {
  $.ajax({
    url: "remove-data",
    data: { name: name, type: type },
    type: "POST",
    success: success,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function removeGenome(name, success, error) {
  removeData(name, "GENOME", success, error);
}

export function removeControl(name, success, error) {
  removeData(name, "CONTROL", success, error);
}

export function removeExperiment(name, success, error) {
  removeData(name, "EXPERIMENT", success, error);
}

export function queryFeatures(genomeName, geneName, success, error) {
  $.ajax({
    url: "query",
    data: { queryType: "FEATURES", genomeName: genomeName, geneName: geneName },
    success: success,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function queryGenome(genomeName, success, error) {
  $.ajax({
    url: "query",
    data: { queryType: "GENOME", genomeName: genomeName },
    // Sent as a file, so we want to treat it as JSON.
    dataType: "json",
    success: success,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function queryControlMeasurements(controlName, success, error) {
  $.ajax({
    url: "query",
    data: { queryType: "CONTROL_MEASUREMENTS", controlName: controlName },
    // Sent as a file, so we want to treat it as JSON.
    dataType: "json",
    success: function(data) {
      // But wait, tag with colors.
      tagColors(data.rawData, data.stats);
      // Name isn't provided by the service, set it here
      data.name = controlName;
      success(data);
    },
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function queryExperimentMeasurements(experimentName, success, error) {
  $.ajax({
    url: "query",
    data: { queryType: "EXPERIMENT_MEASUREMENTS", experimentName: experimentName },
    // Sent as a file, so we want to treat it as JSON.
    dataType: "json",
    success: function(data) {
      // But wait, tag with colors.
      tagColors(data.rawData, data.stats);
      // Name isn't provided by the service, set it here
      data.name = experimentName;
      success(data);
    },
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function querySession(callback, error) {
  $.ajax({
    url: "query",
    data: { queryType: "SESSION" },
    success: callback,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}

export function clearSession(callback, error) {
  $.ajax({
    url: "clear-session",
    type: "POST",
    success: callback,
    error: function(jqXhr, textStatus, errorMessage) { error(errorMessage); }
  });
}


import $ from 'jquery';

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
  submitWork(formData, ingestionCallback, errorCallback);
}

export function analyzeExperiment(name, genomeName, controlName, file, ingestionCallback, errorCallback) {
  var formData = new FormData();
  formData.append('analysisType', 'EXPERIMENT');
  formData.append('name', name);
  formData.append('genomeName', genomeName);
  formData.append('controlName', controlName);
  formData.append('file', file);
  submitWork(formData, ingestionCallback, errorCallback);
}

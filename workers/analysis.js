importScripts('multinomial.js', 'mannwhitneyu.js');

// Polyfills because web workers don't let me use JSPM as easily... ug.
if (!Object.keys) Object.keys = function(o) {
  if (o !== Object(o))
    throw new TypeError('Object.keys called on a non-object');
  var k=[],p;
  for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
  return k;
}

if (!Object.values) {
  Object.values = function values(obj) {
    var values = [];
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        values.push(obj[key]);
      }
    }
    return values;
  };
}
// End of polyfills

function initializeArray(size, value) {
  var arr = Array(size);
  for (var i = 0; i < size; ++i) {
    arr[i] = value;
  }
  return arr;
} // end initializeArray

function sum(numArray) {
  return numArray.reduce(function(a, b) {
    return a + b;
  }, 0);
}

function parseIgvLine(line) {
  var vals = line.split(/\s+/);
  // Convert the integer values to integers here.
  return [vals[0], parseInt(vals[1], 10), parseInt(vals[2], 10), parseInt(vals[3], 10), vals[4]];
}

/* Breaks the text format of the igv file into a tabular array
 * Use this instead of re-parsing every time.
 */
function igvData(text) {
  var lines = text.trim().split("\n");
  return lines.map(parseIgvLine);
}

/* Generates some stats that are used later in analysis. */
function countReadStats(data) {
  var totalSiteReads = 0;
  var siteHits = 0;
  for (var i = 0; i < data.length; ++i) {
    var row = data[i];
    // column three is number of reads
    var reads = row[3];
    if (reads > 0) {
      ++siteHits;
      totalSiteReads += reads;
    }
  }
  // Column 2 is the end of a read site. Here, we're getting the end of the last one so we know
  // how large the genome is.
  var maxPosition = data[data.length - 1][2];
  return {siteHits: siteHits, totalSiteReads: totalSiteReads, maxPosition: maxPosition};
}

function createIgvObject(text) {
  var rawData = igvData(text);
  var stats = countReadStats(rawData);
  return { rawData: rawData, stats: stats };
}

function analyzeControl(name, genomeName, controlText) {
  var igv = createIgvObject(controlText);
  var heightMappings = deriveHeightListing(igv.rawData, igv.stats);
  return { name: name, genomeName: genomeName, heightMappings: heightMappings, rawData: igv.rawData, stats: igv.stats, type: "control"};
}

/* Copies the value into the index at the positions [start, end) */
function injectReferences(index, value, start, end) {
  for (var position = start; position < end; ++position) {
    index[position] = value;
  }
}

/* Generates an object which maps a genome name to "read mappings", which are {name: String, start: int, end: int} */
function generateGenomeMap(genomeMapTsv) {
  var genomeMap = {};
  var lines = genomeMapTsv.trim().split("\n");
  var line;
  for (var i = 0; i < lines.length; ++i) {
    line = lines[i];
    var vals = line.split(/\t/);
    genomeMap[vals[0]] = {name: vals[0], start: parseInt(vals[1], 10), end: parseInt(vals[2], 10)};
  }
  return genomeMap;
}

/* Generates a listing with a reference to the mapping at each position where it is relevant (TODO this is memory inefficient)  (TODO, this also is very similar to generating height listings) */
function generateGenomeListing(genomeMap) {
  var listing = [];
  var keys = Object.keys(genomeMap);
  for (var i = 0, gene = keys[i]; i < keys.length; ++i) {
    var mapping = genomeMap[gene];
    injectReferences(listing, mapping, mapping.start, mapping.end);
  }
  return listing;
}

function analyzeGenome(name, genomeText) {
  var genomeMap = generateGenomeMap(genomeText);
  var genomeListing = generateGenomeListing(genomeMap);
  return { name: name, map: genomeMap, listing: genomeListing };
}

/* Naively gets the item at the provided percentile (roughly). If this becomes a bottleneck on loading new
    sequences, we can speed this up by ~logn by calculating how many items from the back the nth percentile item
    should be and iterating over the array, keeping track of that many items in a heap or a smaller array. */
function atPercentile(percentile, data, mappingFun) {
  if (!mappingFun) {
    mappingFun = function(data) { return data; };
  }
  var sorted = data.concat().sort(mappingFun);
  var thresholdIndex = Math.floor(percentile * sorted.length);
  return sorted[thresholdIndex];
}

// [IgvLine] -> [{start:Int, end: Int, reads: Int}]
// Where IgvLine is roughly [String, Int, Int, Int]
// Creates an array where each position in the array points to
// a mapping.
function deriveHeightListing(rawIgvData, stats) {
  var distinctMappings = [];
  for (var i = 0; i < rawIgvData.length; ++i) {
    var row = rawIgvData[i];
    var readPosition = { start: row[1],
                          end: row[2],
                          reads: row[3]
                        };
    if (readPosition.reads === 0) { continue; }
    distinctMappings.push(readPosition);
  }

  // While we're here, we'd like to tag color. We can't, however, because the color scale is a d3 object
  // and this is running in a shitty web worker. So we'll shove a threshold in the stats object which can be
  // used to build the scale later.
  stats.redThreshold = atPercentile(0.99999, distinctMappings, function(first, second) { return first.reads - second.reads }).reads;

  var last = distinctMappings[distinctMappings.length - 1];
  var mappings = Array(last.end);
  for (var i = 0; i < distinctMappings.length; ++i) {
    var mapping = distinctMappings[i];
    // We do this so we can easily slice into the array of mappings (the array of mappings is basically a mapping of
    // position to read information)
    injectReferences(mappings, mapping, mapping.start, mapping.end);
  }
  return mappings;
}

function correctionStep(samples, numExperiments) {
  // The original algorithm transposes the sample and goes to the end of the first column. We haven't
  // transposed, so we go to the end of the first row. Still feels arbitrary, but...
  // Original algorithm also made a matrix of this identical value, which I shouldn't need to do.
  var difference = numExperiments - samples[0][samples[0].length - 1];
  // Another case where a giant matrix was made...
  var correction = numExperiments / difference;
  var corrected = samples.map(function(row) {
    // We do one fewer on the slice to remove the extra proportion we added before
    var withoutInverseProportion = row.slice(0, row.length - 1);
    return withoutInverseProportion.map(function(value) {
      return correction * value;
    });
  });
  return corrected;
}

function averageStep(correctedSamples, numSamples) {
  // Need to calculate the average for each column...
  var average = [];
  var row, value;
  for (var rowNum = 0; rowNum < correctedSamples.length; ++rowNum) {
    row = correctedSamples[rowNum];
    for (var colNum = 0; colNum < row.length; ++ colNum) {
      value = row[colNum];
      if (average[colNum]) {
        average[colNum] += value;
      }
      else {
        average[colNum] = value;
      }
    }
  }
  return average.map(function(sum) { return sum / numSamples; });
}

function normalizeStep(averages, normalizeeRawData) {
  var normalizedData = Array(averages.length);
  for (var i = 0; i < averages.length; ++i) {
    var normalizedReads = averages[i];
    var initialData = normalizeeRawData[i];
    normalizedData[i] = [initialData[0], initialData[1], initialData[2], normalizedReads, initialData[4]];
  }
  return normalizedData;
}

// Normalizes the normalizee down to the scale of the normalizer.
// Normalizer has fewer reads than normalizee
function normalize(normalizee, normalizer) {
  // Get some set up information before a descent into promise madness.
  var numSamples = 100;
  var inputReads = normalizee.rawData.map(function(row) { return row[3]; });
  var proportion = normalizer.stats.siteHits / normalizee.stats.siteHits;
  reducedNormalizedReads = inputReads.map(function(reads) {
    return proportion * reads / normalizee.stats.totalSiteReads;
  });
  reducedNormalizedReads.push(1 - proportion);

  // We'll use a single variable - hopefully reassigning this instead of holding on to references or
  // descending a closure/call stack will let garbage collection occur, reducing memory usage.
  var workingData = multinomial(normalizer.stats.totalSiteReads, reducedNormalizedReads, numSamples);
  workingData = correctionStep(workingData, normalizer.stats.totalSiteReads);
  workingData = averageStep(workingData, numSamples);
  workingData = normalizeStep(workingData, normalizee.rawData);
  return workingData;
}

// Function that calculates Benjamini-Hochberg FDR q-values. Argument required is a list of [geneName, pVal] tuples,
// return type is a map of geneName -> pVal
function bhQValues(pVals) {
  // sort by pval
  pVals = pVals.sort(function(left, right) {
    return left.p - right.p;
  });
  var m = pVals.length;
  var qVals = {};
  // Get the pVal from the last pVal record
  var minCoeff = pVals[pVals.length - 1].p;
  // set the last pVal's gene to the minCoeff
  qVals[pVals[pVals.length - 1].geneName] = minCoeff;
  var coeff;
  for (var j = m - 2; j >= 0; --j) {
    coeff = m * pVals[j].p / (j + 1);
    if (coeff < minCoeff) {
      minCoeff = coeff;
    }
    qVals[pVals[j].geneName] = minCoeff;
  }
  return qVals;
}

function replacePWithBhq(features) {
  // gene_fdr_taboutput
  // get a map of geneName->qValue
  var qVals = bhQValues(Object.keys(features).map(function(geneName) { return { geneName: geneName, p: features[geneName][5] }; }));
  // Remove the pVal and replace it with the qVal.
  Object.keys(qVals).forEach(function(geneName) {
    features[geneName].pop();
    features[geneName].push(qVals[geneName]);
  });
}

function deriveFeatures(controlData, experimentData, genomeMap) {
  var rawControlData, rawExperimentData;
  if (controlData.stats.siteHits > experimentData.stats.siteHits) {
    console.log("Will normalize the control data.");
    rawControlData = normalize(controlData, experimentData);
    rawExperimentData = experimentData.rawData;
  }
  else {
    console.log("Will normalize the experiment data.");
    rawControlData = controlData.rawData;
    rawExperimentData = normalize(experimentData, controlData);
  }
  var geneReads = { controlReads: {}, experimentReads: {} };
  var geneNames = Object.keys(genomeMap);

  // Initialize maps
  for (var i = 0; i < geneNames.length; ++i) {
    var geneName = geneNames[i];
    geneReads.controlReads[geneName] = [];
    geneReads.experimentReads[geneName] = [];
  }

  var groupReadsByGene = function(destinationMap) {
    return function(row) {
      var geneName = row[4];
      if (geneName && genomeMap[geneName]) {
        var site = row[1];
        var start = genomeMap[geneName].start;
        var end = genomeMap[geneName].end;
        var geneLength = end - start;
        if (start + (0.03 * geneLength) <= site && site <= (end - (0.03 * geneLength))) {
          destinationMap[geneName].push(row[3]);
        }
      }
    };
  };

  controlData.rawData.forEach(groupReadsByGene(geneReads.controlReads));
  experimentData.rawData.forEach(groupReadsByGene(geneReads.experimentReads));

  var features = {};
  var totalControlReads = 0;
  var totalExperimentReads = 0;

  var geneName;
  for (var i = 0; i < geneNames.length; ++i) {
    geneName = geneNames[i];
    var gene = genomeMap[geneName];
    var controlCounts = geneReads.controlReads[geneName];
    var experimentCounts = geneReads.experimentReads[geneName];
    var TA = controlCounts.length;
    var geneControlReadsCount = sum(controlCounts);
    var geneExperimentReadsCount = sum(experimentCounts);
    var geneLength = gene.end - gene.start;
    if (TA === 0 || (geneControlReadsCount === 0 && geneExperimentReadsCount === 0)) {
      features[geneName] = [TA, geneLength, 0, 0, 0, 0];
    }
    totalControlReads += geneControlReadsCount;
    totalExperimentReads += geneExperimentReadsCount;
    var countRatio = (geneExperimentReadsCount + 1) / (geneControlReadsCount + 1);
    var pVal = test(controlCounts, experimentCounts).p;
    features[geneName] = [TA, geneLength, geneControlReadsCount, geneExperimentReadsCount, countRatio, pVal];
  }

  replacePWithBhq(features);

  var minControlReads = totalControlReads / 10000;
  var minExperimentReads = totalExperimentReads / 10000;
  Object.keys(features).forEach(function(geneName) {
    var featureList = features[geneName];
    var TASites = featureList[0];
    var geneLength = featureList[1];
    var controlReads = featureList[2];
    var experimentReads = featureList[3];
    var significantControlReads = Math.min(controlReads, minControlReads);
    var significantExperimentReads = Math.min(experimentReads, minExperimentReads);
    var p = featureList[5];
    var correctedRatio = significantControlReads === 0 ? 0 : significantExperimentReads / significantControlReads;
    var index = significantExperimentReads / geneLength;
    var fitness = correctedRatio * index;
    features[geneName] = {
      TASites: TASites,
      geneLength: geneLength,
      controlReads: controlReads,
      experimentReads: experimentReads,
      correctedRatio: correctedRatio,
      p: p,
      index: index,
      fitness: fitness
    };
  });

  // Get the feature maps and sort them by the fitness
  var featuresObjects = Object.values(features).sort(function(f1, f2) {
    return f1.fitness - f2.fitness;
  });

  for (var i = 0; i < featuresObjects.length; ++i) {
    featuresObjects[i].fitness = i / featuresObjects.length;
  }

  return features;
}

function analyzeExperiment(name, analyzedGenome, analyzedControl, experimentText) {
  var igv = createIgvObject(experimentText);
  var heightMappings = deriveHeightListing(igv.rawData, igv.stats);
  var features = deriveFeatures({ rawData: analyzedControl.rawData, stats: analyzedControl.stats }, igv, analyzedGenome.map);
  return { name: name, controlName: analyzedControl.name, genomeName: analyzedGenome.name, heightMappings: heightMappings, stats: igv.stats, features: features, type: "experiment"};
}

onmessage = function(e) {
  var action = e.data.action;
  var payload = e.data.payload;
  var result;
  switch (action) {
    case "GENOME":
      console.log("Received request to analyze genome.");
      result = analyzeGenome(payload.name, payload.text);
      console.log("Genome analysis complete.");
      break;
    case "CONTROL":
      console.log("Received request to analyze control.");
      result = analyzeControl(payload.name, payload.genomeName, payload.text);
      console.log("Control analysis complete.");
      break;
    case "EXPERIMENT":
      console.log("Received request to analyze experiment.");
      result = analyzeExperiment(payload.name, payload.genome, payload.control, payload.text);
      console.log("Experiment analysis complete.");
      break;
    default:
      throw "Unexpected action: " + action;
  }
  postMessage(result);
};

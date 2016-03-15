import { multinomial } from 'lib/stats';
import { test as mannwhitneyu } from 'lib/mannwhitneyu';
import d3 from 'd3';

// All public functions of this file return a promise.

/* Naively gets the item at the provided percentile (roughly). If this becomes a bottleneck on loading new
    sequences, we can speed this up by ~logn by calculating how many items from the back the nth percentile item
    should be and iterating over the array, keeping track of that many items in a heap or a smaller array. */
function atPercentile(percentile, data, mapping_fn) {
  if (!mapping_fn) {
    mapping_fn = function(data) { return data; };
  }
  var sorted = data.concat().sort(mapping_fn);
  var threshold_index = Math.floor(percentile * sorted.length);
  return sorted[threshold_index];
}

// converts a tsv that has the format
// gene\tstart\tend
// into an object with structure { SAOUHSC_00001 : {start: 12, end: 45}}
function generateGenomeMap(genomeMapTsv) {
  var genomeMap = {};
  var lines = genomeMapTsv.trim().split("\n");
  lines.forEach(function(line) {
    var vals = line.split(/\t/);
    genomeMap[vals[0]] = {name: vals[0], start: parseInt(vals[1], 10), end: parseInt(vals[2], 10)};
  });
  return genomeMap;
}

/* Copies the value into the index at the positions [start, end) */
function injectReferences(index, value, start, end) {
  for (var position = start; position < end; ++position) {
    index[position] = value;
  }
}

function generateGenomeListing(genomeMap) {
  var listing = [];
  Object.keys(genomeMap).forEach(function(gene) {
    var mapping = genomeMap[gene];
    injectReferences(listing, mapping, mapping.start, mapping.end);
  });
  return listing;
}

export function analyzeGenome(name, genomeText) {
  return new Promise(function(resolve, reject) {
    var genomeMap = generateGenomeMap(genomeText);
    var genomeListing = generateGenomeListing(genomeMap);
    resolve({ name: name, map: genomeMap, listing: genomeListing });
  });
}

// String -> [{start:Int, end: Int, reads: Int}]
// Creates an array where each position in the array points to
// a mapping. Condenses adjacent mappings of the same height to
// point to the same object. Also applies any taggers
function deriveHeightListing(rawIgvData, taggers) {
  var canCoalesce = function(left, right) {
    return left.end === right.start && left.reads === right.reads;
  }

  var distinctMappings = [];
  for (var i = 0; i < rawIgvData.length; ++i) {
    var row = rawIgvData[i];
    var readPosition = { start: row[1],
                          end: row[2],
                          reads: row[3]
                        };
    if (readPosition.reads === 0) { continue; }
    if (distinctMappings.length > 0) {
      var previousMapping = distinctMappings[distinctMappings.length - 1];
      if (canCoalesce(previousMapping, readPosition)) {
        previousMapping.end = readPosition.end;
        continue;
      }
    }
    distinctMappings.push(readPosition);
  }
  // We'll do color tagging while we're here
  var redThreshold = atPercentile(0.9999, distinctMappings, function(first, second) { return first.reads - second.reads }).reads;
  var colorScale = d3.scale.linear().domain([1, redThreshold]).clamp(true);
  colorScale.domain([0, 0.5, 1].map(colorScale.invert));
  colorScale.range(["blue", "red"]);

  var last = distinctMappings[distinctMappings.length - 1];
  var mappings = Array(last.end);
  for (var i = 0; i < distinctMappings.length; ++i) {
    var mapping = distinctMappings[i];
    mapping.color = colorScale(mapping.reads);
    // We do this so we can easily slice into the array of mappings (the array of mappings is basically a mapping of
    // position to read information)
    injectReferences(mappings, mapping, mapping.start, mapping.end);
  }
  return mappings;
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

function countReadStats(data) {
  var totalSiteReads = 0;
  var siteHits = 0;
  data.forEach(function(row) {
    // third column is number of reads
    var reads = row[3];
    if (reads > 0) {
      ++siteHits;
      totalSiteReads += reads;
    }
  });
  return {siteHits: siteHits, totalSiteReads: totalSiteReads};
}

function createIgvObject(text) {
  var rawData = igvData(text);
  var stats = countReadStats(rawData);
  return { rawData: rawData, stats: stats };
}

export function analyzeControl(name, genomeName, controlText) {
  return new Promise(function(resolve, reject) {
    var igv = createIgvObject(controlText);
    var heightMappings = deriveHeightListing(igv.rawData);
    resolve({ name: name, genomeName: genomeName, heightMappings: heightMappings, backingIgv: igv });
  });
}

export function analyzeExperiment(name, analyzedGenome, analyzedControl, experimentText) {
  var igv = createIgvObject(experimentText);
  var heightMappings = deriveHeightListing(igv.rawData);
  return deriveFeatures(analyzedControl.backingIgv, igv, analyzedGenome.map).then(function(features) {
    return { name: name, controlName: analyzedControl.name, genomeName: analyzedGenome.name, heightMappings: heightMappings, backingIgv: igv, features: features };
  });
}

// Normalizes the normalizee down to the scale of the normalizer.
// Normalizer has fewer reads than normalizee
function normalize(normalizee, normalizer) {
  // Get some set up information before a descent into promise madness.
  const numSamples = 100;
  var inputReads = normalizee.rawData.map(function(row) { return row[3]; });
  var proportion = normalizer.stats.siteHits / normalizee.stats.siteHits;
  reducedNormalizedReads = inputReads.map(function(reads) {
    return proportion * reads / normalizee.stats.totalSiteReads;
  });
  reducedNormalizedReads.push(1 - proportion);

  // perform mulitnomial sampling. This is insanely slow, so we'll do it asynchronously, and hopefully in parallel.
  var samplesPromise = multinomial(normalizer.stats.totalSiteReads, reducedNormalizedReads, numSamples);
  // for now, do the rest of the calculations in one giant promise once we have samples.
  return samplesPromise.then(function(samples) {
    // The original algorithm transposes the sample and goes to the end of the first column. We haven't
    // transposed, so we go to the end of the first row. Still feels arbitrary, but...
    // Original algorithm also made a matrix of this identical value, which I shouldn't need to do.

    var difference = normalizer.stats.totalSiteReads - samples[0][samples[0].length - 1];
    // Another case where a giant matrix was made...
    var correction = normalizer.stats.totalSiteReads / difference;
    var corrected = samples.map(function(row) {
      // We do one fewer on the slice to remove the extra proportion we added before
      var withoutInverseProportion = row.slice(0, row.length - 1);
      return withoutInverseProportion.map(function(value) {
        return correction * value;
      });
    });
    // Need to calculate the average for each column...
    var average = []
    corrected.forEach(function(row) {
      row.forEach(function(value, columnIndex) {
        if (average[columnIndex]) {
          average[columnIndex] += value;
        }
        else {
          average[columnIndex] = value;
        }
      });
    });
    average = average.map(function(sum) { return sum / numSamples; });
    var normalizedData = [];
    average.forEach(function(normalizedReads, index) {
      var initialData = normalizee.rawData[index];
      // strainName, start, end, numReads, geneName
      normalizedData.push([initialData[0], initialData[1], initialData[2], normalizedReads, initialData[4]]);
    });
    return normalizedData;
  });
}

function sum(numArray) {
  return numArray.reduce(function(a, b) {
    return a + b;
  }, 0);
};

// Function that calculates Benjamini-Hochberg FDR q-values. Argument required is a list of [geneName, pVal] tuples
function bhQValues(pVals) {
  // sort by pval
  pVals = pVals.sort(function(left, right) {
    return left[1] - right[1];
  });
  var m = pVals.length;
  var qVals = {};
  // Get the pVal from the last pVal record
  var minCoeff = pVals[pVals.length - 1][1];
  // set the last pVal's gene to the minCoeff
  qVals[pVals[pVals.length -1][0]] = minCoeff;
  var coeff;
  for (var j = m - 2; j >= 0; --j) {
    coeff = m * pVals[j][1] / (j + 1);
    if (coeff < minCoeff) {
      minCoeff = coeff;
    }
    qVals[pVals[j][0]] = minCoeff;
  }
  return qVals;
}

export function deriveFeatures(controlData, experimentData, genomeMap) {
  // We need to return a promise which depends on normalization. For now, we figure out
  // what the normalization promise is, and then do all remaining work in a chained promise.
  var rawDataPromise;
  if (controlData.stats.siteHits > experimentData.stats.siteHits) {
    window.console.log("Will normalize the control data.");
    rawDataPromise = normalize(controlData, experimentData).then(function(rawControlData) {
      return({ rawControlData: rawControlData, rawExperimentData: experimentData.rawData });
    });
  }
  else {
    window.console.log("Will normalize the experiment data.");
    rawDataPromise = normalize(experimentData, controlData).then(function(rawExperimentData) {
      return({ rawControlData: controlData.rawData, rawExperimentData: rawExperimentData });
    });
  }
  return rawDataPromise.then(function(rawData) {
    var rawControlData = rawData.rawControlData;
    var rawExperimentData = rawData.rawExperimentData;

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

    geneNames.map(function(geneName) {
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
      // TODO better name for this
      var countRatio = (geneExperimentReadsCount + 1) / (geneControlReadsCount + 1);
      var pVal = mannwhitneyu(controlCounts, experimentCounts).p;
      features[geneName] = [TA, geneLength, geneControlReadsCount, geneExperimentReadsCount, countRatio, pVal];
    });

    // gene_fdr_taboutput
    // get a map of geneName->qValue
    // TODO could probably make the bhq function more readable by passing in a list of objects
    // pVal
    var qVals = bhQValues(Object.keys(features).map(function(geneName) { return [geneName, features[geneName][5]]; }));
    // Remove the pVal and replace it with the qVal.
    Object.keys(qVals).forEach(function(geneName) {
      features[geneName].pop();
      features[geneName].push(qVals[geneName]);
    });
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
      var correctedRatio = significantExperimentReads / significantControlReads;
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

    // Get the featurelists and sort them by the fitness
    var featuresObjects = Object.values(features).sort(function(f1, f2) {
      return f1.fitness - f2.fitness;
    });

    // Add a normalized fitness based on the position in the list.
    // Replace the raw fitness score with the normalized fitness score
    featuresObjects.forEach(function(features, index) {
      features.fitness = index / featuresObjects.length;
    });

    return features;
  });
}

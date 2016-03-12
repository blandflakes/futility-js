import threadify from 'threadify';

function buildWindows(probabilities) {
  // We're going to build a nested structure that looks a bit like a radix sort.
  // It will only be three levels deep - based on the tenths, hundredths, and thousandths
  // places of a probability
  const windows = Array(10);
  for (var i = 0; i < windows.length; ++i) {
    windows[i] = Array(10);
    for (var j = 0; j < windows[i].length; ++j) {
      windows[i][j] = Array(10);
      for (var k = 0; k < windows[i][j].length; ++k) {
        windows[i][j][k] = [];
      }
    }
  }

  var runningSum = 0;
  var tenths, hundredths, thousandths;
  for (var index = 0; index < probabilities.length; ++index) {
    prob = probabilities[index];
    if (prob > 0) {
      runningSum += prob;
      if (runningSum < 1) {
        tenths = Math.floor(runningSum * 10);
      }
      else {
        tenths = Math.floor(runningSum);
      }
      hundredths = Math.floor((runningSum * 100) % 10);
      thousandths = Math.floor((runningSum * 1000) % 10);
      windows[tenths][hundredths][thousandths].push({maxThreshold: runningSum, index: index});
    }
  }
  return windows;
}

// All functions we depend on are inlined so this can be threadified
function sample(windows, numExperiments, sizeOfResults, numSamples) {
  var findTriggeredWindow = function(p, allWindows) {
    // p should never be 1, since it's the result of a random roll.
    var tenthsDigit = Math.floor(p * 10);
    var hundredthsDigit = Math.floor((p * 100) % 10);
    var thousandthsDigit = Math.floor((p * 1000) % 10);
    var candidateTenths = allWindows;
    // We need to find the first window after windows[tenths][hundredths] that has a threshold higher than p
    // We'll use 10 for the max on all these loops since this is pretty hardcoded for the base. This loop gets executed A LOT
    for (var tenthsIndex = tenthsDigit; tenthsIndex < 10; ++tenthsIndex) {
      var candidateHundredths = candidateTenths[tenthsIndex];
      for (var hundredthsIndex = hundredthsDigit; hundredthsIndex < 10; ++hundredthsIndex) {
        var candidateThousandths = candidateHundredths[hundredthsIndex];
        for (var thousandthsIndex = thousandthsDigit; thousandthsIndex < 10; ++ thousandthsIndex) {
          var candidateProbs = candidateThousandths[thousandthsIndex];
          // At this point we have a list of thresholds. Look for the first one that's bigger than p.
          var triggeredWindow = null;
          for (var i = 0; i < candidateProbs.length && !triggeredWindow; ++i) {
            if (candidateProbs[i].maxThreshold >= p) {
              triggeredWindow = candidateProbs[i];
            }
          }
          // If we found one, let's get the fuck out of here
          if (triggeredWindow) {
            return triggeredWindow;
          }
        }
        // Reset thousandths index
        thousandthsDigit = 0;
      }
      // After the first iteration, these needs to be reset to 0 so we can start at the beginning of
      // the next tenth instead of the middle.
      hundredthsDigit = 0;
    }
    // At this point, we searched the entire set of windows for a sum of probabilities greater than p
    // and didn't find one. Return null, the caller will have to deal with this.
    return null;
  }; // end findTriggeredWindow
  var initializeArray = function(size, value) {
    var arr = Array(size);
    for (var i = 0; i < size; ++i) {
      arr[i] = value;
    }
    return arr;
  }; // end initializeArray
  var results = [];
  for (var i = 0; i < numSamples; ++i) {
    var result = initializeArray(sizeOfResults, 0);
    var experiment = numExperiments;
    var p, triggeredWindow;
    while (experiment > 0) {
      p = Math.random();
      triggeredWindow = findTriggeredWindow(p, windows);
      if (triggeredWindow) {
        ++result[triggeredWindow.index];
      }
      else {
        // p was greater than any sum of probabilities, default to last one (numpy behavior)
        ++result[result.length - 1];
      }
      --experiment;
    }
    results.push(result);
  }
  return results;
}

// This function will spawn a worker to work on each sample. Each worker is spawned within a promise,
// which lets us wait on the output of the workers.
function parallelMultinomial(windows, numExperiments, sizeOfResults, numSamples) {
  var numThreads = 4;
  var threadedSample = threadify(sample);
  window.console.log("Spawning workers.");
  var results = [];
  // Spawning workers is expensive. Still, we want to thread this work. Maybe 3-4 threads?
  var blockSize = numSamples / numThreads;
  var samplingPromises = [];
  for (var blockNum = 0; blockNum < numThreads; ++blockNum) {
    samplingPromises.push(new Promise(function(resolve, reject) {
      var job = threadedSample(windows, numExperiments, sizeOfResults, Math.min(blockSize, numSamples - blockSize * blockNum));
      job.done = function(result) {
        resolve(result);
      };
      job.failed = function(error) {
        reject(error);
      };
    }));
    window.console.log("Spawned worker: " + blockNum);
  }
  window.console.log("Workers spawned.");
  return Promise.all(samplingPromises).then(function(blocks) {
    window.console.log("Workers done.");
    var combinedSamples = Array(numSamples);
    var index = 0;
    blocks.forEach(function(blockOfSamples) {
      blockOfSamples.forEach(function(sample) {
        combinedSamples[index] = sample;
        ++index;
      });
    });
    window.console.log("Combined result of each worker.");
    return combinedSamples;
  });
}

export function serialMultinomial(windows, numExperiments, sizeOfResults, numSamples) {
  return Promise.resolve(sample(windows, numExperiments, sizeOfResults, numSamples));
}

// Results are a list of promises
export function multinomial(numExperiments, probabilities, numSamples) {
  window.console.log("Building probability windows.");
  const windows = buildWindows(probabilities);
  if (window.Worker) {
    window.console.log("WebWorkers detected. Using parallel multinomial.");
    return parallelMultinomial(windows, numExperiments, probabilities.length, numSamples);
  }
  else {
    window.console.log("No WebWorkers detected. Using serial multinomial.");
    return serialMultinomial(windows, numExperiments, probabilities.length, numSamples);
  }
}

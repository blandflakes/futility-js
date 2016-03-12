// File -> (String -> _File -> a) -> Void
function readTextFile(file) {
  var reader = new FileReader();
  return new Promise(function(resolve, reject) {
    reader.onload = function(e) {
      var text = e.target.result;
      resolve({name: file.name, text: text});
    };
    reader.onerror = function(e) {
      reject({name: file.name, error: e});
    };
    reader.readAsText(file);
  });
}

// String -> String
function basename(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

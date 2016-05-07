hosted contains the static files that make up the website which hosts futility.
# futility-lib

This project contains the front-end for the [futility project](https://f-utility.hms.harvard.edu/).

The "dist" directory contains the analysis tool front-end. The "hosted" directory contains the information pages on the project page.

## Installation

### Requirements

1. npm
2. jspm (install via npm)

### Installation
    $ ./build.sh
    $ ./deploy.sh

'build.sh' creates the tool front-end in dist. 'deploy.sh' creates a minified version.


### Usage

The files in dist should be copied into futility-server's resources/public directory.

These files are a front-end to futility-server. They are responsible for managing data sets, comparing features, and visualizing data.

## License

Copyright © 2016 Brian Fults

Do whatever you want with this code. If it's helpful, send me a beer. If it's horrible, pretend I didn't write it, but in any case please give me credit if your work is any sort of derivation.

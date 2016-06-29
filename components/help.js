import React from 'react';

export const HelpInterface = React.createClass({
  render: function() {
    return (
      <div>
        <h1>Usage</h1>
        <h2>How do I get my data in?</h2>
        <p>Click "Data Management." Under "Analyze Data Sets", you can import various data types. Genomes are TSV files containing a map of each gene in the genome with its start and end positions.
          Controls and experiments are both IGV files. A control must be associated with a genome, and likewise an experiment must be associated with a control.</p>
        <h2>How do I use the visualizer?</h2>
        <p>Click "Genome Viewer." Here you can select a genome and then any of the loaded data sets. Click "Add!". This will display a positional visualization of the number
          of sequence reads for that data set. Multiple sets can be loaded at once. For more detail, zoom in by scrolling on one of the graphs. Panning can be done by clicking
          and dragging a graph, or by typing a numerical position or gene name in the pan input.</p>
        <h2>How do I see the results of the analysis?</h2>
        <p>Click "Fitness Table." Here, you can select a genome, and then a gene within that genome. We'll load the analyzed features from each imported experiment and display them in
          the table. The table can be sorted by clicking on the columns.</p>
        <h2>How do I save my work?</h2>
        <p>Your work is already saved under whichever directory you told futility to persist the session in (it defaults to ./futility-session). Future executions of this tool will reuse your session. You can back this directory up if you want to save your progress.</p>
        <h1>Problems</h1>
        <h2>I'm seeing "java.lang.OutOfMemoryError: Java heap space" or 'Error handling "file.igv" java heap space'</h2>
        <p>The Java Virtual Machine starts up with different heap space settings on each machine. You can start the project with more heap space by doing something like:
          <pre>java -Xmx 2048m -jar futility.jar</pre>
          This will start up the virtual machine with 2048 megabytes of heap space. We had no issues testing with 4096 megabytes.</p>
      </div>);
  }
});

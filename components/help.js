import React from 'react';

export const HelpInterface = React.createClass({
  render: function() {
    return (
      <div>
        <h1>How do I get my data in?</h1>
        <p>Click "Data Management." Under "Analyze Data Sets", you can import various data types. Genomes are TSV files containing a map of each gene in the genome with its start and end positions.
          Controls and experiments are both IGV files. A control must be associated with a genome, and likewise an experiment must be associated with a control.</p>
        <h1>How do I use the visualizer?</h1>
        <p>Click "Genome Viewer." Here you can select a genome and then any of the loaded data sets. Click "Add!". This will display a positional visualization of the number
          of sequence reads for that data set. Multiple sets can be loaded at once. For more detail, zoom in by scrolling on one of the graphs. Panning can be done by clicking
          and dragging a graph, or by typing a numerical position or gene name in the pan input.</p>
        <h1>How do I see the results of the analysis?</h1>
        <p>Click "Fitness Table." Here, you can select a genome, and then a gene within that genome. We'll load the analyzed features from each imported experiment and display them in
          the table. The table can be sorted by clicking on the columns.</p>
        <h1>How do I save my work?</h1>
        <p>Under "Data Management", a section called "Import/Export State" allows you to export the current analyzed data (click "Export State"). This file can be imported later, which saves having to run the data through the analysis again.</p>
      </div>);
  }
});
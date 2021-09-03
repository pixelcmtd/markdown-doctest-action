"use strict";

const isStartOfSnippet = (line) =>
  line.trim().match(/```\W*(c|cpp|cc)\s?$/i);
const isEndOfSnippet = (line) => line.trim() === "```";

function startNewSnippet(snippets, fileName, lineNumber) {
  return Object.assign(snippets, {
    snippets: snippets.snippets.concat([
      { code: "", fileName, lineNumber, complete: false }
    ])
  });
}

function addLineToLastSnippet(line) {
  return function addLine(snippets) {
    const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

    if (lastSnippet && !lastSnippet.complete) {
      lastSnippet.code += line + "\n";
    }

    return snippets;
  };
}

function endSnippet(snippets, fileName, lineNumber) {
  const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

  if (lastSnippet) {
    lastSnippet.complete = true;
  }

  return snippets;
}

function parseLine(line) {
  if (isStartOfSnippet(line)) {
    return startNewSnippet;
  }

  if (isEndOfSnippet(line)) {
    return endSnippet;
  }

  return addLineToLastSnippet(line);
}

function parseCodeSnippets(args) {
  const contents = args.contents;
  const fileName = args.fileName;

  const initialState = {
    snippets: [],
    complete: false
  };

  const results = contents
    .split("\n")
    .map(parseLine)
    .reduce(
      (snippets, lineAction, index) =>
        lineAction(snippets, fileName, index + 1),
      initialState
    );

  const codeSnippets = results.snippets;

  const lastSnippet = codeSnippets[codeSnippets.length - 1];

  if (lastSnippet && !lastSnippet.complete) {
    throw new Error("Snippet parsing was incomplete");
  }

  return {
    fileName,
    codeSnippets,
  };
}

export default parseCodeSnippets;

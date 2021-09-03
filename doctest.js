"use strict";

// TODO: concat all

const isStartOfSnippet = (line) =>
  line.trim().match(/```(?<lang>[a-zA-Z]+)$/i);
const isEndOfSnippet = (line) => line.trim() === "```";

const startNewSnippet = match =>
function (snippets, fileName, lineNumber) {
  return Object.assign(snippets, {
    snippets: snippets.snippets.concat([
      { code: "", fileName, lineNumber, lang: match.groups['lang'], complete: false }
    ])
  });
}

const addLineToLastSnippet = line => snippets => {
  const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

  if (lastSnippet && !lastSnippet.complete) {
    lastSnippet.code += line + "\n";
  }

  return snippets;
};

function endSnippet(snippets, fileName, lineNumber) {
  const lastSnippet = snippets.snippets[snippets.snippets.length - 1];

  if (lastSnippet) {
    lastSnippet.complete = true;
  }

  return snippets;
}

function parseLine(line) {
  const start = isStartOfSnippet(line);
  if (start) {
    return startNewSnippet(start);
  }

  if (isEndOfSnippet(line)) {
    return endSnippet;
  }

  return addLineToLastSnippet(line);
}

function parseCodeSnippets(args) {
  const contents = args.contents;
  const fileName = args.fileName;

  const results = contents
    .split("\n")
    .map(parseLine)
    .reduce(
      (snippets, lineAction, index) => lineAction(snippets, fileName, index + 1),
      { snippets: [], complete: false });

  const codeSnippets = results.snippets;

  const lastSnippet = codeSnippets[codeSnippets.length - 1];

  if (lastSnippet && !lastSnippet.complete) {
    throw new Error("Snippet parsing was incomplete");
  }

  return { fileName, codeSnippets };
}



const { readFileSync, writeFileSync } = require("fs");
const { execSync } = require("child_process");
const { getInput } = require("@actions/core");

const runTests = (fileName, config) => testFile(config)(parseCodeSnippets({ contents: readFileSync(fileName, "utf8"), fileName }));

const testFile = (config) => (args) => args.codeSnippets.map(test(config, args.fileName));

const tempfile = () => "/tmp/doctest" + Math.floor(Math.random() * (2 ** 35) + 2 ** 35).toString(36);

function test(config, filename) {
  return (codeSnippet) => {
    let success = false;
    let stack = "";

    const codefile = tempfile() + '.' + codeSnippet.lang;
    const binfile = tempfile();

    writeFileSync(codefile, codeSnippet.code);

    try {
      execSync(`${config.compiler} ${config.flags} ${codefile} -o ${binfile}`);
      execSync(`${binfile}`);
      success = true;
    } catch (e) {
      stack = `${e}\n\n${e.stack}`;
    }

    process.stdout.write(success ? "." : "x");
    return { status: success ? "pass" : "fail", codeSnippet, stack };
  };
}

function printResults(results) {
  results.filter((res) => res.status === "fail").forEach(printFailure);

  const passingCount = results.filter((res) => res.status === "pass").length;
  const failingCount = results.filter((res) => res.status === "fail").length;

  const successfulRun = () => failingCount === 0;

  console.log("Passed: " + passingCount);

  if (successfulRun()) {
    console.log("\nSuccess!");
  } else {
    console.log("Failed: " + failingCount);
  }
}

function printFailure(result) {
  console.log(`Failed - ${markDownErrorLocation(result)}`);
  console.log(result.stack);
}

function markDownErrorLocation(result) {
  const match = result.stack.match(/eval.*<.*>:(\d+):(\d+)/);

  if (match) {
    const mdLineNumber = parseInt(match[1], 10);
    const columnNumber = parseInt(match[2], 10);

    const lineNumber = result.codeSnippet.lineNumber + mdLineNumber;

    return `${result.codeSnippet.fileName}:${lineNumber}:${columnNumber}`;
  }

  return `${result.codeSnippet.fileName}:${result.codeSnippet.lineNumber}`;
}

const file = getInput("file");
const compiler = getInput("compiler");
const flags = getInput("flags");

const results = runTests(file, {compiler, flags});
printResults(results);
process.exit(results.filter(r => r.status === "fail").length);

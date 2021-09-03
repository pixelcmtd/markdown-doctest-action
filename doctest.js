"use strict";

const { readFileSync } = require("fs");
const { execSync } = require("child_process");
const { getInput } = require("@actions/core");
const { parseCodeSnippets } = require("./parse-code-snippets-from-markdown");

function flatten(arr) {
  return Array.prototype.concat.apply([], arr);
}

function runTests(fileName, config) {
  return flatten(testFile(config)(parseCodeSnippets({ contents: readFileSync(fileName, "utf8"), fileName })));
}

const testFile = (config) => (args) => args.codeSnippets.map(test(config, args.fileName));

const tempfile = () => "/tmp/doctest" + Math.floor(Math.random() * (2 ** 36)).toString(36);

function test(config, filename) {
  return (codeSnippet) => {
    let success = false;
    let stack = "";

    let code = codeSnippet.code;
    const codefile = tempfile() + ".cc";
    const binfile = tempfile();

    try {
      execSync(`${config.compiler} ${config.flags} ${codefile} -o ${binfile}`);
      execSync(`${binfile}`);
      success = true;
    } catch (e) {
      stack = e.stack || "";
    }

    process.stdout.write(success ? "." : "x");

    return { status: success ? "pass" : "fail", codeSnippet, stack };
  };
}

function printResults(results) {
  results.filter((result) => result.status === "fail").forEach(printFailure);

  const passingCount = results.filter((result) => result.status === "pass")
    .length;
  const failingCount = results.filter((result) => result.status === "fail")
    .length;

  function successfulRun() {
    return failingCount === 0;
  }

  console.log("Passed: " + passingCount);

  if (successfulRun()) {
    console.log("\nSuccess!");
  } else {
    console.log("Failed: " + failingCount);
  }
}

function printFailure(result) {
  console.log(`Failed - ${markDownErrorLocation(result)}`);
  console.log(relevantStackDetails(result.stack));
}

function relevantStackDetails(stack) {
  const match = stack.match(/([\w\W]*?)at eval/) ||
    stack.match(/([\w\W]*)at [\w*\/]*?doctest.js/);

  if (match !== null) {
    return match[1];
  }

  return stack;
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

runTests(file, {compiler, flags});

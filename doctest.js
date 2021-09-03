"use strict";

import readFileSync from "fs";
import getInput from "@actions/core";
import parseCodeSnippets from "./parse-code-snippets-from-markdown";

function flatten(arr) {
  return Array.prototype.concat.apply([], arr);
}

export function runTests(files, config) {
  const results = files
    .map(read)
    .map(parseCodeSnippets)
    .map(testFile(config));

  return flatten(results);
}

function read(fileName) {
  return { contents: readFileSync(fileName, "utf8"), fileName };
}

function testFile(config) {
  return function testFileWithConfig(args) {
    const codeSnippets = args.codeSnippets;
    const fileName = args.fileName;
    const shareCodeInFile = args.shareCodeInFile;

    return codeSnippets.map(test(config, fileName));
  };
}

function test(config, filename) {
  return (codeSnippet) => {
    if (codeSnippet.skip) {
      return { status: "skip", codeSnippet, stack: "" };
    }

    let success = false;
    let stack = "";

    let code = codeSnippet.code;

    if (config.beforeEach) {
      config.beforeEach();
    }

    const options = {
      presets: [presetEnv],
    };

    try {

      success = true;
    } catch (e) {
      stack = e.stack || "";
    }

    process.stdout.write(success ? "." : "x");

    return { status: success ? "pass" : "fail", codeSnippet, stack };
  };
}

export function printResults(results) {
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

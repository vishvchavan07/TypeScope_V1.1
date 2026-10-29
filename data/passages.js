/**
 * TypeScope — Typing Passages Data (Phase 2 Extended)
 * data/passages.js
 *
 * 15 original passages across three difficulty tiers.
 * Each entry: id, title, text.
 * wordCount is included for reference only; all live metrics
 * are computed character-by-character by the typing engine.
 *
 * Related: JavaScript Essentials 1 — Arrays and Objects
 */

"use strict";

const PASSAGES = {
  /* ───────── BEGINNER ─────────
     Short sentences, common words, minimal punctuation.            */
  beginner: [
    {
      id: "b1",
      title: "Everyday Computing",
      text: "A computer is a machine that can store and process information. Most computers rely on a binary system that uses two variables, zero and one, to complete tasks. Computers come in many forms including personal computers and smartphones.",
    },
    {
      id: "b2",
      title: "The Internet",
      text: "The internet is a global network of computers connected to each other. It allows people to share information, communicate, and access services from anywhere in the world. Every device on the internet has a unique address called an IP address.",
    },
    {
      id: "b3",
      title: "Data in Daily Life",
      text: "Data is information that has been collected and stored. We generate data every day when we use apps, browse the web, or make a purchase. This data can be analysed to find patterns and make better decisions.",
    },
    {
      id: "b4",
      title: "What is an Algorithm?",
      text: "An algorithm is a set of step-by-step instructions for solving a problem. Recipes, driving directions, and search engines all use algorithms. Writing clear algorithms is the foundation of computer programming.",
    },
    {
      id: "b5",
      title: "Input and Output",
      text: "Every computer program takes some input, processes it, and produces an output. A calculator takes numbers as input and gives a result as output. Understanding this simple flow helps you design better programs and understand how software works.",
    },
  ],

  /* ───────── INTERMEDIATE ─────────
     Technical vocabulary, compound sentences, mixed punctuation.  */
  intermediate: [
    {
      id: "i1",
      title: "JavaScript Variables",
      text: "In JavaScript, variables are containers that store data values. You can declare a variable using the keywords let, const, or var. The keyword let is used for variables that may change, while const is used for values that remain constant throughout the program.",
    },
    {
      id: "i2",
      title: "Functions and Scope",
      text: "A function is a reusable block of code designed to perform a specific task. Functions help keep code organised, readable, and efficient. Variables declared inside a function are local to that function and cannot be accessed from the outside, which is known as function scope.",
    },
    {
      id: "i3",
      title: "Arrays in JavaScript",
      text: "An array is a special variable that can hold more than one value at a time. Arrays are declared using square brackets and elements are separated by commas. You can access individual items using their index, which starts at zero in JavaScript.",
    },
    {
      id: "i4",
      title: "Data Analytics Overview",
      text: "Data analytics is the process of examining raw data to find trends and answer questions. Analysts use statistical methods and visualisation tools to interpret large datasets. The goal is to turn raw numbers into actionable insights that help organisations make informed decisions.",
    },
    {
      id: "i5",
      title: "Event-Driven Programming",
      text: "In event-driven programming, the flow of the program is controlled by events such as mouse clicks, keyboard presses, or network responses. JavaScript handles events through event listeners attached to DOM elements. This model makes applications feel responsive and interactive to the user.",
    },
  ],

  /* ───────── ADVANCED ─────────
     Dense technical prose, punctuation, parentheses, symbols.     */
  advanced: [
    {
      id: "a1",
      title: "Asynchronous JavaScript",
      text: "Asynchronous programming in JavaScript allows long-running operations to execute without blocking the main thread. Promises represent a value that may be available now, in the future, or never. The async and await keywords provide a cleaner syntax for working with promises, making asynchronous code easier to read and maintain.",
    },
    {
      id: "a2",
      title: "DOM Manipulation",
      text: "The Document Object Model represents the structure of a web page as a tree of nodes. JavaScript can manipulate the DOM to add, remove, or modify elements and their attributes dynamically. Event listeners allow developers to respond to user interactions such as clicks, keyboard input, and form submissions.",
    },
    {
      id: "a3",
      title: "Statistical Analysis",
      text: "Descriptive statistics summarise and describe the features of a dataset using measures such as mean, median, mode, and standard deviation. Inferential statistics go further by using sample data to make predictions about a larger population. Both disciplines are fundamental to data analytics and machine learning pipelines.",
    },
    {
      id: "a4",
      title: "Web Storage API",
      text: "The Web Storage API provides mechanisms for browsers to store key-value pairs locally. localStorage persists data even when the browser is closed, whereas sessionStorage clears its contents when the session ends. Both storage types hold data as strings, so complex objects must be serialised using JSON.stringify before saving.",
    },
    {
      id: "a5",
      title: "Closures and Higher-Order Functions",
      text: "A closure is formed when an inner function retains access to variables in its enclosing scope even after the outer function has returned. Higher-order functions accept other functions as arguments or return them as results. Together, closures and higher-order functions enable powerful patterns such as currying, memoisation, and partial application in JavaScript.",
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns a random passage for the given difficulty.
 * Falls back to intermediate if an unknown difficulty is supplied.
 * @param {string} difficulty - "beginner" | "intermediate" | "advanced"
 * @returns {{ id: string, title: string, text: string }}
 */
function getRandomPassage(difficulty = "intermediate") {
  const pool = PASSAGES[difficulty] || PASSAGES.intermediate;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Returns every passage in a difficulty tier.
 * @param {string} difficulty
 * @returns {Array}
 */
function getPassagesByDifficulty(difficulty) {
  return PASSAGES[difficulty] || [];
}

/** @type {import("../types.js").OxlintFragment} */
const promiseRules = {
  overrides: [
    {
      files: ["**/*.{js,jsx,ts,tsx,mts,cts}"],
      rules: {
        "promise/no-callback-in-promise": "error",
        "promise/no-multiple-resolved": "error",
        "promise/no-return-in-finally": "error",
        "promise/param-names": "error",
      },
    },
  ],
  plugins: ["promise"],
};

export default promiseRules;

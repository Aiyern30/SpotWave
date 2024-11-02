module.exports = {
  types: [
    { value: "feat", name: "feat:     A new feature" },
    { value: "fix", name: "fix:      A bug fix" },
    { value: "revert", name: "revert:   Revert to a commit" },
  ],
  messages: {
    type: "Select the type of change that you're committing:",
    customScope: "Enter a custom scope (optional):",
    subject:
      "Write a short, imperative tense description of the change (required):",
    body: "Provide a longer description of the change (optional). Use '|' to break new line:",
    breaking:
      "List any breaking changes (optional). Use '|' to break new line:",
    footer:
      "List any issues closed by this change (optional). E.g. 'fix #123', 'fix #456':",
    confirmCommit: "Are you sure you want to proceed with the commit above?",
  },
  allowCustomScopes: true,
  allowBreakingChanges: ["feat", "fix"],
};

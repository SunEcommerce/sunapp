# SunApp agent instructions

These instructions apply to this repository and all its subdirectories.

## Completion and commits

- After completing each user-requested change, run the checks appropriate to the change, review the diff, and create a Git commit with a clear message describing the change. This is standing user authorization; do not ask for commit permission again.
- Stage only changes belonging to the current task. Preserve unrelated existing changes and never include them in the commit. If a file mixes task changes with unrelated work, stage only the task's hunks.
- Do not create empty commits for explanation-only or read-only requests.
- Do not push, amend existing commits, or rewrite history unless the user explicitly requests it.
- If verification or committing is blocked, report the blocker and any checks that could not pass; do not claim completion or a successful commit.
- In the final response, summarize the change and verification, and include the commit hash and message when a commit was created.

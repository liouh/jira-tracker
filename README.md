JIRA Tracker
============

JIRA issue / label tracker in JavaScript using JIRA's REST API over JSONP

**Update:** JIRA has disabled their JSONP API for OnDemand instances ([thread here](https://answers.atlassian.com/questions/138618/jira-rest-api-response-suddenly-stopped-sending-jsonp-getting-invalid-label-syntax-error)).
<br/>
You can still use the code with your own JIRA installs, but the demo using atlassian.com will no longer work.

### Notes

* This links to Atlassian's JIRA instance, but you can configure this tool to point to your own JIRA install in jira.js
* API timeouts are handled gracefully, but you might need to tweak the timeout interval in jira.js

### Features

* Functions completely client-side
* Search by JIRA issue key or label
* Display all parent tasks, subtasks, and linked issues
* Display issue summary, assignee, and status
* Issues grouped by project
* Filter by status (hide Closed issues)
* Bookmarkable tracking URLs using location hashes
* Slick UI

### Library Dependencies

* jQuery

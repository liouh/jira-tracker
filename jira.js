$(function() {

	// customize these URLs to match your JIRA location
	var jiraUrl = 'https://jira.atlassian.com/';
	var jiraApiBaseUrl = jiraUrl + 'rest/api/2/';
	var jiraIssueBaseUrl = jiraUrl + 'browse/';
	
	// change these timeouts (milliseconds) to suit your JIRA instance
	var issueTimeout = 1000;
	var labelTimeout = 5000;
	
	var jiraCache, jiraProcessed, jiraBuffer, count, input, pending, error;
	var projectCache = {};
	
	function init() {
	
		reset();
		$('#input').focus();
		$('#form').on('submit', submitIssue);
		$('.refresh').on('click', submitIssue);
		$('#filter-closed').on('click', toggleFilter);
		
		if(location.hash) {
			var hash = location.hash.substring(1);
			$('#input').val(hash);
			submitIssue();
		}
	}
	
	function reset() {
	
		count = 0;
		pending = 0;
		jiraCache = {};
		jiraProcessed = {};
		jiraBuffer = [];
		error = false;
	}
	
	function toggleFilter(e) {
		var target = $(e.currentTarget);
		if(target.hasClass('on')) {
			target.removeClass('on').addClass('off');
		} else {
			target.removeClass('off').addClass('on');
		}
		
		processFilters();
	}
	
	function processFilters() {
		
		if($('#filter-closed').hasClass('off')) {
			$('.issue .Closed').closest('.issue').slideUp('fast');
		} else {
			$('.issue .Closed').closest('.issue').slideDown('fast');
		}
	}
	
	function submitIssue(e) {
	
		if(e) {
			e.preventDefault();
		}
		
		input = $('#input').val().trim();
		if(input.length == 0) {
			return;
		}
		
		location.replace('#' + input);
		
		reset();
		$('.count').text('searching...');
		$('.issues').empty();
		lookupIssue(input, true);
	}
	
	function lookupIssue(issue, first) {
		
		if(jiraCache[issue]) {
			return;
		}
		
		pending++;
		
		$.ajax({
			type: 'GET',
			url: jiraApiBaseUrl + 'issue/' + encodeURIComponent(issue),
			dataType: 'jsonp',
			jsonp: 'jsonp-callback',
			timeout: issueTimeout,
			success: function(data) {
				jiraCache[data.key] = data;
				processIssue(data.key);
				pending--;
				checkFinish();
			},
			error: function() {
				if(first) {
					lookupLabel(issue);
				} else {
					error = true;
					jiraCache[issue] = 'error';
					processIssue(issue);
				}
				pending--;
				if(!first) {
					checkFinish();
				}
			}
		});
	}
	
	function lookupLabel(label) {
	
		$.ajax({
			type: 'GET',
			url: jiraApiBaseUrl + 'search?jql=labels=' + encodeURIComponent(label),
			dataType: 'jsonp',
			jsonp: 'jsonp-callback',
			timeout: labelTimeout,
			success: function(data) {
				for(var i in data.issues) {
					lookupIssue(data.issues[i].key);
				}
				
				if(data.issues.length == 0) {
					$('.count').text('');
					$('.issues').html('<div>No results found</div>');
				}
			},
			error: function() {
				$('.count').text('');
				$('.issues').html('<div>Error communicating with JIRA<br/>Please make sure you are logged in <a href="' + jiraUrl + '" target="_blank">here</a></div>');
			}
		});
	}
	
	function processIssue(issue) {
		
		var issueData = jiraCache[issue];
		
		formatIssue(issue);
		
		if(issueData != 'error') {
		
			// get parent
			if(issueData.fields.parent) {
				lookupIssue(issueData.fields.parent.key);
			}
			
			// get subtasks
			for(var i in issueData.fields.subtasks) {
				lookupIssue(issueData.fields.subtasks[i].key);
			}
			
			// get related issues
			for(var i in issueData.fields.issuelinks) {
				if(issueData.fields.issuelinks[i].outwardIssue) {
					lookupIssue(issueData.fields.issuelinks[i].outwardIssue.key);
				} else if(issueData.fields.issuelinks[i].inwardIssue) {
					lookupIssue(issueData.fields.issuelinks[i].inwardIssue.key);
				}
			}
		}
	}
	
	function formatIssue(issue) {
		
		if(jiraProcessed[issue]) {
			return;
		}
		
		var issueData = jiraCache[issue];
		
		var html = '';
		var selected = '';
		if(input.toUpperCase() == issue.toUpperCase()) {
			selected = ' selected';
		}
		
		if(issueData == 'error') {
			
			html += '<a class="issue' + selected + '" href="' + jiraIssueBaseUrl + issue + '" target="_blank">';
				html += '<div class="issueKey">' + issue + '</div>';
				html += '<div class="issueDetails">';
				html += '<div class="issueSummary"></div>';
				html += 'Error fetching data from JIRA';
				html += '</div>';
			//	html += '<div class="issueStatus"><span class="status error">Error</span></div>';
			html += '</div>';
		
		} else {
			
			var status = issueData.fields.status.name;
			var statusClass = status.replace(/\s/gi, '');
		
			var assignee = 'Unassigned';
			if(issueData.fields.assignee != null) {
				assignee = issueData.fields.assignee.displayName;
			}
		
			var summary = $('<div/>').text(issueData.fields.summary).html();
		
			html += '<a class="issue' + selected + '" href="' + jiraIssueBaseUrl + issue + '" target="_blank">';
				html += '<div class="issueKey">' + issue + '</div>';
				html += '<div class="issueDetails">';
				html += '<div class="issueSummary">' + summary + '</div>';
				html += assignee;
				html += '</div>';
				html += '<div class="issueStatus"><span class="status ' + statusClass + '">' + status + '</span></div>';
			html += '</div>';
		}
		
		count++;
		if(!error) {
			$('.count').text(count + ' related issue(s) found');
		} else {
			$('.count').text(count + ' related issue(s) found -- incomplete due to JIRA timeouts');
		}
	
		jiraProcessed[issue] = true;
		jiraBuffer.push({key: issue, html: html});
	}
	
	function checkFinish() {
		
		if(pending) {
			return;
		}
		
		jiraBuffer.sort(function(a, b) {
			if(a.key < b.key) return -1;
			if(a.key > b.key) return 1;
			return 0;
		});
		
		$('.issues').empty();
		
		var group = '';
		for(var i in jiraBuffer) {
			var issue = jiraBuffer[i];
			var newGroup = issue.key.split('-')[0];
			if(newGroup != group) {
				group = newGroup;
				$('.issues').append('<div class="group"><span data-group="' + group + '">' + group + '</span></div>');
				displayProjectName(group);
			}
			$('.issues').append(issue.html);
		}
		
		processFilters();
	}
	
	function displayProjectName(name) {
	
		if(projectCache[name]) {
			$('span[data-group=' + name + ']').text(projectCache[name]);
			return;
		}
		
		$.ajax({
			type: 'GET',
			url: jiraApiBaseUrl + 'project/' + encodeURIComponent(name),
			dataType: 'jsonp',
			jsonp: 'jsonp-callback',
			success: function(data) {
				if(data.name) {
					projectCache[name] = data.name;
				} else {
					projectCache[name] = name;
				}
				displayProjectName(name);
			}
		});
	}
	
	init();

});

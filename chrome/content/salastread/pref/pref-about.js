function aboutInit()
{
	// Display version number from preferences
	var salrv = document.getElementById("salrVersion").value;
	document.getElementById("salrVersionText").setAttribute("value", "Version " + salrv);
	
	//get total # of seconds from prefs and give string a default value
	var timeSpent = document.getElementById("timeSpentOnForums").value;
	var tsstr = "none";
	
	if(timeSpent) {
		var res = new Array();
		
		//calculate # of days
		if(timeSpent >= 60 * 60 * 24 ) {
			var days = Math.floor(timeSpent / (60 * 60 * 24));
			timeSpent -= days * (60 * 60 * 24);
			
			if(days > 1) { 
				res.push(days + " days"); 
			} else { 
				res.push(days+" day");
			}
		}
		
		//calculate # of hours
		if(timeSpent >= 60 * 60 ) {
			var hours = Math.floor(timeSpent / (60 * 60));
			timeSpent -= hours * (60 * 60);
			
			if(hours > 1) {
				res.push(hours + " hours");
			} else {
				res.push(hours + " hour");
			}
		}
		
		//calculate # of minutes
		if(timeSpent >= 60 ) {
			var mins = Math.floor(timeSpent / 60);
			timeSpent -= mins * 60;
			
			if(mins > 1) {
				res.push(mins + " minutes");
			} else {
				res.push(mins + " minute");
			}
		}
		
		//calculate # of seconds
		if(timeSpent > 0) {
			if(timeSpent > 1) {
				res.push(timeSpent + " seconds");
			} else {
				res.push(timeSpent + " second");
			}
		}
		
		//mash it all together
		tsstr = res.join(", ");
	}
	
	//update the element
	document.getElementById("timespent").setAttribute("value", tsstr);
}

function openSALRThread()
{
	var tab = window.opener.gBrowser.addTab("http://forums.somethingawful.com/showthread.php?goto=post&postid=380530062");
	window.opener.gBrowser.selectedTab = tab; 
}
function openSALRProjectPage()
{
	var tab = window.opener.gBrowser.addTab("http://salr.bountysource.com");
	window.opener.gBrowser.selectedTab = tab; 
}
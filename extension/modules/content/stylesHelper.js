/**
 * @fileOverview Passes content style requests to chrome code.
 */

let Styles = exports.Styles = // eslint-disable-line no-unused-vars
{
	// This function should be removed if SALR ever allows more detailed color settings (backgrounds, font colors, etc)
	// It's (no longer?) used by the context menu.
	handleBodyClassing: function(doc)
	{
		var phmatch = doc.location.href.match( /\/([^\/]*)\.php/ );
		if (phmatch)
		{
			var addclass = " somethingawfulforum_"+phmatch[1]+"_php";
			var docbody = doc.body;
			if (docbody)
				docbody.className += addclass;
		}
	},

	// Return a string that contains thread list CSS instructions for our settings
	generateDynamicThreadListCSS: function(forumid)
	{
		return sendSyncMessage("salastread:GenDTLCSS", forumid);
	},

	// Return a string that contains ShowThread CSS instructions for our settings
	generateDynamicShowThreadCSS: function(forumid, threadid, singlePost)
	{
		return sendSyncMessage("salastread:GenDSTCSS", {forumid, threadid, singlePost});
	},
};

/**
 * @fileOverview Handles User Profile page
 */

let {PageUtils} = require("pageUtils");

let ProfileViewHandler = exports.ProfileViewHandler = 
{

	handleProfileView: function(doc)
	{
		var postSearchLink = PageUtils.selectSingleNode(doc, doc, "//A[contains(./text(),'find posts by user')]");
		if (!postSearchLink)
			return;
		var userid = postSearchLink.href.match(/userid=(\d+)/i)[1];
		var newLink = doc.createElement('a');
		newLink.href = "/banlist.php?userid=" + userid;
		newLink.title = "Show poster's ban/probation history.";
		newLink.textContent = "Rap Sheet";
		newLink.style.color = "#FFFFFF";
		postSearchLink.parentNode.appendChild(doc.createTextNode(" ("));
		postSearchLink.parentNode.appendChild(newLink);
		postSearchLink.parentNode.appendChild(doc.createTextNode(")"));
	},

};

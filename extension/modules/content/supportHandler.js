/**
 * @fileOverview Adds SALR's warning to support page.
 */

let SupportHandler = exports.SupportHandler = 
{
	handleSupport: function(doc)
	{
		if (doc.getElementById('content') === null)
		{
			// If there is no content div then abort since something's not right
			return;
		}
		if (doc.getElementById('content').getElementsByTagName('iframe')[0].src.search(/supportfaq/) === -1)
		{
			// The iframe isn't there so something's changed
			return;
		}
		var newImg = doc.createElement('img');
		newImg.src = "chrome://salastread/skin/techsupport.jpg";
		var newText = doc.createElement('p');
		newText.textContent = "Please disable SA Last Read before reporting a problem with the forums";
		newText.style.textAlign = "center";
		var emptyP = doc.createElement('p');
		var newLink = doc.createElement('a');
		emptyP.appendChild(newLink);
		emptyP.style.textAlign = "center";
		newLink.href = "http://forums.somethingawful.com/showthread.php?threadid=2571027&goto=lastpost";
		newLink.textContent = "Click here to report a problem with SA Last Read instead";
		var supportTable = doc.getElementById('content').getElementsByTagName('div')[1];
		supportTable.parentNode.replaceChild(newImg, supportTable);
		newImg.parentNode.appendChild(newText);
		newImg.parentNode.appendChild(emptyP);
	},

};

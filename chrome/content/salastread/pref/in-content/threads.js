var gSALRThreadsPane = {
	// Initialization
	init: function ()
	{
		// TODO: move this & pref code to this.showHideCustomVidSize();
		var cs=!document.getElementById('customvidsize').selected;
		document.getElementById('videoEmbedCustomWidthbox').disabled=cs;
		document.getElementById('videoEmbedCustomHeightbox').disabled=cs;
		var evec=!document.getElementById('enableVideoEmbedderCheckbox').checked;
		document.getElementById('videoEmbedderGetTitlesCheckbox').disabled=evec;
	}
};

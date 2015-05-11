var gSALRImagesPane = {
	// Initialization
	init: function ()
	{
		this.toggleTtIConvBoxes();
		this.toggleImageScaleBoxes();
	},
	// the below functions enable/disable UI elements based upon preference settings
	toggleTtIConvBoxes: function()
	{
		var cTtId = !document.getElementById("toggleTtICheckbox").checked;
		document.getElementById("dontTtINws").disabled = cTtId;
		document.getElementById("dontTtISpoilers").disabled = cTtId;
		document.getElementById("dontTtIRead").disabled = cTtId;
	},
	toggleImageScaleBoxes: function()
	{
		var sId = !document.getElementById("toggleImageScaleCheckbox").checked;
		document.getElementById("maxImgWidth").disabled = sId;
		document.getElementById("maxImgHeight").disabled = sId;
	}
};

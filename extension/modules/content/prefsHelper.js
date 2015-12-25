/**
 * @fileOverview Passes preference requests to chrome code.
 */

let Prefs = exports.Prefs =
{
	setPref: function(prefName, prefValue)
	{
		return sendSyncMessage("salastread:SetPref", {prefName, prefValue});
	},
	getPref: function(prefName)
	{
		return sendSyncMessage("salastread:GetPref", prefName);
	},
	resetPref: function(prefName)
	{
		return sendSyncMessage("salastread:ResetPref", prefName);
	}
};

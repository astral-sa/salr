/*

	Timer functions

*/

let {Prefs} = require("prefs");

let Timer = exports.Timer =
{
	_TimerValue: 0,
	_TimerValueSaveAt: 0,
	_TimerValueLoaded: false,
	_LastTimerPing: 0,

	init: function()
	{
		// Get Initial Timer Value
		try { this._TimerValue = Prefs.getPref("timeSpentOnForums"); } catch(xx) { }
		if ( ! this._TimerValue ) {
			this._TimerValue = 0;
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
		this._TimerValueLoaded = true;
	},

	PingTimer: function()
	{
		var nowtime = (new Date()).getTime();
		if ( this._LastTimerPing < nowtime-1000 ) {
			this._TimerValue++;
			this._LastTimerPing = nowtime;
			if ( this._TimerValue >= this._TimerValueSaveAt ) {
				this.SaveTimerValue();
			}
		}
	},

	// Saves the time spent on the forums so far and flags to save in another 60 seconds
	// @param: nothing
	// @return: nothing
	SaveTimerValue: function()
	{
		if (this._TimerValueLoaded)
		{
			Prefs.setPref("timeSpentOnForums", this._TimerValue);
		}
		this._TimerValueSaveAt = this._TimerValue + 60;
	},

};
Timer.init();
